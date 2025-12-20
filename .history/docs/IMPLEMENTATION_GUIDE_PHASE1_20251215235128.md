# 📋 Implementation Guide - Phase 1: Content Detection

This guide walks through implementing Phase 1 of the Zero-Trust AI Firewall roadmap.

## 🎯 Phase 1 Objectives

1. Enhance classification with content categories (NSFW, Violence, Weapons, Gore, Disturbing)
2. Add confidence thresholding logic
3. Implement user-configurable filtering
4. Provide clear blocking reasons

## 📦 Files Created

### 1. `data/category_mapping.json`
Defines all content categories with:
- ImageNet class indices for each category
- Default confidence thresholds
- Category metadata and descriptions
- Built-in profiles (Permissive, Balanced, Strict, Parental)
- Auto-unblur timeout options

**Key Sections:**
- `categories`: Category definitions with ImageNet class mappings
- `confidence_levels`: Predefined sensitivity levels
- `auto_unblur_options`: Auto-unblur timeout configurations
- `profiles`: Complete filtering profiles for different use cases

### 2. `js/classifier.js`
Classification engine that:
- Builds reverse index of ImageNet classes → Categories
- Maps predictions to content categories
- Determines blocking based on user settings
- Validates user configurations
- Generates classification summaries for logging

**Main Methods:**
```javascript
classify(classIndex, confidence)        // Map prediction to categories
shouldBlock(classification, settings)   // Determine if should block
getCategoryInfo(categoryId)             // Get category metadata
getProfileSettings(profileName)         // Get profile configuration
validateSettings(settings)              // Validate user settings
```

## 🔧 Integration with Existing Code

### Step 1: Update `manifest.json`

Add web-accessible resources for data files:

```json
{
  "web_accessible_resources": [
    {
      "resources": ["data/category_mapping.json"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

### Step 2: Update `sandbox.html`

Add script loading for classifier:

```html
<script src="js/classifier.js"></script>
<script src="data/category_mapping.json"></script>
<script src="sandbox.js"></script>
```

Wait, `category_mapping.json` is JSON, not JS. Update `sandbox.html`:

```html
<script>
  // Load category mapping
  fetch('data/category_mapping.json')
    .then(r => r.json())
    .then(data => window.CATEGORY_CONFIG = data);
</script>
<script src="js/classifier.js"></script>
<script src="sandbox.js"></script>
```

### Step 3: Update `sandbox.js`

Integrate classifier into model inference:

```javascript
let model = null;
let classifier = null;

