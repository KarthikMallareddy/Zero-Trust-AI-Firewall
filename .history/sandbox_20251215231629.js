// sandbox.js - Enhanced Model Loading
let model = null;

// Get model URL from the extension context
function getModelUrl() {
    // Current location is something like chrome-extension://[ID]/sandbox.html
    // We need to replace sandbox.html with model.json
    const currentUrl = document.location.href;
    const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1);
    return baseUrl + 'model.json';
}

// Initialize model URL
const modelUrl = getModelUrl();
console.log(`🔗 Detected extension base URL: ${modelUrl.substring(0, modelUrl.lastIndexOf('/'))}`);

async function loadModel() {
    try {
        console.log("🧠 Loading AI model...");
        console.log(`📍 Model URL: ${modelUrl}`);
        
        // Use tf.io.http() which properly handles JSON with weights
        const handler = tf.io.http(modelUrl);
        model = await tf.loadGraphModel(handler);
        
        console.log("✅ [Sandbox] Brain Loaded!");
        console.log(`🧬 Model Inputs: ${model.inputs.length}, Outputs: ${model.outputs.length}`);
        window.parent.postMessage({ type: 'MODEL_LOADED' }, '*');
    } catch (err) {
        console.error("❌ [Sandbox] Load Failed:", err);
        console.error("Stack:", err.stack);
        setTimeout(loadModel, 3000);
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

// Start loading the model when the script loads
loadModel();
