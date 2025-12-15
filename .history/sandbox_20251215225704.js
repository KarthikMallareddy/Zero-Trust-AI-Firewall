// sandbox.js
let model = null;

async function loadModel() {
    try {
        // Load model from local files using chrome runtime URL
        const modelUrl = chrome.runtime.getURL('model.json');
        model = await tf.loadGraphModel(`indexeddb://ai-firewall-model`);
        console.log("✅ [Sandbox] Brain Loaded!");
        // Tell content.js we are ready
        window.parent.postMessage({ type: 'MODEL_LOADED' }, '*');
    } catch (err) {
        // If IndexedDB fails, try direct fetch
        try {
            const modelUrl = chrome.runtime.getURL('model.json');
            model = await tf.loadGraphModel(`file://${modelUrl}`);
            console.log("✅ [Sandbox] Brain Loaded!");
            window.parent.postMessage({ type: 'MODEL_LOADED' }, '*');
        } catch (err2) {
            console.error("❌ [Sandbox] Load Failed:", err2);
        }
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