// sandbox.js
let model = null;

// Custom fetch handler for chrome extension resources
async function fetchWithChromeURL(url) {
    try {
        // If it's already a chrome-extension URL, fetch directly
        if (url.startsWith('chrome-extension://')) {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response;
        }
        
        // Convert relative paths to chrome.runtime.getURL
        const chromeUrl = chrome.runtime.getURL(url);
        const response = await fetch(chromeUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response;
    } catch (err) {
        console.error(`Failed to fetch ${url}:`, err);
        throw err;
    }
}

async function loadModel() {
    try {
        console.log("🧠 Loading AI model...");
        
        // Create a custom handler for tf.loadGraphModel
        const modelUrl = chrome.runtime.getURL('model.json');
        console.log(`📍 Model URL: ${modelUrl}`);
        
        // Use tf.loadGraphModel with fetch handler
        model = await tf.loadGraphModel(modelUrl, {
            onProgress: (fraction) => {
                console.log(`⏳ Loading: ${Math.round(fraction * 100)}%`);
            }
        });
        
        console.log("✅ [Sandbox] Brain Loaded!");
        // Tell content.js we are ready
        window.parent.postMessage({ type: 'MODEL_LOADED' }, '*');
    } catch (err) {
        console.error("❌ [Sandbox] Load Failed:", err);
        // Retry after a brief delay
        setTimeout(loadModel, 2000);
    }
}

// Handle messages from content.js
window.addEventListener('message', async (event) => {
    const { type, payload, id } = event.data;

    if (type === 'CLASSIFY' && model) {
        // 1. Create an image element from the data sent
        const img = new Image();
        img.onload = async () => {
            try {
                // 2. Predict
                const tensor = tf.browser.fromPixels(img)
                    .resizeNearestNeighbor([224, 224])
                    .toFloat()
                    .expandDims();
                
                const predictions = await model.predict(tensor).data();
                tensor.dispose();

                // 3. Find top class
                let maxScore = -1;
                let maxIndex = -1;
                for (let i = 0; i < predictions.length; i++) {
                    if (predictions[i] > maxScore) {
                        maxScore = predictions[i];
                        maxIndex = i;
                    }
                }

                // 4. Send Verdict back to Page
                window.parent.postMessage({ 
                    type: 'VERDICT', 
                    id: id, 
                    index: maxIndex,
                    score: maxScore
                }, '*');

            } catch (e) {
                console.error("Prediction error", e);
            }
        };
        img.src = payload; // Load the image data
    }
});

loadModel();