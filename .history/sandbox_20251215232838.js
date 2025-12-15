// sandbox.js - Model Loading for Chrome Extension
let model = null;
let modelLoading = false;
let modelLoadPromise = null;

// Get model URL from the extension context
function getModelUrl() {
    const currentUrl = document.location.href;
    const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1);
    return baseUrl + 'model.json';
}

const modelUrl = getModelUrl();
const baseDirectory = modelUrl.replace('model.json', '');
console.log(`🔗 Detected extension base URL: ${baseDirectory}`);

// Custom IOHandler that properly handles weight group parsing
class ExtensionIOHandler {
    async load() {
        console.log(`📥 Fetching model manifest...`);
        const response = await fetch(modelUrl);
        if (!response.ok) throw new Error(`Failed to fetch model.json: ${response.statusText}`);
        
        const modelArtifacts = await response.json();
        console.log(`✅ Model topology loaded`);
        
        const weightsManifest = modelArtifacts.weightsManifest || [];
        
        // Build weightSpecs array by iterating through manifest groups in order
        const weightSpecs = [];
        for (const group of weightsManifest) {
            for (const weight of group.weights) {
                weightSpecs.push({
                    name: weight.name,
                    shape: weight.shape,
                    dtype: weight.dtype
                });
            }
        }
        console.log(`📋 Extracted ${weightSpecs.length} weight specs from manifest`);
        
        // Fetch all weight files in order
        console.log(`📊 Fetching weight shards...`);
        const weightBuffers = [];
        
        for (const group of weightsManifest) {
            for (const path of group.paths) {
                const url = baseDirectory + path;
                console.log(`📥 Fetching: ${path}`);
                
                try {
                    const fileResponse = await fetch(url);
                    if (!fileResponse.ok) throw new Error(`${fileResponse.status}: ${path}`);
                    const buffer = await fileResponse.arrayBuffer();
                    weightBuffers.push(new Uint8Array(buffer));
                } catch (err) {
                    console.error(`❌ Failed to fetch ${path}: ${err.message}`);
                    throw err;
                }
            }
        }
        
        console.log(`✅ All ${weightBuffers.length} weight shards loaded`);
        
        // Concatenate all weight buffers
        let totalBytes = 0;
        for (const buf of weightBuffers) {
            totalBytes += buf.length;
        }
        
        const concatenatedWeights = new Uint8Array(totalBytes);
        let offset = 0;
        for (const buf of weightBuffers) {
            concatenatedWeights.set(buf, offset);
            offset += buf.length;
        }
        
        console.log(`✅ Concatenated ${totalBytes} bytes of weights`);
        
        // Return in TensorFlow.js expected format
        return {
            modelTopology: modelArtifacts.modelTopology,
            weightSpecs: weightSpecs,
            weightData: concatenatedWeights.buffer
        };
    }
    
    async save() {
        throw new Error('Saving model is not supported');
    }
}

// Register the IOHandler BEFORE any model loading
tf.io.registerLoadRouter((url) => {
    if (typeof url === 'string' && url.includes('chrome-extension://')) {
        console.log(`✅ Using ExtensionIOHandler for: ${url}`);
        return new ExtensionIOHandler();
    }
    return null;
});

async function loadModel() {
    if (model) return; // Already loaded
    if (modelLoading) return modelLoadPromise; // Currently loading
    
    modelLoading = true;
    modelLoadPromise = (async () => {
        try {
            console.log("🧠 Loading AI model...");
            console.log(`📍 Model URL: ${modelUrl}`);
            
            model = await tf.loadGraphModel(modelUrl);
            
            console.log("✅ [Sandbox] Brain Loaded!");
            console.log(`🧬 Model ready - Inputs: ${model.inputs.length}, Outputs: ${model.outputs.length}`);
            window.parent.postMessage({ type: 'MODEL_LOADED' }, '*');
            return model;
        } catch (err) {
            console.error("❌ [Sandbox] Load Failed:", err.message);
            modelLoading = false;
            modelLoadPromise = null;
            throw err;
        }
    })();
    
    return modelLoadPromise;
}

// Handle messages from content.js
window.addEventListener('message', async (event) => {
    const { type, payload, id } = event.data;

    if (type === 'CLASSIFY') {
        try {
            // Wait for model if it's still loading
            const readyModel = model || await loadModel();
            if (!readyModel) {
                console.error("❌ Model failed to load");
                return;
            }
            
            // 1. Create an image element from the data sent
            const img = new Image();
            img.onload = async () => {
                try {
                    // 2. Predict
                    const tensor = tf.browser.fromPixels(img)
                        .resizeNearestNeighbor([224, 224])
                        .toFloat()
                        .expandDims();
                    
                    const predictions = await readyModel.predict(tensor).data();
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
                    console.error("❌ Prediction error:", e.message);
                }
            };
            img.onerror = () => console.error("❌ Failed to load image data");
            img.src = payload; // Load the image data
        } catch (err) {
            console.error("❌ CLASSIFY handler error:", err.message);
        }
    }
});

// Start loading the model when the script loads
loadModel();
