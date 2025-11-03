const { app, BrowserWindow, shell, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let mainWindow;

// Configure auto-updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Set up deep linking for OAuth callback
const PROTOCOL = 'ergosum';

// Register protocol handler for OAuth
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

// Handle single instance lock for OAuth callbacks
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // Handle OAuth callback when app is already running
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      // Handle deep link from second instance
      const url = commandLine.find(arg => arg.startsWith(`${PROTOCOL}://`));
      if (url) {
        handleOAuthCallback(url);
      }
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'ErgoSum',
    icon: path.join(__dirname, '../public/icon-512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    backgroundColor: '#0a0a0a',
    show: false,
    autoHideMenuBar: true
  });

  // Load the production app
  mainWindow.loadURL('https://ergosum.cc');

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Inject custom scrollbar CSS after page loads
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.insertCSS(`
      /* Custom scrollbar */
      html, body {
        scrollbar-width: thin;
        scrollbar-color: rgba(128, 128, 128, 0.3) transparent;
      }

      html::-webkit-scrollbar,
      body::-webkit-scrollbar,
      *::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }

      html::-webkit-scrollbar-track,
      body::-webkit-scrollbar-track,
      *::-webkit-scrollbar-track {
        background: transparent;
      }

      html::-webkit-scrollbar-thumb,
      body::-webkit-scrollbar-thumb,
      *::-webkit-scrollbar-thumb {
        background: rgba(128, 128, 128, 0.3);
        border-radius: 5px;
        border: 2px solid transparent;
        background-clip: padding-box;
      }

      html::-webkit-scrollbar-thumb:hover,
      body::-webkit-scrollbar-thumb:hover,
      *::-webkit-scrollbar-thumb:hover {
        background: rgba(128, 128, 128, 0.5);
        border: 2px solid transparent;
        background-clip: padding-box;
      }
    `);
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Check for OAuth URLs first
    if (url.includes('/api/auth/google')) {
      // Add electron=true parameter to indicate this is from Electron
      const separator = url.includes('?') ? '&' : '?';
      shell.openExternal(`${url}${separator}electron=true`);
      return { action: 'deny' };
    }

    // Allow navigation within the app
    if (url.startsWith('https://ergosum.cc') || url.startsWith('https://ergosum-prod.fly.dev')) {
      return { action: 'allow' };
    }

    // Open other external links in default browser
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle navigation to external sites
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Check for OAuth URLs first (before allowing ergosum.cc)
    if (url.includes('/api/auth/google')) {
      event.preventDefault();
      // Add electron=true parameter to indicate this is from Electron
      const separator = url.includes('?') ? '&' : '?';
      shell.openExternal(`${url}${separator}electron=true`);
      return;
    }

    // Allow navigation within the app
    if (url.startsWith('https://ergosum.cc') || url.startsWith('https://ergosum-prod.fly.dev')) {
      return;
    }

    // Block and open other external URLs in browser
    event.preventDefault();
    shell.openExternal(url);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handler for opening external URLs
ipcMain.on('open-external', (event, url) => {
  // Make URL absolute if relative
  if (url.startsWith('/')) {
    url = `https://ergosum.cc${url}`;
  }
  shell.openExternal(url);
});

// Handle OAuth callback URL
function handleOAuthCallback(url) {
  if (!mainWindow) return;

  // Extract token from URL (format: ergosum://auth/callback?token=...)
  const urlObj = new URL(url);
  const token = urlObj.searchParams.get('token');

  if (token) {
    // Navigate to the callback page with the token
    mainWindow.loadURL(`https://ergosum.cc/auth/callback?token=${token}`);
  } else {
    mainWindow.loadURL('https://ergosum.cc/login?error=oauth_failed');
  }
}

// Handle deep links on macOS
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (url.startsWith(`${PROTOCOL}://`)) {
    handleOAuthCallback(url);
  }
});

// Handle deep links on Windows/Linux (via command line arguments)
if (process.platform !== 'darwin') {
  const url = process.argv.find(arg => arg.startsWith(`${PROTOCOL}://`));
  if (url) {
    app.on('ready', () => {
      setTimeout(() => handleOAuthCallback(url), 1000);
    });
  }
}

app.whenReady().then(() => {
  createWindow();

  // Check for updates after app is ready
  checkForUpdates();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Auto-updater functions
function checkForUpdates() {
  autoUpdater.checkForUpdates();
}

// Auto-updater event handlers
autoUpdater.on('update-available', (info) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-available', info);
  }
  // Auto-download the update
  autoUpdater.downloadUpdate();
});

autoUpdater.on('update-not-available', () => {
  console.log('App is up to date');
});

autoUpdater.on('download-progress', (progress) => {
  if (mainWindow) {
    mainWindow.webContents.send('download-progress', progress);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', info);
  }
  // Will install on app quit
});

autoUpdater.on('error', (error) => {
  console.error('Update error:', error);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});
