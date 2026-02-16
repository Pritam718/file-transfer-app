import * as dotenv from 'dotenv';
import { app, BrowserWindow } from 'electron';
import path from 'path';
import { cleanupIPCHandlers, setupIPCHandlers } from './controllers/ipc.controller';
import { APP_CONFIG } from './utils/config';
import { logger } from './utils/logger';

dotenv.config();

// Allow multiple instances in development for testing
if (process.env.NODE_ENV === 'development') {
  // Use unique user data directory for each instance to avoid conflicts
  const instanceName = process.env.INSTANCE_NAME || 'default';
  const userDataPath = path.join(app.getPath('userData'), `dev-${instanceName}`);
  app.setPath('userData', userDataPath);
  logger.info(`Running as instance: ${instanceName}`);
}

// Enable hot reload in development
if (process.env.NODE_ENV === 'development') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const electronReload = require('electron-reload');
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const electronPath = require(path.resolve(__dirname, '../../node_modules/electron'));
    electronReload(__dirname, {
      electron: electronPath,
      hardResetMethod: 'exit',
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100,
      },
      ignored: /node_modules|[/\\]\./,
    });
    logger.info('Hot reload enabled');
  } catch (error) {
    logger.warn('electron-reload not available');
  }
}

let splashWindow: BrowserWindow | null = null;

function createSplashWindow() {
  logger.info('Creating splash window');

  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar', 'src', 'public', 'assets', 'icon.png')
    : path.join(__dirname, '..', '..', 'src', 'public', 'assets', 'icon.png');

  splashWindow = new BrowserWindow({
    width: APP_CONFIG.window.width,
    height: APP_CONFIG.window.height,
    minWidth: APP_CONFIG.window.minWidth,
    minHeight: APP_CONFIG.window.minHeight,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    center: true,
    resizable: false,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const loadingPath = path.join(__dirname, '..', '..', 'src', 'renderer', 'pages', 'loading.html');

  splashWindow
    .loadFile(loadingPath)
    .then(() => logger.info('Splash screen loaded'))
    .catch((error) => logger.error('Failed to load splash screen', error));

  return splashWindow;
}

function createWindow() {
  logger.info('Creating main window');

  // Icon path - works for both development and production
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar', 'src', 'public', 'assets', 'icon.png')
    : path.join(__dirname, '..', '..', 'src', 'public', 'assets', 'icon.png');

  // Preload script path
  const preloadPath = path.join(__dirname, 'router', 'preload.js');

  const win = new BrowserWindow({
    width: APP_CONFIG.window.width,
    height: APP_CONFIG.window.height,
    minWidth: APP_CONFIG.window.minWidth,
    minHeight: APP_CONFIG.window.minHeight,
    title: APP_CONFIG.name,
    icon: iconPath,
    center: true,
    resizable: true,
    minimizable: true,
    maximizable: true,
    autoHideMenuBar: true,
    show: false, // Hide initially until content is loaded
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
    },
  });

  // Setup IPC handlers
  setupIPCHandlers(win);

  // HTML files stay in src directory, not copied to dist
  const htmlPath = path.join(__dirname, '..', '..', 'src', 'renderer', 'pages', 'index.html');

  win
    .loadFile(htmlPath, { hash: 'main' })
    .then(() => {
      logger.info('Application loaded successfully');

      // Close splash screen and show main window
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
      }

      win.show();
      win.focus();
    })
    .catch((error) => logger.error('Failed to load application', error));

  win.setTitle(APP_CONFIG.name);

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    win.webContents.openDevTools();
  }

  return win;
}

// Show splash screen before app is ready
app.on('ready', () => {
  createSplashWindow();
});

void app.whenReady().then(() => {
  logger.info(`Starting ${APP_CONFIG.name} v${APP_CONFIG.version}`);
  app.commandLine.appendSwitch('disable-features', 'UseOzonePlatform');

  // Small delay to ensure splash is visible
  setTimeout(() => {
    createWindow();
  }, 500);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    logger.info('Application closing');

    // Clean up splash window if it still exists
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }

    cleanupIPCHandlers();
    app.quit();
  }
});

app.on('before-quit', () => {
  // Clean up splash window if it still exists
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
    splashWindow = null;
  }

  cleanupIPCHandlers();
});
