# 🚀 Quick Start: Testing the Storage System

## Step 1: Reload the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Find **Zero-Trust AI Firewall**
3. Click the **🔄 Reload** button
4. Verify no errors appear

## Step 2: Verify Storage Integration

1. Open any webpage (e.g., google.com)
2. Open **DevTools** (F12)
3. Go to **Console** tab
4. Look for these messages:
   ```
   🛡️ AI Firewall: Initializing...
   📦 Loaded settings for domain: google.com
   📦 No stored settings found, using defaults
   ✅ Bridge Built. Starting Scanner...
   ```

## Step 3: Test Storage Directly

Open the browser console on any page and try these commands:

### Load Current Settings
```javascript
const storage = new StorageManager();
const settings = await storage.loadSettings();
console.log(settings);
```

### Save Settings
```javascript
const storage = new StorageManager();
await storage.updateSetting('categories.nsfw', false);
console.log('✅ NSFW category disabled');
```

### Whitelist Current Domain
```javascript
const storage = new StorageManager();
await storage.whitelistDomain(window.location.hostname);
console.log('✅ Domain whitelisted');
// Reload page - extension should skip scanning
```

### Check Statistics
```javascript
const storage = new StorageManager();
const stats = await storage.loadStats();
console.log(stats);
```

## Step 4: Use Test Page

1. Open `test-storage.html` in Chrome
2. Click various buttons to test all features:
   - **Load Current Settings** - View stored preferences
   - **Toggle NSFW** - Enable/disable category
   - **Whitelist Current Domain** - Add to whitelist
   - **Load Statistics** - View tracking data
   - **Export Data** - Download backup JSON

## Step 5: Verify Persistence

1. Change a setting (e.g., disable NSFW category)
2. Close and reopen Chrome
3. Check settings again - they should be saved!

```javascript
const storage = new StorageManager();
const settings = await storage.loadSettings();
console.log('NSFW enabled:', settings.categories.nsfw);
// Should show false if you disabled it
```

## Common Test Scenarios

### Scenario 1: Disable Extension on Specific Domain
```javascript
// On example.com
const storage = new StorageManager();
await storage.whitelistDomain('example.com');
// Reload page - no images will be scanned
```

### Scenario 2: Adjust Confidence Threshold
```javascript
const storage = new StorageManager();
await storage.updateSetting('confidence_threshold', 0.90);
// Now only 90%+ confident predictions will block
```

### Scenario 3: View Statistics
```javascript
const storage = new StorageManager();
const stats = await storage.loadStats();
console.log('Total scanned:', stats.total_scanned);
console.log('Total blocked:', stats.total_blocked);
console.log('By category:', stats.by_category);
```

### Scenario 4: Export and Import
```javascript
// Export
const storage = new StorageManager();
const backup = await storage.exportData();
console.log('Backup:', backup);

// Import (on another browser/device)
await storage.importData(backup);
console.log('✅ Settings restored');
```

## Expected Behavior

### Before Storage (Old Behavior):
- ❌ Settings reset on browser restart
- ❌ No way to whitelist domains
- ❌ No statistics tracking
- ❌ Same settings for all websites

### After Storage (New Behavior):
- ✅ Settings persist across sessions
- ✅ Can whitelist trusted domains
- ✅ Statistics tracked per domain
- ✅ Different settings per website possible

## Troubleshooting

### Settings Not Saving
```javascript
// Check if storage permission is granted
chrome.storage.sync.getBytesInUse(null, (bytes) => {
    console.log('Storage used:', bytes, 'bytes');
});
```

### Statistics Not Updating
- Check console for errors
- Verify `incrementStats()` is called in content.js
- Look for "Failed to save stats" errors

### Whitelist Not Working
```javascript
// Check domain settings
const storage = new StorageManager();
const settings = await storage.getDomainSettings(window.location.hostname);
console.log('Is enabled?', settings.enabled);
// Should be false if whitelisted
```

## Next Steps

Once storage is working:
1. ✅ Settings persist - Verified
2. ✅ Domain rules work - Verified
3. ✅ Statistics track - Verified
4. 🎯 **Build Popup UI** - Next task
5. 🎯 **Build Options Page** - After popup

## Support

If something doesn't work:
1. Check browser console for errors
2. Verify extension reloaded properly
3. Check `manifest.json` has `storage` permission
4. Look at `docs/STORAGE.md` for detailed API docs
