// content.js - Communicates with the Sandbox
console.log("🛡️ AI Firewall: Initializing Bridge...");

// --- 1. Setup Logic (Wait for Body) ---
function init() {
    if (!document.body) {
        // If body doesn't exist yet, wait 10ms and try again
        setTimeout(init, 10);
        return;
    }

    // Inject the Sandbox Iframe (Hidden)
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = chrome.runtime.getURL('sandbox.html');
    iframe.id = "ai-firewall-sandbox"; // Give it an ID to find it later if needed
    document.body.appendChild(iframe);
    
    // Start the scanner once the bridge is built
    scanImages();
}

// Start the init process immediately
init();

// --- 2. Communication Logic ---
const pendingChecks = new Map();
let uniqueId = 0;

// Listen for Verdicts from Sandbox
window.addEventListener('message', (event) => {
    // Security check: ensure message is from our extension
    // (In a real deployment we would check event.origin, but for local iframe '*' is okay)

    if (event.data.type === 'MODEL_LOADED') {
        console.log("✅ AI System Ready!");
    }
    
    if (event.data.type === 'VERDICT') {
        const { id, index, score } = event.data;
        const img = pendingChecks.get(id);
        
        // If the image element still exists on the page
        if (img) {
            // DEMO LOGIC: 
            // 413 = Assault Rifle, 414 = Backpack, 504 = Coffee Mug
            // You can add: if (index === 413) img.style.border = "5px solid red";
            
            console.log(`👁️ Class ${index} (${Math.round(score*100)}%)`);
            
            // Unblur the image
            img.classList.add("safe-revealed");
            
            // Clean up memory
            pendingChecks.delete(id);
        }
    }
});

// --- 3. Scanning Logic ---
function scanImages() {
    // Only scan if the iframe is actually ready
    const iframe = document.getElementById("ai-firewall-sandbox");
    if (!iframe) return;

    const images = document.querySelectorAll("img:not(.scanned)");
    
    for (let img of images) {
        img.classList.add("scanned");
        
        // Skip tiny icons
        if (img.width < 50 || img.height < 50) { 
            img.classList.add("safe-revealed"); 
            continue; 
        }

        // Convert image to Data URL to send across iframe boundary
        if (img.complete) processImage(img, iframe);
        else img.onload = () => processImage(img, iframe);
    }
}

function processImage(img, iframe) {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 224;
        canvas.height = img.height || 224;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL();

        const reqId = uniqueId++;
        pendingChecks.set(reqId, img);
        
        iframe.contentWindow.postMessage({ 
            type: 'CLASSIFY', 
            id: reqId, 
            payload: dataUrl 
        }, '*');

    } catch (e) {
        // Security Error (CORS): We can't read this image's data.
        // It happens with some external images. Just reveal them to be safe.
        img.classList.add("safe-revealed");
    }
}

// Keep scanning for new images every 2 seconds
setInterval(scanImages, 2000);