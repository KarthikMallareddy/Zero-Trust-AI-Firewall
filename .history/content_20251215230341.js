// content.js - Zero-Trust AI Firewall (Fixed Init)
console.log("🛡️ AI Firewall: Initializing...");

// Store iframe globally
let sandboxIframe = null;

// 1. The Bridge Setup (With Safety Loop)
function init() {
    // If the body doesn't exist yet, wait 10ms and try again
    if (!document.body) {
        setTimeout(init, 10);
        return; 
    }

    // Body is ready! Now we can inject the sandbox.
    sandboxIframe = document.createElement('iframe');
    sandboxIframe.style.display = 'none';
    sandboxIframe.src = chrome.runtime.getURL('sandbox.html');
    sandboxIframe.id = "ai-firewall-sandbox";
    document.body.appendChild(sandboxIframe);
    
    console.log("✅ Bridge Built. Starting Scanner...");
    
    // Wait for iframe to be ready and send model URL
    const modelUrl = chrome.runtime.getURL('model.json');
    let sendAttempts = 0;
    const maxAttempts = 20;
    
    function sendModelUrl() {
        sendAttempts++;
        try {
            if (!sandboxIframe || !sandboxIframe.contentWindow) {
                throw new Error("Iframe not ready");
            }
            sandboxIframe.contentWindow.postMessage({ 
                type: 'MODEL_URL', 
                payload: modelUrl 
            }, '*');
            console.log("📤 Sent model URL to sandbox");
        } catch (err) {
            console.log(`⏳ Waiting for iframe... (attempt ${sendAttempts}/${maxAttempts})`);
            if (sendAttempts < maxAttempts) {
                setTimeout(sendModelUrl, 200);
            } else {
                console.error("❌ Failed to send model URL to sandbox");
            }
        }
    }
    
    // Start trying to send the URL immediately
    sendModelUrl();
    
    // Start the scanning loop
    setInterval(scanImages, 2000);
    scanImages(); // Run once immediately
}

// Start the process
init();

// --- 2. Message Handling ---
const pendingChecks = new Map();
let uniqueId = 0;

window.addEventListener('message', (event) => {
    // We only care about messages from our own sandbox
    if (!event.data) return;

    if (event.data.type === 'MODEL_LOADED') {
        console.log("🧠 AI Brain is active!");
    }
    
    if (event.data.type === 'VERDICT') {
        const { id, index, score } = event.data;
        const img = pendingChecks.get(id);
        
        if (img) {
            // Verdict Received!
            // Demo Logic: Just log it and unblur
            console.log(`👁️ Class ${index} (${Math.round(score*100)}%)`);
            revealImage(img);
            pendingChecks.delete(id);
        }
    }
});

// --- 3. Scanning Logic ---
function scanImages() {
    const iframe = document.getElementById("ai-firewall-sandbox");
    if (!iframe) return;

    const images = document.querySelectorAll("img:not(.scanned)");
    
    for (let img of images) {
        img.classList.add("scanned");
        
        // Skip tiny icons
        if (img.width < 50 || img.height < 50) { 
            revealImage(img); 
            continue; 
        }

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
        // CORS Security Error: We can't read this image data (it's from a different domain).
        // Fail Safe: Unblur it so the user can see it.
        revealImage(img);
    }
}

function revealImage(img) {
    img.classList.add("safe-revealed");
}