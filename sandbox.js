// sandbox.js - Model Loading for Chrome Extension
let model = null;
let classifier = null;
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
        
        // Handle both standard format and Keras-converted format
        const weightsManifest = modelArtifacts.weightsManifest || [];
        
        if (!weightsManifest || weightsManifest.length === 0) {
            throw new Error('No weightsManifest found in model.json');
        }
        
        // Build weightSpecs array by iterating through manifest groups in order
        const weightSpecs = [];
        for (const group of weightsManifest) {
            if (!group.weights) {
                console.warn('Group missing weights property:', group);
                continue;
            }
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
            if (!group.paths || !Array.isArray(group.paths)) {
                console.warn('Group missing paths property:', group);
                continue;
            }
            
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
        
        // Return model artifacts in the exact format TensorFlow.js expects
        const artifacts = {
            modelTopology: modelArtifacts.modelTopology,
            weightSpecs: weightSpecs,
            weightData: concatenatedWeights.buffer
        };
        
        // Add optional fields if they exist
        if (modelArtifacts.format) artifacts.format = modelArtifacts.format;
        if (modelArtifacts.generatedBy) artifacts.generatedBy = modelArtifacts.generatedBy;
        if (modelArtifacts.convertedBy) artifacts.convertedBy = modelArtifacts.convertedBy;
        if (modelArtifacts.trainingConfig) artifacts.trainingConfig = modelArtifacts.trainingConfig;
        
        console.log('📦 Model artifacts structure:', {
            hasTopology: !!artifacts.modelTopology,
            weightSpecsCount: weightSpecs.length,
            weightDataSize: concatenatedWeights.buffer.byteLength,
            format: artifacts.format
        });
        
        return artifacts;
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
            // Wait for category config to load
            let attempts = 0;
            while (!window.CATEGORY_CONFIG && attempts < 50) {
                await new Promise(r => setTimeout(r, 100));
                attempts++;
            }
            
            if (!window.CATEGORY_CONFIG) {
                throw new Error('Category configuration failed to load');
            }
            
            // Initialize classifier
            classifier = new Classifier(window.CATEGORY_CONFIG);
            console.log(`✅ Classifier initialized with ${classifier.getAllCategories().length} categories`);
            
            console.log("🧠 Loading AI model...");
            console.log(`📍 Model URL: ${modelUrl}`);
            
            try {
                // Load MobileNet for object detection
                model = await tf.loadLayersModel(modelUrl);
                console.log("✅ [Sandbox] Model Loaded!");
                console.log(`🧬 Model ready - Inputs: ${model.inputs.length}, Outputs: ${model.outputs.length}`);
                
            } catch (loadError) {
                console.error("❌ Model loading failed:", loadError);
                console.error("Error stack:", loadError.stack);
                throw loadError;
            }            
            // Send MODEL_LOADED with category info
            window.parent.postMessage({ 
                type: 'MODEL_LOADED',
                categories: classifier.getAllCategories()
            }, '*');
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
        console.log(`📨 Received CLASSIFY request (ID: ${id})`);
        try {
            // Wait for model if it's still loading
            const readyModel = model || await loadModel();
            if (!readyModel || !classifier) {
                console.error("❌ Model or classifier failed to load");
                return;
            }
            
            console.log(`🤖 Model ready, processing image...`);
            
            // 1. Create an image element from the data sent
            const img = new Image();
            img.onload = async () => {
                try {
                    console.log(`🖼️ Image loaded in sandbox, running prediction...`);
                    
                    // 2. Run MobileNet prediction
                    const tensor = tf.browser.fromPixels(img)
                        .resizeNearestNeighbor([224, 224])
                        .toFloat()
                        .expandDims();
                    
                    const predictions = await readyModel.predict(tensor).data();
                    tensor.dispose();
                    
                    console.log(`✅ Prediction complete`);

                    // 3. Get top 3 predictions
                    const topN = 3;
                    const topIndices = Array.from(predictions)
                        .map((score, idx) => ({ idx, score }))
                        .sort((a, b) => b.score - a.score)
                        .slice(0, topN);

                    // 4. Classify each prediction with category mapping
                    const classifications = topIndices.map(pred => {
                        const classification = classifier.classify(pred.idx, pred.score);
                        const userSettings = event.data.settings || {};
                        const blockingDecision = classifier.shouldBlock(classification, userSettings);
                        return {
                            ...classification,
                            ...blockingDecision,
                            summary: classifier.getSummary(classification, blockingDecision)
                        };
                    });

                    console.log(`📤 Sending verdict for ID ${id}: ${classifications[0]?.should_block ? 'BLOCK' : 'SAFE'}`);
                    
                    // 5. Send enhanced verdict back to Page
                    window.parent.postMessage({ 
                        type: 'VERDICT', 
                        id: id,
                        predictions: topIndices,
                        classifications: classifications,
                        should_block: classifications[0]?.should_block || false,
                        primary_category: classifications[0]?.primary_category,
                        confidence: classifications[0]?.confidence,
                        reason: classifications[0]?.reason
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

// Signal that sandbox is ready
window.parent.postMessage({ type: 'SANDBOX_READY' }, '*');
console.log('📡 Sandbox ready and listening for messages');
