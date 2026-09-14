export interface ReadingSample {
  id: string;
  title: string;
  topic: string;
  difficulty: "Easy" | "Medium" | "Advanced";
  text: string;
}

export const READING_SAMPLES: ReadingSample[] = [
  {
    id: "norman-lewis-excerpt",
    title: "Norman Lewis on Visual Fixations",
    topic: "Speed Reading Technique",
    difficulty: "Medium",
    text: `Why do you read slowly? The answer lies in your eye habits. When you read, your eyes do not move in a smooth, continuous sweep across the printed line. Instead, they move in a series of quick, jerky jumps. Between these jumps, your eyes come to a dead stop. These pauses are called fixations. It is during these fixations, and only during them, that you actually see the words and take in their meaning. 

    The slow reader is a word-by-word reader. His eyes stop on almost every single word. If a line has ten words, his eyes make ten separate stops or fixations. By training your eyes to expand their span of recognition, you can learn to see and digest chunks of three, four, or even five words in a single, split-second pause. 

    To train yourself in single-fixation reading, you must practice reading down narrow vertical columns. When words are clustered in narrow vertical rows containing only two or three words, your eyes can snap down the center of the column. This eliminates horizontal scanning entirely. Your gaze moves strictly vertically, and your reading speed will triple while your comprehension improves.`
  },
  {
    id: "neuroscience-of-reading",
    title: "The Neurobiology of Reading",
    topic: "Neuroscience",
    difficulty: "Advanced",
    text: `Reading is one of the most complex cognitive tasks the human brain performs, yet it is a relatively recent cultural invention. Because of this, has no evolutionary dedicated neural circuit. Instead, the brain relies on a mechanism called neuronal recycling, wherein cortical regions originally evolved for other visual purposes are repurposed to recognize written characters.

    The primary gateway is located in the left fusiform gyrus, often designated as the Visual Word Form Area (VWFA). This critical structural hub operates as the brain's internal optical scanner, translating arbitrary letter strings into abstract orthographic representations. It then fires signals into a dual-pathway system: the dorsal phonological pathway, which meticulously decodes sounds (grapheme-to-phoneme mapping), and the ventral semantic pathway, which links words directly to lexical meaning.

    Efficient speed readers bypass the slow phonological route, routing orthographic visual signals directly through the ventral semantic pathway. By fixating on semantic clusters rather than sounding out individual letters, comprehension operates near-instantaneously.`
  },
  {
    id: "focus-and-plasticity",
    title: "Deep Work and Cognitive Focus",
    topic: "Productivity & Brain States",
    difficulty: "Easy",
    text: `In the modern digital age, our depth of attention is under constant Siege. Continuous notifications, infinite scrolling, and rapid micro-stimuli have trained our brains to scan surfaces and flutter away. This fragmented attention span has eroded our capacity for deep reading, the quiet, immersive state of contemplation where complex ideas are analyzed, parsed, and understood.

    Fortunately, the human brain exhibits lifelong neuroplasticity. Just as it can be trained to fragment, it can also be trained to focus. When you engage in deliberate practice—such as speed reading with narrow visual boundaries—you force the prefrontal cortex to construct active inhibitory barriers against distractions. 

    By maintaining your eyes on a narrow column and moving systematically down the page, you actively build deep attention stamina. This focus training doesn't just make you a swifter reader; it rebuilds your overall capacity for deep work in all cerebral aspects of your life.`
  }
];
