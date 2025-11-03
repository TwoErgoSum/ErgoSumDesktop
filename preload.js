const { contextBridge, ipcRenderer } = require('electron');

// Expose API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  openExternal: (url) => ipcRenderer.send('open-external', url),
  isElectron: true
});

// Inject script to intercept OAuth navigation
window.addEventListener('DOMContentLoaded', () => {
  // Inject a script tag to run in the main world context
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      // Mark as Electron app
      window.__IS_ELECTRON__ = true;

      // Intercept window.location.href assignments
      const locationDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
      const originalLocation = window.location;

      // Store original href descriptor
      const hrefDescriptor = Object.getOwnPropertyDescriptor(Location.prototype, 'href');

      // Override href setter
      Object.defineProperty(Location.prototype, 'href', {
        set: function(value) {
          if (typeof value === 'string' && value.includes('/api/auth/google')) {
            console.log('Intercepted OAuth navigation:', value);
            if (window.electronAPI) {
              window.electronAPI.openExternal(value);
            }
            // Prevent navigation
            return;
          }
          // Call original setter
          hrefDescriptor.set.call(this, value);
        },
        get: hrefDescriptor.get
      });
    })();
  `;
  document.head.prepend(script);
});
