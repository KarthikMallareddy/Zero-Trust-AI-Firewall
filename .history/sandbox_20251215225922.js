// sandbox.js - Enhanced Model Loading
let model = null;
let modelUrl = null;

// Create a custom IOHandler for TensorFlow.js that works with Chrome extensions
class ChromeExtensionIOHandler {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    async load() {
        try {
            console.log(`📥 Fetching model from: ${this.baseUrl}`);
            const response = await fetch(this.baseUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch model: ${response.statusText}`);
            }
            const modelJson = await response.json();
            
            // Extract weight files and fetch them
            const weightsData = {};
            if (modelJson.weightsManifest) {
                for (const manifest of modelJson.weightsManifest) {
                    for (const path of manifest.paths) {
                        const fileUrl = this.baseUrl.replace('model.json', path);
                        console.log(`📥 Fetching weight file: ${path}`);
                        const fileResponse = await fetch(fileUrl);
                        if (!fileResponse.ok) {
                            throw new Error(`Failed to fetch ${path}: ${fileResponse.statusText}`);
                        }
                        weightsData[path] = await fileResponse.arrayBuffer();
                    }
                }
            }

            return {
                modelTopology: modelJson.modelTopology,
                weightsData: weightsData,
                format: modelJson.format || 'layers-model'
            };
        } catch (err) {
            console.error("❌ Load handler failed:", err);
            throw err;
        }
    }
}

// Register custom handler
tf.io.registerLoadRouter((url, onProgress) => {
    if (url && url.includes('chrome-extension://')) {
        return {
            load: async () => {
                const handler = new ChromeExtensionIOHandler(url);
                return await handler.load();
            }
        };
    }
    return null;
});

async function loadModel() {
    try {
        if (!modelUrl) {
            console.warn("⏳ Waiting for model URL from parent...");
            setTimeout(loadModel, 500);
            return;
        }
        
        console.log("🧠 Loading AI model...");
        console.log(`📍 Model URL: ${modelUrl}`);
        
        model = await tf.loadGraphModel(modelUrl);
        
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
