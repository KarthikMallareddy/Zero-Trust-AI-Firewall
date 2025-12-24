/**
 * FirewallStorage - Handles all Chrome storage operations
 * Manages user preferences, domain settings, and statistics
 */

class FirewallStorage {
    constructor() {
        this.STORAGE_KEY = 'ai_firewall_settings';
        this.STATS_KEY = 'ai_firewall_stats';
        this.defaults = this.getDefaultSettings();
    }

    /**
     * Get default settings
     */
    getDefaultSettings() {
        return {
            // Global settings
            enabled: true,
            
            // Category toggles
            categories: {
                nsfw: true,
                violence: true,
                weapons: true,
                gore: false,
                disturbing: false
            },
            
            // Confidence thresholds per category (overrides category_mapping.json)
            category_thresholds: {
                nsfw: 0.70,
                violence: 0.75,
                weapons: 0.80,
                gore: 0.85,
                disturbing: 0.70
            },
            
            // Global confidence threshold (fallback)
            confidence_threshold: 0.70,
            
            // Auto-unblur settings
            auto_unblur_timeout: 0,  // 0 = manual, >0 = milliseconds
            
            // Domain-specific settings
            domain_rules: {
                whitelist: [],  // Domains to never scan
                blacklist: [],  // Domains to always scan (override whitelist)
                per_domain: {}  // { "example.com": { enabled: false, categories: {...} } }
            },
            
            // Logging settings
            logging: {
                enabled: true,
                verbose: false
            },
            
            // UI preferences
            ui: {
                show_confidence: true,
                show_category_label: true,
                blur_intensity: 20  // 1-30, CSS blur radius in px
            }
        };
    }

    /**
     * Get default statistics structure
     */
    getDefaultStats() {
        return {
            total_scanned: 0,
            total_blocked: 0,
            by_category: {
                nsfw: 0,
                violence: 0,
                weapons: 0,
                gore: 0,
                disturbing: 0
            },
            by_domain: {},  // { "example.com": { scanned: 10, blocked: 2 } }
            last_reset: new Date().toISOString(),
            session_start: new Date().toISOString()
        };
    }

    /**
     * Load all settings from Chrome storage
     * @returns {Promise<Object>} Settings object
     */
    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(this.STORAGE_KEY);
            const stored = result[this.STORAGE_KEY];
            
            if (!stored) {
                console.log('📦 No stored settings found, using defaults');
                return this.defaults;
            }
            
