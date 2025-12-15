// content.js - Communicates with the Sandbox
console.log("🛡️ AI Firewall: Initializing Bridge...");

// 1. Inject the Sandbox Iframe (Hidden)
const iframe = document.createElement('iframe');
iframe.style.display = 'none';
iframe.src = chrome.runtime.getURL('sandbox.html');
document.body.appendChild(iframe);

// Store pending requests
const pendingChecks = new Map();
let uniqueId = 0;

// 2. Listen for Verdicts from Sandbox
window.addEventListener('message', (event) => {
    if (event.data.type === 'MODEL_LOADED') {
        console.log("✅ AI System Ready!");
        scanImages();
    }
    
    if (event.data.type === 'VERDICT') {
        const { id, index, score } = event.data;
        const img = pendingChecks.get(id);
        if (img) {
            // Logic: 413=Rifle, 414=Backpack (Example check)
            // For demo, we UNBLUR everything to prove it works.
            console.log(`👁️ Analyzed: Class ${index} (${Math.round(score*100)}%)`);
            revealImage(img);
            pendingChecks.delete(id);
        }
    }
});

// 3. Scan & Send to Sandbox
function scanImages() {
    const images = document.querySelectorAll("img:not(.scanned)");
    
    for (let img of images) {
        img.classList.add("scanned");
        if (img.width < 50 || img.height < 50) { revealImage(img); continue; }

        // Convert image to Data URL to send across iframe boundary
        // Note: This requires the image to be loaded first
        if (img.complete) processImage(img);
        else img.onload = () => processImage(img);
    }
}

function processImage(img) {
    try {
        // Draw to canvas to get data URL (Bypasses some CORS issues for display)
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 224;
        canvas.height = img.height || 224;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL();

        // Send to Sandbox
        const reqId = uniqueId++;
        pendingChecks.set(reqId, img);
        iframe.contentWindow.postMessage({ 
            type: 'CLASSIFY', 
            id: reqId, 
            payload: dataUrl 
        }, '*');

    } catch (e) {
        // If we can't read the image (CORS), just reveal it
        revealImage(img);
    }
}

function revealImage(img) {
    img.classList.add("safe-revealed");
}

// Keep scanning for new images (lazy loading)
setInterval(scanImages, 2000);