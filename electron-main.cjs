const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');

function getDistPath() {
  const directPath = path.join(__dirname, 'dist');
  if (fs.existsSync(directPath)) return directPath;
  const appPath = path.join(app.getAppPath(), 'dist');
  if (fs.existsSync(appPath)) return appPath;
  return directPath;
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 850,
    minWidth: 800,
    minHeight: 600,
    title: 'Speed Reading Fixation Trainer',
    backgroundColor: '#111317',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
    autoHideMenuBar: true,
  });

  const distDir = getDistPath();
  const indexHtmlExists = fs.existsSync(path.join(distDir, 'index.html'));

  if (indexHtmlExists) {
    win.loadFile(path.join(distDir, 'index.html'));
  } else {
    // Development fallback if dist hasn't been built yet
    win.loadURL('http://localhost:3000');
  }

  // Toggle DevTools with F12
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      win.webContents.toggleDevTools();
    }
  });

  // Open external links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(async () => {
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