            // Merge with defaults to ensure all keys exist
            const settings = this.mergeWithDefaults(stored);
            console.log('📦 Settings loaded:', settings);
            return settings;
        } catch (error) {
            console.error('❌ Failed to load settings:', error);
            return this.defaults;
        }
    }

    /**
     * Save settings to Chrome storage
     * @param {Object} settings - Settings to save
     * @returns {Promise<boolean>} Success status
     */
    async saveSettings(settings) {
        try {
            await chrome.storage.sync.set({
                [this.STORAGE_KEY]: settings
            });
            console.log('💾 Settings saved successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to save settings:', error);
            return false;
        }
    }

    /**
     * Update specific setting without loading all
     * @param {string} path - Dot-separated path (e.g., "categories.nsfw")
     * @param {*} value - New value
     * @returns {Promise<boolean>} Success status
     */
    async updateSetting(path, value) {
        try {
            const settings = await this.loadSettings();
            const keys = path.split('.');
            let current = settings;
            
            // Navigate to nested property
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) {
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }
            
            // Set the value
            current[keys[keys.length - 1]] = value;
            
            return await this.saveSettings(settings);
        } catch (error) {
            console.error('❌ Failed to update setting:', error);
            return false;
        }
    }

    /**
     * Get settings for a specific domain
     * @param {string} domain - Domain name
     * @returns {Promise<Object>} Domain-specific settings
     */
    async getDomainSettings(domain) {
        const settings = await this.loadSettings();
        
        // Check if domain is whitelisted
        const isWhitelisted = settings.domain_rules.whitelist.includes(domain);
        
        if (isWhitelisted) {
            console.log('⚪ Domain is whitelisted (scanning disabled):', domain);
            return { ...settings, enabled: false, whitelisted: true };
        }
        
        // Check if domain has custom settings
        if (settings.domain_rules.per_domain[domain]) {
            console.log('⚙️ Using custom settings for domain:', domain);
            return {
                ...settings,
                ...settings.domain_rules.per_domain[domain],
                whitelisted: false
            };
        }
        
        console.log('✅ Using default settings for domain:', domain);
        return { ...settings, whitelisted: false };
    }

    /**
     * Add domain to whitelist
     * @param {string} domain - Domain to whitelist
     * @returns {Promise<boolean>} Success status
     */
    async whitelistDomain(domain) {
        const settings = await this.loadSettings();
        
        if (!settings.domain_rules.whitelist.includes(domain)) {
            settings.domain_rules.whitelist.push(domain);
            return await this.saveSettings(settings);
        }
        
        return true;
    }

    /**
     * Remove domain from whitelist
     * @param {string} domain - Domain to remove
     * @returns {Promise<boolean>} Success status
     */
    async removeWhitelistDomain(domain) {
        const settings = await this.loadSettings();
        settings.domain_rules.whitelist = settings.domain_rules.whitelist.filter(d => d !== domain);
        return await this.saveSettings(settings);
    }

    /**
     * Load statistics from storage
     * @returns {Promise<Object>} Statistics object
     */
    async loadStats() {
        try {
            const result = await chrome.storage.local.get(this.STATS_KEY);
            const stored = result[this.STATS_KEY];
            
            if (!stored) {
                return this.getDefaultStats();
            }
            
            return stored;
        } catch (error) {
            console.error('❌ Failed to load stats:', error);
            return this.getDefaultStats();
        }
    }

    /**
     * Save statistics to storage
     * @param {Object} stats - Statistics to save
     * @returns {Promise<boolean>} Success status
     */
    async saveStats(stats) {
        try {
            await chrome.storage.local.set({
                [this.STATS_KEY]: stats
            });
            return true;
        } catch (error) {
            console.error('❌ Failed to save stats:', error);
            return false;
        }
    }

    /**
     * Increment statistics counters
     * @param {string} domain - Current domain
     * @param {boolean} wasBlocked - Whether image was blocked
     * @param {string|null} category - Category that triggered block
     * @param {number} confidence - Confidence score (0-1)
     * @returns {Promise<Object>} Updated stats
     */
    async incrementStats(domain, wasBlocked, category = null, confidence = 0) {
        const stats = await this.loadStats();
        
        // Increment global counters
        stats.total_scanned++;
        if (wasBlocked) {
            stats.total_blocked++;
            
            // Increment category counter
            if (category && stats.by_category[category] !== undefined) {
                stats.by_category[category]++;
            }
        }
        
        // Increment domain counters
        if (!stats.by_domain[domain]) {
            stats.by_domain[domain] = { scanned: 0, blocked: 0 };
        }
        stats.by_domain[domain].scanned++;
        if (wasBlocked) {
            stats.by_domain[domain].blocked++;
        }
        
        // Track recent blocks for popup display
        if (wasBlocked && category) {
            if (!stats.recent_blocks) stats.recent_blocks = [];
            stats.recent_blocks.unshift({
                domain,
                category,
                confidence: Math.round(confidence * 100),
                timestamp: new Date().toISOString()
            });
            // Keep only last 20 blocks
            stats.recent_blocks = stats.recent_blocks.slice(0, 20);
        }
        
        await this.saveStats(stats);
        return stats;
    }

    /**
     * Reset statistics
     * @returns {Promise<boolean>} Success status
     */
    async resetStats() {
        const newStats = this.getDefaultStats();
        return await this.saveStats(newStats);
    }

    /**
     * Export all settings and stats as JSON
     * @returns {Promise<Object>} All data
     */
    async exportData() {
        const settings = await this.loadSettings();
        const stats = await this.loadStats();
        
        return {
            version: '2.0',
            exported_at: new Date().toISOString(),
            settings,
            stats
        };
    }

    /**
     * Import settings and stats from JSON
     * @param {Object} data - Data to import
     * @returns {Promise<boolean>} Success status
     */
    async importData(data) {
        try {
            if (data.settings) {
                await this.saveSettings(data.settings);
            }
            if (data.stats) {
                await this.saveStats(data.stats);
            }
            return true;
        } catch (error) {
            console.error('❌ Failed to import data:', error);
            return false;
        }
    }

    /**
     * Merge stored settings with defaults (ensures all keys exist)
     * @param {Object} stored - Stored settings
     * @returns {Object} Merged settings
     */
    mergeWithDefaults(stored) {
        const merged = JSON.parse(JSON.stringify(this.defaults));
        
        // Deep merge function
        const deepMerge = (target, source) => {
            for (const key in source) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    if (!target[key]) target[key] = {};
                    deepMerge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        };
        
        deepMerge(merged, stored);
        return merged;
    }

    /**
     * Listen for storage changes
     * @param {Function} callback - Called when settings change
     */
    onSettingsChanged(callback) {
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'sync' && changes[this.STORAGE_KEY]) {
                const newSettings = changes[this.STORAGE_KEY].newValue;
                callback(newSettings);
            }
        });
    }
}

// Export for use in different contexts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirewallStorage;
}
