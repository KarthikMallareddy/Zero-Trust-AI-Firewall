// options.js - Settings Page Logic
console.log('⚙️ Options page loading...');

const storage = new FirewallStorage();
let currentSettings = null;

// Load settings on page load
async function loadSettings() {
    try {
        currentSettings = await storage.loadSettings();
        console.log('📦 Settings loaded:', currentSettings);
        updateUI();
    } catch (err) {
        console.error('Failed to load settings:', err);
        showToast('Failed to load settings', 'error');
    }
}

// Update UI with current settings
function updateUI() {
    // Master toggle
    document.getElementById('masterToggle').checked = currentSettings.enabled;

    // Category toggles
    document.getElementById('cat_nsfw').checked = currentSettings.categories.nsfw;
    document.getElementById('cat_violence').checked = currentSettings.categories.violence;
    document.getElementById('cat_weapons').checked = currentSettings.categories.weapons;
    document.getElementById('cat_gore').checked = currentSettings.categories.gore;
    document.getElementById('cat_disturbing').checked = currentSettings.categories.disturbing;

    // Confidence threshold
    const threshold = Math.round(currentSettings.confidence_threshold * 100);
    document.getElementById('confidenceThreshold').value = threshold;
    document.getElementById('confidenceValue').textContent = threshold + '%';

    // Whitelist
    updateWhitelistUI();
}

// Update whitelist display
function updateWhitelistUI() {
    const container = document.getElementById('whitelistContainer');
    const whitelist = currentSettings.domain_rules.whitelist;

    if (whitelist.length === 0) {
        container.innerHTML = '<div class="empty-state">No whitelisted domains</div>';
        return;
    }

    container.innerHTML = whitelist.map(domain => `
        <div class="domain-item">
            <span class="domain-name">${domain}</span>
            <button class="remove-btn" onclick="removeDomain('${domain}')">Remove</button>
        </div>
    `).join('');
}

// Remove domain from whitelist
async function removeDomain(domain) {
    try {
        await storage.removeWhitelistDomain(domain);
        currentSettings.domain_rules.whitelist = currentSettings.domain_rules.whitelist.filter(d => d !== domain);
        updateWhitelistUI();
        showToast('Domain removed from whitelist');
    } catch (err) {
        console.error('Failed to remove domain:', err);
        showToast('Failed to remove domain', 'error');
    }
}

// Save settings
async function saveSettings() {
    try {
        // Update settings object
        currentSettings.enabled = document.getElementById('masterToggle').checked;
        
        currentSettings.categories.nsfw = document.getElementById('cat_nsfw').checked;
        currentSettings.categories.violence = document.getElementById('cat_violence').checked;
        currentSettings.categories.weapons = document.getElementById('cat_weapons').checked;
        currentSettings.categories.gore = document.getElementById('cat_gore').checked;
        currentSettings.categories.disturbing = document.getElementById('cat_disturbing').checked;

        const threshold = parseInt(document.getElementById('confidenceThreshold').value);
        currentSettings.confidence_threshold = threshold / 100;

        // Save to storage
        const success = await storage.saveSettings(currentSettings);
        
        if (success) {
            showToast('Settings saved successfully!');
            console.log('✅ Settings saved:', currentSettings);
        } else {
            showToast('Failed to save settings', 'error');
        }
    } catch (err) {
        console.error('Failed to save settings:', err);
        showToast('Failed to save settings', 'error');
    }
}

// Reset to defaults
async function resetToDefaults() {
    if (!confirm('Are you sure you want to reset all settings to defaults? This will clear your whitelist.')) {
        return;
    }

    try {
        currentSettings = storage.getDefaultSettings();
        const success = await storage.saveSettings(currentSettings);
        
        if (success) {
            updateUI();
            showToast('Settings reset to defaults');
            console.log('✅ Settings reset to defaults');
        } else {
            showToast('Failed to reset settings', 'error');
        }
    } catch (err) {
        console.error('Failed to reset settings:', err);
        showToast('Failed to reset settings', 'error');
    }
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.background = type === 'error' ? '#dc3545' : '#28a745';
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();

    // Save button
    document.getElementById('saveBtn').addEventListener('click', saveSettings);

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', resetToDefaults);

    // Confidence slider
    document.getElementById('confidenceThreshold').addEventListener('input', (e) => {
        document.getElementById('confidenceValue').textContent = e.target.value + '%';
    });

    // Keyboard shortcut (Ctrl+S to save)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveSettings();
        }
    });
});

// Make removeDomain available globally
window.removeDomain = removeDomain;
