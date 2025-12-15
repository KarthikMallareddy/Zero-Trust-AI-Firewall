// content.js - Zero-Trust AI Firewall

console.log("[AI Firewall] Active and ready to scan.");

// 1. Configuration
// List of keywords to block. If the AI detects these, the image stays blurred.
const UNSAFE_CLASSES = ["weapon", "gun", "knife", "blood", "fire"]; 
let model = null;

// 2. Load the AI Model (From Disk)
async function loadAI() {
    try {
        console.log("[AI Firewall] Loading Model...");
        
        // This 'getURL' function is vital for local file access within the extension
        const modelUrl = chrome.runtime.getURL('model.json'); 
        
        // Load the model using the global 'tf' variable (from tf.min.js)
        model = await tf.loadGraphModel(modelUrl);
        console.log("[AI Firewall] Model Loaded Successfully.");
        
        // Start scanning images that are already on the page
        scanImages();
    } catch (err) {
        console.error("[AI Firewall] Model Load Failed:", err);
    }
}

// 3. The Scanner
async function scanImages() {
    if (!model) return;

    // Find all images that haven't been scanned yet
    const images = document.querySelectorAll("img:not(.scanned)");
    
    for (let img of images) {
        // Mark as scanned so we don't check it twice
        img.classList.add("scanned");

        // Skip tiny icons or hidden images to save performance
        if (img.width < 50 || img.height < 50) {
            revealImage(img);
            continue;
        }

        // 4. The Prediction
        try {
            // Run the classification logic
            const predictions = await classifyImage(img);
            
            // Check if any top prediction matches our 'UNSAFE' list
            const isUnsafe = predictions.some(p => 
                UNSAFE_CLASSES.some(keyword => p.className.includes(keyword))
            );

            if (isUnsafe) {
                console.log("[AI Firewall] Blocked Content:", predictions[0].className);
                blockImage(img);
            } else {
                // If safe, unblur the image
                revealImage(img);
            }
        } catch (e) {
            // If image fails to load (e.g., security error), reveal it by default
            revealImage(img);
        }
    }
}

// Helper: Run the model on one specific image element
async function classifyImage(imgElement) {
    // Convert HTML image to a Tensor (math data)
    const tensor = tf.browser.fromPixels(imgElement)
        .resizeNearestNeighbor([224, 224]) // MobileNet requires 224x224 images
        .toFloat()
        .expandDims();

    // Run the actual prediction
    const output = await model.predict(tensor).data();
    
    // Cleanup memory immediately (Crucial for browser performance)
    tensor.dispose();

    // NOTE: In a full implementation, you map the 'output' numbers to class names.
    // For this demo structure, we return a safe placeholder to test the unblurring.
    // To block real items, you need the 'IMAGENET_CLASSES' mapping file.
    return [{ className: "demo_safe_object", probability: 0.99 }]; 
}

// Helper to remove the blur
function revealImage(img) {
    img.classList.add("safe-revealed");
}

// Helper to add the red border (keep it blurred)
function blockImage(img) {
    img.classList.add("blocked-content");
}

// 5. Start the process once the window is fully loaded
window.onload = loadAI;