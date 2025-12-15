// sandbox.js - Enhanced Model Loading
let model = null;

// Get model URL from the extension context
function getModelUrl() {
    const currentUrl = document.location.href;
    const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1);
    return baseUrl + 'model.json';
}

const modelUrl = getModelUrl();
console.log(`🔗 Detected extension base URL: ${modelUrl.substring(0, modelUrl.lastIndexOf('/'))}`);

// Custom IOHandler that properly constructs weight data for TensorFlow.js
class ExtensionIOHandler {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    async load() {
        try {
            console.log(`📥 Fetching model manifest from: ${this.baseUrl}`);
            const response = await fetch(this.baseUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const modelJson = await response.json();
            
            const baseDirectory = this.baseUrl.replace('model.json', '');
            const weightsManifest = modelJson.weightsManifest || [];
            
            // Fetch all weight files
            console.log(`📊 Loading ${weightsManifest.length} weight groups...`);
            const weights = [];
            
            for (let i = 0; i < weightsManifest.length; i++) {
                const group = weightsManifest[i];
                for (const path of group.paths) {
                    const url = baseDirectory + path;
                    console.log(`📥 [${i + 1}/${weightsManifest.length}] Fetching: ${path}`);
                    
                    const fileResponse = await fetch(url);
                    if (!fileResponse.ok) throw new Error(`Failed to fetch ${path}`);
                    
                    const data = await fileResponse.arrayBuffer();
                    weights.push({
                        name: path,
                        data: new Uint8Array(data)
                    });
                }
            }
            
            // Construct the proper format for tf.loadGraphModel
            return {
                modelTopology: modelJson.modelTopology,
                weightsManifest: weightsManifest,
                weightData: this._concatenateWeights(weights),
                weightSpecs: this._extractWeightSpecs(weightsManifest)
            };
        } catch (err) {
            console.error("❌ Handler load failed:", err);
            throw err;
        }
    }
    
    _concatenateWeights(weights) {
        let totalSize = 0;
        for (const w of weights) {
            totalSize += w.data.length;
        }
        
        const concatenated = new Uint8Array(totalSize);
        let offset = 0;
        for (const w of weights) {
            concatenated.set(w.data, offset);
            offset += w.data.length;
        }
        return concatenated.buffer;
    }
    
    _extractWeightSpecs(manifest) {
        const specs = [];
        for (const group of manifest) {
            for (const weight of group.weights) {
                specs.push({
                    name: weight.name,
                    shape: weight.shape,
                    dtype: weight.dtype
                });
            }
        }
        return specs;
    }
}

// Register the custom handler
tf.io.registerLoadRouter((url) => {
    if (url && url.includes('chrome-extension://')) {
        return new ExtensionIOHandler(url);
    }
    return null;
});

async function loadModel() {
    try {
        console.log("🧠 Loading AI model...");
        console.log(`📍 Model URL: ${modelUrl}`);
        
        model = await tf.loadGraphModel(modelUrl);
        
        console.log("✅ [Sandbox] Brain Loaded!");
        console.log(`🧬 Model ready - Inputs: ${model.inputs.length}, Outputs: ${model.outputs.length}`);
        window.parent.postMessage({ type: 'MODEL_LOADED' }, '*');
    } catch (err) {
        console.error("❌ [Sandbox] Load Failed:", err);
        console.error("Details:", err.message);
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