async function loadModel() {
    if (model) return;
    if (modelLoading) return modelLoadPromise;
    
    modelLoading = true;
    modelLoadPromise = (async () => {
        try {
            // Wait for category config to load
            while (!window.CATEGORY_CONFIG) {
                await new Promise(r => setTimeout(r, 100));
            }
            
            classifier = new Classifier(window.CATEGORY_CONFIG);
            
            console.log("🧠 Loading AI model...");
            model = await tf.loadGraphModel(modelUrl);
            
            console.log("✅ [Sandbox] Brain Loaded!");
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

// In CLASSIFY handler, enhance verdict:
window.addEventListener('message', async (event) => {
    const { type, payload, id } = event.data;

    if (type === 'CLASSIFY') {
        try {
            const readyModel = model || await loadModel();
            if (!readyModel) throw new Error("Model failed to load");
            
            const img = new Image();
            img.onload = async () => {
                try {
                    // ... existing prediction code ...
                    const tensor = tf.browser.fromPixels(img)
                        .resizeNearestNeighbor([224, 224])
                        .toFloat()
                        .expandDims();
                    
                    const predictions = await readyModel.predict(tensor).data();
                    tensor.dispose();

                    // Find top 3 predictions
                    const topN = 3;
                    const topIndices = Array.from(predictions)
                        .map((score, idx) => ({ idx, score }))
                        .sort((a, b) => b.score - a.score)
                        .slice(0, topN);

                    // Classify each prediction
                    const classifications = topIndices.map(pred => {
                        const classification = classifier.classify(pred.idx, pred.score);
                        const blockingDecision = classifier.shouldBlock(
                            classification,
                            event.data.settings || {}
                        );
                        return {
                            ...classification,
                            ...blockingDecision,
                            summary: classifier.getSummary(classification, blockingDecision)
                        };
                    });

                    // Send enhanced verdict
                    window.parent.postMessage({ 
                        type: 'VERDICT', 
                        id: id,
                        predictions: topIndices,
                        classifications: classifications,
                        should_block: classifications[0]?.should_block || false,
                        primary_category: classifications[0]?.primary_category,
                        confidence: classifications[0]?.confidence
                    }, '*');

                } catch (e) {
                    console.error("❌ Prediction error:", e.message);
                }
            };
            img.src = payload;
        } catch (err) {
            console.error("❌ CLASSIFY handler error:", err.message);
        }
    }
});
```

### Step 4: Update `content.js`

Handle categorized verdicts:

```javascript
function handleVerdictMessage(event) {
    const { id, classifications, should_block, primary_category } = event.data;
    
    const imageElement = imageRegistry.get(id);
    if (!imageElement) return;

    // Log classification
    if (should_block) {
        console.log(`🚫 ${primary_category.toUpperCase()}: ${imageElement.src}`);
    } else {
        console.log(`✅ SAFE: ${imageElement.src}`);
    }

    // Unblur or keep blurred
    if (should_block) {
        imageElement.classList.add('blurred-content');
        imageElement.setAttribute('data-blocked-category', primary_category);
        imageElement.title = `Blocked: ${classifications[0].reason}`;
    } else {
        imageElement.classList.remove('blurred-content');
        imageElement.title = '';
    }

    imageRegistry.delete(id);
}

messageProxy.addEventListener('VERDICT', (event) => {
    handleVerdictMessage(event);
});
```

## 📝 Usage Examples

### Example 1: Create Classifier Instance

```javascript
const categoryConfig = await fetch('data/category_mapping.json').then(r => r.json());
const classifier = new Classifier(categoryConfig);

// Get all categories
const categories = classifier.getAllCategories();
console.log(categories);
// Output: [
//   { id: 'nsfw', label: 'NSFW Content', ... },
//   { id: 'violence', label: 'Violence & Aggression', ... },
//   ...
// ]
```

### Example 2: Classify a Prediction

```javascript
const classIndex = 156; // Some ImageNet class
const confidence = 0.92;

const classification = classifier.classify(classIndex, confidence);
console.log(classification);
// Output: {
//   class_index: 156,
//   confidence: 0.92,
//   matched_categories: ['nsfw'],
//   is_flagged: true,
//   primary_category: 'nsfw'
// }
```

### Example 3: Check if Should Block

```javascript
const userSettings = {
    categories: {
        nsfw: true,
        violence: true,
        weapons: true,
        gore: false
    },
    confidence_threshold: 0.70
};

const blockingDecision = classifier.shouldBlock(classification, userSettings);
console.log(blockingDecision);
// Output: {
//   should_block: true,
//   reason: 'Content matched: nsfw',
//   blocked_categories: [
//     {
//       category: 'nsfw',
//       label: 'NSFW Content',
//       confidence: 0.92,
//       threshold: 0.70
//     }
//   ]
// }
```

### Example 4: Load Profile

```javascript
const strictProfile = classifier.getProfileSettings('strict');
console.log(strictProfile);
// Output: {
//   categories: {
//     nsfw: true,
//     violence: true,
//     weapons: true,
//     gore: true,
//     disturbing: true
//   },
//   confidence_threshold: 0.75,
//   auto_unblur_timeout: 0
// }
```

## 🧪 Testing

### Test 1: Classification Accuracy

```javascript
const testCases = [
    { classIndex: 18, expectedCategory: 'nsfw' },    // Bikini
    { classIndex: 506, expectedCategory: 'weapons' }, // Rifle
    { classIndex: 788, expectedCategory: 'violence' },// War
];

testCases.forEach(test => {
    const result = classifier.classify(test.classIndex, 0.95);
    const matched = result.matched_categories.includes(test.expectedCategory);
    console.log(`${matched ? '✅' : '❌'} Class ${test.classIndex} → ${test.expectedCategory}`);
});
```

### Test 2: Settings Validation

```javascript
const invalidSettings = {
    confidence_threshold: 1.5, // Out of range
    categories: {
        invalid_cat: true      // Non-existent category
    }
};

const validation = classifier.validateSettings(invalidSettings);
console.log(validation);
// Output: {
//   valid: false,
//   errors: [
//     'confidence_threshold must be between 0 and 1',
//     'Unknown category: invalid_cat'
//   ]
// }
```

## 📊 Architecture Diagram

```
User Settings
    ↓
┌─────────────────────────┐
│  content.js             │
│  (sends CLASSIFY)       │
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│  sandbox.js             │
│  - Run inference        │
│  - Top-3 predictions    │
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│  classifier.js          │
│  - Map to categories    │
│  - Apply thresholds     │
│  - Generate verdict     │
└────────────┬────────────┘
             ↓
    Classification Result
    + Blocking Decision
             ↓
┌─────────────────────────┐
│  content.js             │
│  - Display verdict      │
│  - Blur/unblur image    │
│  - Log statistics       │
└─────────────────────────┘
```

## 🚀 Next Steps

1. **Implement popup UI** to display blocked categories
2. **Create settings page** with category toggles
3. **Add statistics dashboard** tracking blocked content
4. **Implement caching** using IndexedDB
5. **Add domain-level rules** for finer control

## 📚 Resources

- [ImageNet Class Reference](http://image-net.org/challenges/LSVRC/browse-lis-mapping-all.txt)
- [MobileNet Paper](https://arxiv.org/abs/1704.04861)
- [TensorFlow.js Predictions API](https://js.tensorflow.org/api/latest/#tf.Tensor3D.data)

---

**Created:** 2025-01-15  
**Status:** ✅ Ready for Implementation
