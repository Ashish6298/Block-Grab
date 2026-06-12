# AdShield Plus & HD Video/MP3 Downloader

A professional browser extension built using Manifest V3 that provides a double utility module: an **Ad Blocker** (utilizing high-performance `declarativeNetRequest` rules and cosmetic DOM filtering) and a **Video Downloader** (which detects active video elements and coordinates with a Node.js backend to extract and convert MP3 audios or download videos up to 4K quality).

---

## Repository Structure

```text
├── backend/
│   ├── downloads/               # Directory where finalized downloads are stored
│   ├── temp/                    # Directory for temporary streaming pieces
│   ├── src/
│   │   ├── controllers/         # Express controllers (download.controller.js)
│   │   ├── middleware/          # Error handling (errorHandler.js)
│   │   ├── routes/              # Express Router mappings (download.routes.js)
│   │   ├── services/            # Services (videoExtractor, audioConverter, fileManager)
│   │   └── server.js            # Node/Express application entry
│   ├── .env                     # Server environment settings
│   └── package.json
│
├── extension/
│   ├── src/
│   │   ├── adblock/             # Rules JSON & Cosmetic CSS filters
│   │   ├── assets/              # Icons and images
│   │   ├── background/          # Background worker Service Worker
│   │   ├── content/             # Page scraper and floating button scripts
│   │   ├── popup/               # Popup page React + HTML
│   │   ├── options/             # Options page React + HTML
│   │   ├── services/            # Storage, messaging, and API services
│   │   └── styles/              # Global styling variables & typography
│   ├── manifest.json            # MV3 Chrome/Brave Manifest
│   ├── vite.config.js           # Multi-page compiler settings
│   ├── copy-assets.js           # Asset bundling script
│   └── package.json
```

---

## Installation & Setup

### 1. Backend Server Setup
To configure the Express backend server:
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Install the Node.js dependencies:
   ```bash
   npm install
   ```
3. Start the backend in development mode:
   ```bash
   npm run dev
   ```
   The backend server will launch at `http://localhost:5000`.

### 2. Chrome Extension Setup
To compile the Vite/React extension:
1. Navigate to the `extension/` directory:
   ```bash
   cd extension
   ```
2. Install the development and runtime packages:
   ```bash
   npm install
   ```
3. Generate the required icon assets (runs the base64 builder script):
   ```bash
   node generate-icons.js
   ```
4. Build the extension:
   ```bash
   npm run build
   ```
   This compiles all React components and packages resources into the static `dist/` directory.

### 3. Load Extension in Browser (Chrome/Brave/Edge)
1. Open your browser and navigate to the extensions management console: `chrome://extensions`.
2. Enable **Developer mode** (toggle in top-right corner).
3. Click **Load unpacked** in the top-left.
4. Select the `extension/dist` folder from this directory.

---

## Verifying & Testing

### 1. Testing the Ad Blocker
- Enable the AdShield toggle in the Popup.
- Visit any web page containing advertisements (e.g. ad-heavy websites or standard layout tests).
- Observe that requests containing network block rules (like `doubleclick.net`) are intercepted, and cosmetic selectors (like `.adsbygoogle`) are visually hidden.
- The popup interface will track the total blocked count.

### 2. Testing the Video Downloader
- Ensure the backend server is running (`npm run dev` in the backend folder).
- Play a video on a web page or open the popup, click **Video Downloader**, and click **Load Demo Test Video**.
- A draggable download button `📥` will float in the page's bottom-right corner.
- Click either the floating page icon or the popup option, select your desired resolution or audio MP3 format, and click **Start Download**.
- The progress bar will track downloading and merging states, culminating in a `Save File to Disk` prompt to download the processed file.
