# 🛡️ Zero-Trust AI Firewall

A privacy-first Chrome extension that filters web content using local AI - no data ever leaves your browser.

![Version](https://img.shields.io/badge/version-2.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Privacy](https://img.shields.io/badge/privacy-100%25%20local-brightgreen)

##  Features

-  **100% Privacy**: All AI processing happens locally on your device
-  **Smart Image Filtering**: Automatically blur and filter images on any website
-  **Customizable Categories**: Toggle content categories and adjust sensitivity
-  **Real-time Statistics**: Track scanned and blocked images
-  **Domain Control**: Whitelist trusted websites
-  **Sync Settings**: Settings sync across your Chrome browsers
-  **Fast & Lightweight**: ~2MB model, works offline

##  Installation

### From Source
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked**
5. Select the `AI-Firewall` folder

##  Usage

### Getting Started
1. Install the extension
2. Click the extension icon to view dashboard
3. Browse any website - images will be automatically filtered
4. Click **⚙️ Open Settings** to customize filtering rules

### Features Overview

**Popup Dashboard:**
- View today's scanning statistics
- See blocked content categories
- Access settings and whitelist management
- Quick enable/disable for current site

**Settings Page:**
- Master on/off switch
- Category toggles (NSFW, violence, weapons, gore, disturbing)
- Confidence threshold slider (50%-95%)
- Whitelist domain management
- Reset to defaults option

##  Technology Stack

- **AI Model**: MobileNet v1 (TensorFlow.js)
- **Processing**: 100% local, sandboxed iframe execution
- **Storage**: Chrome Sync API for cross-device settings
- **Privacy**: Zero data collection, zero external requests
- **Security**: Content Security Policy, sandboxed execution

##  How It Works

```
1. Page Loads → All images start blurred (blur.css)
2. Content Script → Detects images, creates sandboxed iframe
3. Sandbox → Loads TensorFlow.js + MobileNet model
4. Scanner → Sends image data to sandbox every 2 seconds
5. AI Model → Analyzes image, returns classification
6. Decision → Block (keep blurred) or Reveal (remove blur)
7. Storage → Update statistics, notify popup
```

##  Project Structure

```
AI-Firewall/
├── manifest.json              # Chrome extension configuration
├── content.js                 # Main content script (image scanning)
├── sandbox.html               # Sandboxed AI execution environment
├── sandbox.js                 # TensorFlow model loading & inference
├── popup.html                 # Extension popup UI
├── popup.js                   # Popup logic and statistics
├── options.html               # Settings page UI
├── options.js                 # Settings page logic
├── blur.css                   # Image blur CSS styles
├── clear-whitelist.html       # Whitelist management tool
├── js/
│   ├── storage.js            # Chrome Storage API wrapper
│   └── classifier.js         # AI classification logic
├── data/
│   └── category_mapping.json # ImageNet class mappings
├── icons/                     # Extension icons
├── model.json                 # MobileNet model topology
├── group1-shard1of1 ... group55-shard1of1  # Model weights
└── tf.min.js                  # TensorFlow.js library
```

## ⚠️ Important Information

### What This Extension Does Well 
- Blocks specific detected objects based on ImageNet classes
- Provides customizable filtering rules
- Ensures complete privacy (all local processing)
- Works offline after initial model load
- Lightweight and fast performance

### Limitations ⚠️
- **Limited Accuracy**: MobileNet is trained for general object detection, not content moderation
- **NSFW Detection**: Not reliable for adult content (would need specialized model)
- **Violence/Gore**: Limited ability to detect graphic content
- **CORS Restrictions**: Cannot analyze images from different domains due to browser security
- **False Positives/Negatives**: AI model may incorrectly classify some images

### Best Use Cases 💡
- Learning project / portfolio demonstration
- General content filtering with custom rules
- Blocking specific object categories (cars, phones, food, etc.)
- Privacy-conscious browsing
- Understanding how local AI works in browsers

### Not Recommended For ❌
- Reliable parental controls (use dedicated solutions)
- Enterprise content filtering (use professional tools)
- Critical content moderation (AI accuracy too low)

##  Privacy Policy

**We collect ZERO data. Period.**

- ✅ No analytics or tracking
- ✅ No data sent to external servers
- ✅ All AI processing happens in your browser
- ✅ No account or login required
- ✅ Settings stored locally in Chrome
- ✅ Open source - verify yourself

## 🛠️ Technical Details

### Performance
- **Model Size**: ~2MB (MobileNet v1 0.25x)
- **Initial Load**: 2-3 seconds
- **Per-Image Analysis**: 50-200ms
- **Memory Usage**: ~100-150MB
- **CPU Usage**: Minimal (async processing)

### Browser Compatibility
- Chrome 88+
- Chromium-based browsers (Edge, Brave, Opera)
- Requires JavaScript enabled

### Security
- Sandboxed iframe execution (CSP enforced)
- No eval() or unsafe inline scripts
- Manifest V3 compliance
- Minimal permissions requested

## 🐛 Known Issues

1. **CORS Errors**: Many websites block cross-origin image reading (browser security feature)
2. **Model Accuracy**: MobileNet wasn't designed for content moderation
3. **Performance**: High-resolution images may take longer to process
4. **Compatibility**: Some websites may have display issues with blurred images

##  Statistics & Analytics

All statistics are stored **locally only**:
- Total images scanned
- Total images blocked
- Breakdown by category
- Per-domain statistics
- Recent blocks history (last 20)

**No data leaves your browser!**

##  Contributing

This is a student/learning project. Suggestions and feedback welcome!

To contribute:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

MIT License - Feel free to use, modify, and distribute

## 🎓 Educational Purpose

This project demonstrates:
- Chrome Extension development (Manifest V3)
- TensorFlow.js integration in browser
- Sandboxed execution for security
- Chrome Storage API usage
- Real-time AI inference
- Privacy-preserving design

## 💡 Future Ideas

- [ ] Keyword-based text filtering
- [ ] Focus mode with timer
- [ ] Screen time analytics dashboard
- [ ] Export/import settings
- [ ] Performance optimizations
- [ ] Better model (if found)

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing issues first
- Provide browser version and screenshots

## 🙏 Acknowledgments

- TensorFlow.js team for the amazing library
- MobileNet model creators
- Chrome Extensions documentation
- Open source community

---

**⚡ Made as a learning project | 100% Local AI | Privacy First | No Tracking**

**Note**: This extension is a proof-of-concept and educational tool. For production content filtering, consider professional solutions with specialized models.
