const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const store = require('./lib/store');
const { startServer } = require('./server');

const WINDOW_WIDTH = 380;

let mainWindow;
let dashboardWindow = null;
let dashboardPort = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: 560,
    resizable: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
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

function createDashboardWindow() {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.focus();
    return;
  }
  dashboardWindow = new BrowserWindow({
    width: 900,
    height: 700,
    resizable: true,
    frame: true,
    transparent: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  dashboardWindow.loadURL(`http://localhost:${dashboardPort}/`);
  dashboardWindow.on('closed', () => {
    dashboardWindow = null;
  });
}

app.whenReady().then(async () => {
  store.init(app.getPath('userData'));
  const { port } = await startServer();
  dashboardPort = port;
  console.log(`[dashboard] serving on http://localhost:${port}`);
  createWindow();
});

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

ipcMain.handle('session:log', async (event, payload) => {
  try {
    return { ok: true, session: store.appendSession(payload) };
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  }
});

ipcMain.handle('dashboard:open', async () => {
  createDashboardWindow();
  return { ok: true, port: dashboardPort };
});
