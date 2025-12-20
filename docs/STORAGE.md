# Storage System Documentation

## Overview

The storage system manages all persistent data for the AI Firewall extension, including user preferences, domain-specific settings, and usage statistics.

## Architecture

```
StorageManager (js/storage.js)
    ↓
Chrome Storage API
    ├── chrome.storage.sync (Settings - synced across devices)
    └── chrome.storage.local (Statistics - local only)
```

## Key Features

### 1. **User Settings Management**
- Category toggles (NSFW, Violence, Weapons, Gore, Disturbing)
- Confidence thresholds per category
- Auto-unblur timeout
- Logging preferences
- UI customization

### 2. **Domain-Specific Rules**
- Whitelist domains (never scan)
- Blacklist domains (always scan)
- Per-domain custom settings
- Override global settings

### 3. **Statistics Tracking**
- Total images scanned/blocked
- Per-category breakdown
- Per-domain statistics
- Session tracking

### 4. **Import/Export**
- Backup all settings and stats
- Restore from backup
- Share configurations

## API Reference

### Loading Settings

```javascript
const storage = new StorageManager();

// Load global settings
const settings = await storage.loadSettings();

// Load domain-specific settings
const domainSettings = await storage.getDomainSettings('example.com');
```

### Saving Settings

```javascript
// Save complete settings object
await storage.saveSettings(settings);

// Update single setting
await storage.updateSetting('categories.nsfw', false);
await storage.updateSetting('confidence_threshold', 0.85);
```

### Domain Management

```javascript
// Add to whitelist
await storage.whitelistDomain('example.com');

// Remove from whitelist
await storage.removeWhitelistDomain('example.com');

// Get domain settings (checks whitelist and custom rules)
const settings = await storage.getDomainSettings('example.com');
```

### Statistics

```javascript
// Load statistics
const stats = await storage.loadStats();

// Increment counters (called after each image classification)
await storage.incrementStats('example.com', true, 'weapons');
// Parameters: domain, wasBlocked, category

// Reset statistics
await storage.resetStats();
```

### Import/Export

```javascript
// Export all data
const backup = await storage.exportData();
// Returns: { version, exported_at, settings, stats }

// Import data
await storage.importData(backup);
```

### Listen for Changes

```javascript
// Listen for settings changes (useful for popup/options page)
storage.onSettingsChanged((newSettings) => {
    console.log('Settings updated:', newSettings);
    // Update UI or reload configuration
});
```

## Default Settings Structure

```javascript
{
    enabled: true,
    
    categories: {
        nsfw: true,
        violence: true,
        weapons: true,
        gore: false,
        disturbing: false
    },
    
    category_thresholds: {
        nsfw: 0.70,
        violence: 0.75,
        weapons: 0.80,
        gore: 0.85,
        disturbing: 0.70
    },
    
    confidence_threshold: 0.70,  // Global fallback
    
    auto_unblur_timeout: 0,  // 0 = manual, >0 = milliseconds
    
    domain_rules: {
        whitelist: [],
        blacklist: [],
        per_domain: {}
    },
    
    logging: {
        enabled: true,
        verbose: false
    },
    
    ui: {
        show_confidence: true,
        show_category_label: true,
        blur_intensity: 20
    }
}
```

## Statistics Structure

```javascript
{
    total_scanned: 0,
    total_blocked: 0,
    
    by_category: {
        nsfw: 0,
        violence: 0,
        weapons: 0,
        gore: 0,
        disturbing: 0
    },
    
    by_domain: {
        'example.com': {
            scanned: 10,
            blocked: 2
        }
    },
    
    last_reset: '2025-12-16T10:30:00.000Z',
    session_start: '2025-12-16T10:30:00.000Z'
}
```

## Integration Examples

### In content.js

```javascript
const storage = new StorageManager();
const currentDomain = window.location.hostname;

// Load settings on startup
const userSettings = await storage.getDomainSettings(currentDomain);

// Check if scanning is enabled
if (!userSettings.enabled) {
    return; // Skip scanning on whitelisted domains
}

// After classification
await storage.incrementStats(currentDomain, wasBlocked, category);
```

### In popup.js (future)

```javascript
const storage = new StorageManager();

// Load and display current stats
const stats = await storage.loadStats();
document.getElementById('scanned-count').textContent = stats.total_scanned;
document.getElementById('blocked-count').textContent = stats.total_blocked;

// Toggle category
async function toggleCategory(categoryId) {
    await storage.updateSetting(`categories.${categoryId}`, !currentState);
}

// Whitelist current domain
const currentTab = await chrome.tabs.query({ active: true });
const domain = new URL(currentTab[0].url).hostname;
await storage.whitelistDomain(domain);
```

### In options.js (future)

```javascript
const storage = new StorageManager();

// Load all settings for display
const settings = await storage.loadSettings();

// Update threshold slider
document.getElementById('threshold-slider').addEventListener('change', async (e) => {
    await storage.updateSetting('confidence_threshold', parseFloat(e.target.value));
});

// Export backup
document.getElementById('export-btn').addEventListener('click', async () => {
    const data = await storage.exportData();
    // Download as JSON file
    downloadJSON(data, 'ai-firewall-backup.json');
});
```

## Testing

Use `test-storage.html` to test all storage functionality:

1. Open `chrome://extensions/`
2. Load the extension
3. Open `test-storage.html` in a new tab
4. Click buttons to test various storage operations
5. Check browser console for detailed logs

## Best Practices

1. **Always await storage operations** - They are asynchronous
2. **Use domain-specific settings** - Call `getDomainSettings()` instead of `loadSettings()`
3. **Merge with defaults** - Storage manager automatically merges with defaults
4. **Handle errors gracefully** - Storage operations can fail (e.g., quota exceeded)
5. **Don't store sensitive data** - All data is local but still be cautious

## Storage Limits

- **chrome.storage.sync**: 100 KB total, 8 KB per item
- **chrome.storage.local**: 5 MB total (can request more)

Current usage:
- Settings: ~2-5 KB
- Statistics: ~5-20 KB (grows with domains)

## Future Enhancements

- [ ] Compression for large statistics
- [ ] Automatic cleanup of old domain stats
- [ ] Cloud sync option (optional)
- [ ] Settings profiles (preset configurations)
- [ ] Scheduled backups
