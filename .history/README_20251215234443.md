# Zero-Trust AI Firewall

A Chrome Extension that uses TensorFlow.js and MobileNet to analyze and classify images on webpages in real-time, providing intelligent content filtering based on AI classification.

## Features

- **Real-time Image Classification**: Uses MobileNet v1 (0.25 224) for fast, accurate image recognition
- **Automatic Image Blurring**: Blurs images while processing, clears them after classification
- **Sandbox Isolation**: Runs model in isolated sandbox context for security
- **Zero-Trust Architecture**: Every image is analyzed before display
- **Lightweight**: ~2MB model size, optimized for browser performance

## Architecture

```
Content Script (content.js)
    ↓ (creates iframe)
    ├→ Sandbox HTML (sandbox.html)
        ↓
        Sandbox Script (sandbox.js)
        ├→ TensorFlow.js (tf.min.js)
        ├→ MobileNet Model (model.json + 55 weight shards)
        └→ Handles CLASSIFY messages → Returns VERDICT
    ↑ (postMessage communication)
    ├→ Listen for MODEL_LOADED
    └→ Listen for VERDICT
```

## Files

- **manifest.json** - Extension configuration (Manifest V3)
- **content.js** - Main content script, runs on all webpages
- **sandbox.js** - Model loading and inference engine (isolated context)
- **sandbox.html** - Sandbox iframe entry point
- **blur.css** - Styles for image blurring effect
- **model.json** - MobileNet topology definition
- **group1-shard1of1 through group55-shard1of1** - Pretrained weight files
- **tf.min.js** - TensorFlow.js library (2.2MB)
- **get_shards.py** - Downloads all weight shard files
- **imagenet_classes.js** - ImageNet class labels (1000 classes)

## Setup

### Installation

1. Clone this repository
2. Download model weights:
   ```bash
   python get_shards.py
   ```
3. Load extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top-right)
   - Click "Load unpacked"
   - Select this directory

### Dependencies

- Chrome Browser (latest)
- Python 3.x (for downloading weights)
- No npm dependencies required - all code is vanilla JavaScript

## How It Works

1. **Page Load**: Content script initializes and creates a hidden sandbox iframe
2. **Model Loading**: Sandbox loads MobileNet model (TensorFlow.js) and weight shards
3. **Image Detection**: Content script scans DOM for new images, blurs them
4. **Classification**: Sends image data to sandbox via postMessage
5. **Verdict**: Sandbox returns classification result (top class + confidence score)
6. **Display**: Content script unblurs image (or keeps blurred based on policy)

## Technical Details

### Custom IOHandler
The extension implements a custom TensorFlow.js IOHandler to load the model from `chrome-extension://` URLs, handling the 55 split weight files and properly parsing the model artifacts.

### Weight File Management
- Total of 55 weight shard files
- Total size: ~2MB
- Concatenated into single buffer for TensorFlow.js
- Byte offsets calculated from weightsManifest

### Sandbox Security
- Isolated JavaScript context
- Restricted API access (chrome.runtime not available)
- Communication only via postMessage
- Prevents model extraction/tampering

## Performance

- **Model Load Time**: ~3-5 seconds (first load)
- **Inference Time**: ~200-400ms per image
- **Memory**: ~50-100MB (TensorFlow.js + model weights)
- **Model Size**: 0.25x MobileNet (lightweight)

## Troubleshooting

### Model Not Loading
- Check DevTools Console for errors
- Verify all 55 group files are present
- Ensure `tf.min.js` is loaded
- Check that extension has `web_accessible_resources` for group* files

### Images Not Being Classified
- Verify MODEL_LOADED message appears in console
- Check that CLASSIFY messages are being sent
- Ensure sandbox.js is executing in iframe context
- Look for VERDICT messages in DevTools

### Performance Issues
- Reduce image classification frequency
- Use smaller model (currently using 0.25x MobileNet)
- Process images sequentially instead of parallel
- Limit to certain image sizes

## Future Enhancements

- [ ] Custom classification policies
- [ ] Caching of classification results
- [ ] User whitelist/blacklist for classes
- [ ] Statistics dashboard
- [ ] Support for video frame analysis
- [ ] Different model sizes (0.5x, 1.0x MobileNet)

## License

MIT

## Author

AI Firewall Team
