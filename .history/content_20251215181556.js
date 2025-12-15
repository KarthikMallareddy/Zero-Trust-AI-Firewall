// content.js - FINAL LOGIC

console.log("[AI Firewall] Active.");

// 1. Configuration
// We will rely on the console to tell us what it sees for now
let model = null;

// 2. Load the AI
async function loadAI() {
    try {
        console.log("⏳ Loading Brain...");
        const modelUrl = chrome.runtime.getURL('model.json'); 
        model = await tf.loadGraphModel(modelUrl);
        console.log("✅ Brain Loaded!");
        scanImages();
    } catch (err) {
        console.error("Brain Failed:", err);
    }
}

// 3. The Scanner
async function scanImages() {
    if (!model) return;
    const images = document.querySelectorAll("img:not(.scanned)");
    
    for (let img of images) {
        img.classList.add("scanned");
        if (img.width < 50 || img.height < 50) { revealImage(img); continue; }

        try {
            // Predict!
            const tensor = tf.browser.fromPixels(img)
                .resizeNearestNeighbor([224, 224])
                .toFloat()
                .expandDims();
            
            const predictions = await model.predict(tensor).data();
            tensor.dispose();

            // Find the top prediction (Highest number in the array)
            let maxScore = -1;
            let maxIndex = -1;
            for (let i = 0; i < predictions.length; i++) {
                if (predictions[i] > maxScore) {
                    maxScore = predictions[i];
                    maxIndex = i;
                }
            }
            
            console.log(`👁️ Saw Image (Class #${maxIndex}) with ${Math.round(maxScore*100)}% confidence`);

            // For now, UNBLUR everything so you can see the result.
            // (Later we can say: if (maxIndex == 413) blockImage(img))
            revealImage(img);

        } catch (e) {
            revealImage(img);
        }
    }
}

function revealImage(img) {
    img.classList.add("safe-revealed");
}

window.onload = loadAI;