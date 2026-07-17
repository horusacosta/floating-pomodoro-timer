const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');

const WINDOW_WIDTH = 380;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: 560,
    resizable: false,
    frame: false,
    transparent: true,
    hasShadow: false,
    thickFrame: false,
    alwaysOnTop: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.on('toggle-pin', (event, pinned) => {
  if (mainWindow) mainWindow.setAlwaysOnTop(pinned, 'floating');
});

ipcMain.on('resize-window', (event, height) => {
  if (!mainWindow) return;
  mainWindow.setSize(WINDOW_WIDTH, Math.max(1, Math.round(height)));
});

ipcMain.on('show-context-menu', (event) => {
  const menu = Menu.buildFromTemplate([
    { label: 'Reload', click: () => mainWindow && mainWindow.reload() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  menu.popup({ window: mainWindow });
});
