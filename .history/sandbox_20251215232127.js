// sandbox.js - Model Loading for Chrome Extension
let model = null;

// Get model URL from the extension context
function getModelUrl() {
    const currentUrl = document.location.href;
    const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1);
    return baseUrl + 'model.json';
}

const modelUrl = getModelUrl();
const baseDirectory = modelUrl.replace('model.json', '');
console.log(`🔗 Detected extension base URL: ${baseDirectory}`);

// Custom IOHandler that implements the full TensorFlow.js io.IOHandler interface
class ExtensionIOHandler {
    async load() {
        console.log(`📥 Fetching model manifest...`);
        const response = await fetch(modelUrl);
        if (!response.ok) throw new Error(`Failed to fetch model.json: ${response.statusText}`);
        
        const modelArtifacts = await response.json();
        console.log(`✅ Model topology loaded`);
        
        // Now fetch and assemble all weights
        console.log(`📊 Fetching weight shards...`);
        const weightsManifest = modelArtifacts.weightsManifest || [];
        const weightArrays = {};
        let totalWeightsLoaded = 0;
        
        for (const manifestGroup of weightsManifest) {
            for (const path of manifestGroup.paths) {
                const url = baseDirectory + path;
                console.log(`📥 Fetching: ${path}`);
                
                const fileResponse = await fetch(url);
                if (!fileResponse.ok) throw new Error(`Failed to fetch ${path}`);
                
                const buffer = await fileResponse.arrayBuffer();
                weightArrays[path] = new Uint8Array(buffer);
                totalWeightsLoaded++;
            }
        }
        
        console.log(`✅ All ${totalWeightsLoaded} weight shards loaded`);
        
        // Concatenate all weights into a single buffer
        let totalBytes = 0;
        for (const shard of Object.values(weightArrays)) {
            totalBytes += shard.length;
        }
        
        const concatenatedWeights = new Uint8Array(totalBytes);
        let offset = 0;
        for (const shard of Object.values(weightArrays)) {
            concatenatedWeights.set(shard, offset);
            offset += shard.length;
        }
        
        return {
            modelTopology: modelArtifacts.modelTopology,
            weightSpecs: modelArtifacts.weightSpecs,
            weightData: concatenatedWeights.buffer
        };
    }
    
    async save() {
        throw new Error('Saving model is not supported');
    }
}

// Register the IOHandler
tf.io.registerLoadRouter((url) => {
    if (typeof url === 'string' && url.includes('chrome-extension://')) {
        console.log(`✅ Using ExtensionIOHandler for: ${url}`);
        return new ExtensionIOHandler();
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
        console.error("❌ [Sandbox] Load Failed:", err.message);
        console.error("Full error:", err);
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
