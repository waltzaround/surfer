# Surfer Chrome Extension

A Chrome extension that adds a fun video overlay to web pages. Watch Subway Surfers or Minecraft Parkour while browsing the web!

## Project Structure

- `src/`: Source code
  - `background.js`: Service worker for background tasks
  - `content.js`: Content script for video overlay functionality
  - `popup.js`: Script for the popup interface
- `public/`: Static assets
  - `popup.html`: Extension popup
  - `icons/`: Extension icons
- `dist/`: Build output (generated)

## Development

This extension is built using Manifest V3, the latest extension platform from Chrome.

### Setup

1. Clone this repository
2. Navigate to `chrome://extensions/` in Chrome
3. Enable "Developer mode"
4. Click "Load unpacked" and select the project directory

## Features

- **Video Overlay**: Adds a YouTube video overlay to any web page
- **Multiple Video Options**: Choose between Subway Surfers or Minecraft Parkour videos
- **Automatic Positioning**: Video moves to the opposite side of the screen when hovered over
- **Non-intrusive**: Video doesn't interfere with page content or interactions
- **Persistent State**: Extension remembers your video selection between sessions

## Publishing to Chrome Web Store

To publish this extension to the Chrome Web Store:

1. Create a ZIP file of the entire project directory
2. Create a developer account at the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
3. Pay the one-time developer registration fee ($5 USD)
4. Create a new item and upload the ZIP file
5. Fill out the store listing information:
   - Detailed description
   - At least 2 screenshots (1280x800 or 640x400)
   - Store icon (128x128)
   - Promotional images (optional)
6. Submit for review

## Security

This extension follows best practices for Chrome extension security:
- Uses Manifest V3
- Implements strict Content Security Policy
- Requests minimal permissions
- Properly sanitizes user input
- Uses storage.local for data persistence

## License

MIT
