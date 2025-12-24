// content.js - Zero-Trust AI Firewall (Enhanced with Categories)
console.log("🛡️ AI Firewall: Initializing...");

// Initialize storage manager
const storage = new FirewallStorage();
let userSettings = null;
let currentDomain = window.location.hostname;

// Store iframe globally
let sandboxIframe = null;
let sandboxReady = false;
let settingsLoaded = false;

// Load settings on startup
(async function initializeSettings() {
    userSettings = await storage.getDomainSettings(currentDomain);
    settingsLoaded = true;
    console.log('📦 Loaded settings for domain:', currentDomain, userSettings);
    console.log('📊 Extension enabled:', userSettings?.enabled);
    console.log('📊 Settings loaded flag:', settingsLoaded);
    
    // Listen for settings changes
    storage.onSettingsChanged((newSettings) => {
        console.log('📦 Settings updated:', newSettings);
        userSettings = newSettings;
    });
    
    // Start scanner once settings are loaded
    if (document.body) {
        init();
    }
})();

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
    
    // Scan when user scrolls (debounced)
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(scanImages, 300);
    }, { passive: true });
    
    // Watch for dynamically added images
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length) {
                scanImages();
                break;
            }
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// init() will be called by initializeSettings() once settings are loaded

// --- 2. Message Handling ---
const pendingChecks = new Map();
let uniqueId = 0;

window.addEventListener('message', async (event) => {
    // We only care about messages from our own sandbox
    if (!event.data) return;

    if (event.data.type === 'SANDBOX_READY') {
        sandboxReady = true;
        console.log('✅ Sandbox is ready and listening!');
        // Trigger a scan now that sandbox is ready
        scanImages();
        return;
    }

    if (event.data.type === 'MODEL_LOADED') {
        console.log("🧠 AI Brain is active!");
        console.log(`📊 Available categories: ${event.data.categories?.map(c => c.id).join(', ')}`);
    }
    
    if (event.data.type === 'VERDICT') {
        const { id, classifications, should_block, primary_category, confidence, reason } = event.data;
        const img = pendingChecks.get(id);
        
        // Debug logging
        console.log('📥 Verdict received:', {
            should_block,
            primary_category,
            confidence: Math.round(confidence * 100) + '%',
            reason,
            matched_categories: classifications[0]?.matched_categories,
            blocked_categories: classifications[0]?.blocked_categories
        });
        
        if (img) {
            // Update statistics in storage with confidence score
            await storage.incrementStats(currentDomain, should_block, primary_category, confidence);
            
            // Notify popup of stats update (if open)
            try {
                chrome.runtime.sendMessage({
                    type: 'STATS_UPDATED',
                    domain: currentDomain,
                    category: primary_category,
                    blocked: should_block
                });
            } catch (e) {
                // Popup not open, ignore
            }
            
            if (should_block) {
                // Keep image blurred
                img.classList.add("content-blocked");
                img.setAttribute('data-blocked-category', primary_category);
                img.setAttribute('title', `🚫 Blocked: ${reason}`);
                console.log(`🚫 BLOCKED - ${primary_category.toUpperCase()}: ${reason} (${Math.round(confidence*100)}%)`);
            } else {
                // Reveal safe image
                revealImage(img);
                const categories = classifications[0]?.matched_categories?.join(', ') || 'Safe content';
                console.log(`✅ SAFE: ${categories}`, {
                    should_block,
                    confidence: Math.round(confidence*100) + '%',
                    reason,
                    classifications: classifications[0]
                });
            }
            
            pendingChecks.delete(id);
        }
    }
});

// --- 3. Scanning Logic ---
function scanImages() {
    // Check if settings are loaded
    if (!settingsLoaded || !userSettings || userSettings.enabled === false) {
        console.log('⚠️ Extension disabled or settings not loaded', {
            settingsLoaded,
            hasUserSettings: !!userSettings,
            enabled: userSettings?.enabled
        });
        return;
    }
    
    if (!sandboxIframe || !sandboxIframe.contentWindow) {
        console.log('⚠️ Sandbox iframe not ready');
        return;
    }
    
    if (!sandboxReady) {
        console.log('⚠️ Sandbox JavaScript not loaded yet');
        return;
    }

    const images = document.querySelectorAll("img:not(.scanned)");
    console.log(`🔍 Found ${images.length} new images to scan`);
    
    if (images.length === 0) {
        // Debug: show what images exist
        const allImages = document.querySelectorAll("img");
        const scannedImages = document.querySelectorAll("img.scanned");
        console.log(`   Total images: ${allImages.length}, Already scanned: ${scannedImages.length}`);
    }
    
    for (let img of images) {
        img.classList.add("scanned");
        
        // Get rendered size (getBoundingClientRect) or natural size
        const rect = img.getBoundingClientRect();
        const width = rect.width || img.naturalWidth || img.width;
        const height = rect.height || img.naturalHeight || img.height;
        
        console.log(`  - Image: ${img.src.substring(0, 50)}... (${width}x${height}, complete: ${img.complete})`);
        
        // Skip tiny icons
        if (width < 50 || height < 50) {
            console.log(`    ⏭️ Skipped (too small: ${width}x${height})`);
            revealImage(img); 
            continue; 
        }

        if (img.complete) processImage(img, sandboxIframe);
        else img.onload = () => processImage(img, sandboxIframe);
    }
}

function processImage(img, iframe) {
    try {
        console.log(`🔍 Processing image: ${img.src.substring(0, 50)}...`);
        
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 224;
        canvas.height = img.height || 224;
        const ctx = canvas.getContext('2d');
        
        // Use willReadFrequently for better performance
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Try to get image data
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        console.log(`✅ Canvas converted successfully`);

        const reqId = uniqueId++;
        pendingChecks.set(reqId, img);
        
        // Blur image while processing
        img.classList.add("blurred-content");
        
        // Check if iframe is ready
        if (!iframe.contentWindow) {
            console.error('❌ Iframe contentWindow not available!');
            revealImage(img);
            return;
        }
        
        // Send classification request with user settings
        console.log(`📤 Sending to AI for classification (ID: ${reqId})`);
        try {
            iframe.contentWindow.postMessage({ 
                type: 'CLASSIFY', 
                id: reqId, 
                payload: dataUrl,
                settings: userSettings
            }, '*');
            console.log(`✅ Message posted to iframe`);
        } catch (e) {
            console.error(`❌ Failed to post message:`, e);
            revealImage(img);
        }

    } catch (e) {
        // CORS Security Error: We can't read this image data (it's from a different domain).
        // Fail Safe: Unblur it so the user can see it.
        console.warn("⚠️ CORS restriction - cannot analyze image:", e.message);
        revealImage(img);
    }
}

function revealImage(img) {
    img.classList.add("safe-revealed");
    console.log('🔓 Image revealed:', img.src.substring(0, 50) + '...');
}