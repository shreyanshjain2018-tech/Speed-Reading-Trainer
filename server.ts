import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set payload size limits for parsing larger texts if needed
  app.use(express.json({ limit: "10mb" }));

  // API Endpoints
  app.post("/api/generate-quiz", async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { text } = req.body;
      if (!text || text.trim().length === 0) {
        return res.status(400).json({ error: "Text content is required." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "Gemini API key is not configured under Settings > Secrets. Please add GEMINI_API_KEY to proceed.",
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const systemInstruction = 
        "You are an expert reading comprehension tutor. Create a high-quality selection of exactly 5 multiple choice questions based on the provided text. The quiz must test deep understanding, recall of critical information, and logical inferences, rather than trivial details. Guard against option ambiguity—each question must have exactly one logically irrefutable correct answer and three plausible-sounding but clearly incorrect distractors. For each question, provide a solid explanation of why the correct answer is correct, referencing facts from the text.";

      const userPrompt = `Generate a 5-question multiple choice quiz testing comprehension of the following reading text.\n\nText:\n"""\n${text}\n"""`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              quiz: {
                type: Type.ARRAY,
                description: "Array of exactly 5 multiple choice questions.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: {
                      type: Type.STRING,
                      description: "The core question being asked, phrased clearly.",
                    },
                    options: {
                      type: Type.ARRAY,
                      description: "Four distinct multiple choice options. Each option must be a string.",
                      items: { type: Type.STRING },
                    },
                    correctIndex: {
                      type: Type.INTEGER,
                      description: "The 0-based index of the correct option inside the options array (must be 0, 1, 2, or 3).",
                    },
                    explanation: {
                      type: Type.STRING,
                      description: "Detailed explanation of why the answer at correctIndex is the only correct answer based on the text.",
                    },
                  },
                  required: ["question", "options", "correctIndex", "explanation"],
                },
              },
            },
            required: ["quiz"],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No response text received from Gemini API.");
      }

      // Parse and deliver JSON
      const quizData = JSON.parse(responseText.trim());
      res.json(quizData);
    } catch (error: any) {
      console.error("Error generating quiz:", error);
      res.status(500).json({
        error: "Failed to generate comprehension quiz: " + (error?.message || error),
      });
    }
  });

  // Serve static application or run Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
