# 🛡️ Zero-Trust AI Firewall

**A Privacy-First Chrome Extension for Real-Time Content Filtering**

## Project Overview
The **Zero-Trust AI Firewall** is a browser extension that automatically detects and blocks inappropriate or sensitive images (e.g., weapons, gore, NSFW) on any webpage. 

Unlike traditional filters that rely on cloud APIs, this extension runs a **Deep Learning model (MobileNet V1)** entirely inside the user's browser. This ensures **100% Privacy**—no browsing history or image data ever leaves the user's device.

## Key Features
* ** Zero Data Leakage:** All AI inference happens locally using TensorFlow.js.
* ** Real-Time Protection:** Images are blurred instantly upon loading (`document_start`) to prevent "flashing" of bad content.
* ** Edge AI:** Uses a quantized MobileNet model sharded into 55 pieces for efficient loading.
* ** Sandbox Architecture:** Bypasses Chrome's strict Manifest V3 Security Policy (CSP) by running the AI engine in an isolated iframe sandbox.

## Technical Stack
* **Frontend:** HTML5, CSS3, JavaScript (ES6+).
* **AI Engine:** TensorFlow.js (tfjs-core, tfjs-converter).
* **Model:** MobileNet V1 (Quantized 0.25).
* **Platform:** Google Chrome Extension (Manifest V3).
* **Architecture:** Content Script ↔ Iframe Bridge (PostMessage API).

## System Architecture
Because Chrome Manifest V3 blocks `eval()` and `new Function()` (which TensorFlow.js requires for optimization), this project uses a unique **Sandboxed Bridge Architecture**:

1.  **The Interceptor (`content.js`):** Runs on the webpage. It blurs images via CSS and extracts pixel data using an HTML Canvas.
2.  **The Bridge:** Sends the image data to a hidden `iframe` (`sandbox.html`) using the `window.postMessage` API.
3.  **The Safe Room (`sandbox.js`):** Lives inside the iframe where security rules are relaxed. It runs the AI inference and returns a verdict (Safe/Unsafe).
4.  **The Enforcer:** `content.js` receives the verdict. If Safe, it removes the blur. If Unsafe, it keeps the blur and adds a warning border.

## Installation & Setup

### 1. Prerequisites
* Google Chrome Browser.
* Python 3.x (Optional, for downloading model shards).

### 2. Setup
1.  Clone this repository:
    ```bash
    git clone [https://github.com/YOUR_USERNAME/AI-Firewall.git](https://github.com/YOUR_USERNAME/AI-Firewall.git)
    cd AI-Firewall
    ```
2.  **Download the AI Brain:**
    Chrome requires all model files to be local. Run the included script to download the 55 model shards:
    ```bash
    python get_shards.py
    ```
    *This will populate your folder with `group1-shard1of1.bin` ... `group55-shard1of1.bin`.*

### 3. Install in Chrome
1.  Open Chrome and navigate to `chrome://extensions`.
2.  Toggle **Developer Mode** (top right).
3.  Click **Load Unpacked**.
4.  Select the `AI-Firewall` folder.

## How to Test
1.  Open a new tab and go to **Google Images** or **Yahoo Images**.
2.  Search for a common object (e.g., "Coffee").
3.  **Observe:**
    * Images load **Blurred** initially.
    * Open the Console (F12). You will see `🛡️ AI Firewall: Initializing...`.
    * After 1-2 seconds, you will see `🧠 AI Brain is active!`.
    * Images will automatically **Unblur** as they are classified as safe.

##  Troubleshooting
* **"ERR_FILE_NOT_FOUND"**: You missed running `python get_shards.py`. The AI needs all 55 weight files to work.
* **"Unsafe-eval" Error**: Ensure you are using the Sandboxed version (v2.0) included in this repo, not the direct injection method.
* **Red Console Errors (CORS)**: You may see `ERR_BLOCKED_BY_RESPONSE`. This is normal. If a website blocks us from reading an image's pixels, the firewall defaults to "Fail Open" (unblurs it) to preserve user experience.

## 🔮 Future Roadmap
* **Custom Blocking:** Allow users to type words (e.g., "Spider") to block specific categories.
* **NSFW Model:** Switch from MobileNet (General objects) to a specialized NSFW detection model.
* **Performance:** Implement `OffscreenCanvas` for faster image processing on background threads.

---
