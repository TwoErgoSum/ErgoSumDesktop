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

## OAuth Flow

When users click "Sign in with Google":
1. OAuth opens in the system's default web browser
2. User completes authentication in browser
3. Browser redirects to `ergosum://auth/callback?token=...`
4. Electron app captures the deep link and completes sign-in
5. User is automatically logged in to the desktop app

No popup windows or embedded browsers - uses the system's secure browser environment.

## Development

```bash
# Install dependencies
cd electron
bun install

# Run in development mode
bun start
```

## Building

```bash
# Build for current platform
bun run package

# Build for specific platform
bun run package:mac
bun run package:win
bun run package:linux
```

Built apps will be in `electron/dist/` directory.

## Auto-Update Setup

### 1. Create GitHub Repository
Create a new GitHub repository for desktop releases (e.g., `ergosum-desktop`)

### 2. Update package.json
Replace `YOUR_GITHUB_USERNAME` in `electron/package.json`:
```json
"publish": {
  "provider": "github",
  "owner": "YOUR_GITHUB_USERNAME",
  "repo": "ergosum-desktop"
}
```

### 3. Generate GitHub Token
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `repo` scope
3. Set environment variable: `export GH_TOKEN=your_token_here`

### 4. Release Process

#### First Time:
```bash
cd electron
# Update version in package.json (e.g., 1.0.0 → 1.0.1)
bun run publish
```

This will:
- Build the app for all platforms
- Create a GitHub Release
- Upload installers (.dmg, .exe, .AppImage, etc.)
- Generate auto-update files (latest-mac.yml, latest.yml)

#### Subsequent Updates:
1. Update version in `electron/package.json`
2. Run `bun run publish`
3. Users will automatically get notified and download the update

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
