# ErgoSum Desktop

Electron wrapper for the ErgoSum web application with auto-update support.

## Features

- Native desktop application wrapping ergosum.cc
- **Automatic updates** via GitHub Releases
- **Native OAuth flow** - Google sign-in opens in browser, returns to app
- Custom scrollbar styling injected from web app
- Native window controls and system integration
- External links open in default browser
- Cross-platform: macOS, Windows, Linux

### Auto-Update Behavior

- **Check on startup**: App checks for updates when launched
- **Download in background**: Updates download automatically
- **Install on quit**: Updates install when user closes the app
- **No interruption**: Users continue working while update downloads

## Distribution

The built applications can be distributed as:
- **macOS**: .dmg installer or .zip
- **Windows**: NSIS installer or portable .exe
- **Linux**: AppImage or .deb package

Users download the initial installer from GitHub Releases, then get automatic updates.

## Architecture

This is a web wrapper that:
1. Creates a native window
2. Loads the production ErgoSum app from https://ergosum.cc
3. Registers `ergosum://` protocol for OAuth deep linking
4. Injects custom scrollbar CSS globally
5. Handles external links by opening them in the default browser
6. Checks for and installs app updates automatically
7. Provides native desktop integration (dock/taskbar, notifications, etc.)

**Important**: All application logic and data remains on the web platform. When you update your web app, users see changes immediately. Only rebuild the Electron app when changing desktop-specific features (scrollbar, window config, auto-update, OAuth protocol, etc.).

### Protocol Handler

The app registers the `ergosum://` protocol with the OS. This allows the OAuth callback URL to be intercepted by the Electron app instead of opening a browser tab. The server automatically detects Electron requests via the User-Agent header and redirects to the deep link protocol.
