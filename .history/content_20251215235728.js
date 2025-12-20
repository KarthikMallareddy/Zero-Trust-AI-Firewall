// content.js - Zero-Trust AI Firewall (Enhanced with Categories)
console.log("🛡️ AI Firewall: Initializing...");

// Store iframe globally
let sandboxIframe = null;
let userSettings = {
    categories: {
        nsfw: true,
        violence: true,
        weapons: true,
        gore: false,
        disturbing: false
    },
    confidence_threshold: 0.70
};

// Statistics tracking
let stats = {
    scanned: 0,
    blocked: 0,
    by_category: {}
};

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
        console.log(`📊 Available categories: ${event.data.categories?.map(c => c.id).join(', ')}`);
    }
    
    if (event.data.type === 'VERDICT') {
        const { id, classifications, should_block, primary_category, confidence, reason } = event.data;
        const img = pendingChecks.get(id);
        
        if (img) {
            stats.scanned++;
            
            if (should_block) {
                stats.blocked++;
                if (!stats.by_category[primary_category]) {
                    stats.by_category[primary_category] = 0;
                }
                stats.by_category[primary_category]++;
                
                // Keep image blurred
                img.classList.add("content-blocked");
                img.setAttribute('data-blocked-category', primary_category);
                img.setAttribute('title', `🚫 Blocked: ${reason}`);
                console.log(`🚫 ${primary_category.toUpperCase()}: ${reason} (${Math.round(confidence*100)}%)`);
            } else {
                // Reveal safe image
                revealImage(img);
                console.log(`✅ SAFE: ${classifications[0]?.matched_categories.join(', ') || 'Safe content'}`);
            }
            
            // Log statistics periodically
            if (stats.scanned % 5 === 0) {
                console.log(`📈 Stats - Scanned: ${stats.scanned}, Blocked: ${stats.blocked}, Categories: ${JSON.stringify(stats.by_category)}`);
            }
            
            pendingChecks.delete(id);
        }
    }
});

// --- 3. Scanning Logic ---
function scanImages() {
    if (!sandboxIframe || !sandboxIframe.contentWindow) {
        return;
    }

    const images = document.querySelectorAll("img:not(.scanned)");
    
    for (let img of images) {
        img.classList.add("scanned");
        
        // Skip tiny icons
        if (img.width < 50 || img.height < 50) { 
            revealImage(img); 
            continue; 
        }

        if (img.complete) processImage(img, sandboxIframe);
        else img.onload = () => processImage(img, sandboxIframe);
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
        
        // Blur image while processing
        img.classList.add("blurred-content");
        
        // Send classification request with user settings
        iframe.contentWindow.postMessage({ 
            type: 'CLASSIFY', 
            id: reqId, 
            payload: dataUrl,
            settings: userSettings
        }, '*');

    } catch (e) {
        // CORS Security Error: We can't read this image data (it's from a different domain).
        // Fail Safe: Unblur it so the user can see it.
        console.warn("⚠️ CORS restriction - cannot analyze image:", e.message);
        revealImage(img);
    }
}

function revealImage(img) {
    img.classList.add("safe-revealed");
}