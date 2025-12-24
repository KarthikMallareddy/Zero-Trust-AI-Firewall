// popup.js - Zero-Trust AI Firewall Popup UI Logic
console.log('🎨 Popup UI initializing...');

// Initialize storage manager
const storage = new FirewallStorage();
let currentDomain = '';
let currentSettings = null;
let currentStats = null;

// Get current tab domain
async function getCurrentDomain() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url) {
            const url = new URL(tab.url);
            return url.hostname;
        }
    } catch (err) {
        console.error('Failed to get current domain:', err);
    }
    return 'unknown';
}

// Load and display all data
async function loadData() {
    try {
        // Get current domain
        currentDomain = await getCurrentDomain();
        
        // Load settings and stats
        currentSettings = await storage.getDomainSettings(currentDomain);
        currentStats = await storage.loadStats();
        
        // Update UI
        updateUI();
    } catch (err) {
        console.error('Failed to load data:', err);
        showError('Failed to load extension data');
    }
}

// Update the entire UI
function updateUI() {
    updateStatus();
    renderContent();
}

// Update status badge
function updateStatus() {
    const statusBadge = document.getElementById('statusBadge');
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');
    
    if (currentSettings.enabled) {
        statusBadge.className = 'status-badge active';
        statusIcon.textContent = '✅';
        statusText.textContent = 'Active';
    } else {
        statusBadge.className = 'status-badge inactive';
        statusIcon.textContent = '⏸️';
        statusText.textContent = 'Disabled';
    }
}

// Render main content
function renderContent() {
    const contentDiv = document.getElementById('content');
    
    // Get today's stats
    const todayStats = getTodayStats();
    
    // Calculate blocked by category for today
    const blockedCategories = Object.entries(currentStats.by_category || {})
        .filter(([cat, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]);
    
    contentDiv.innerHTML = `
        <div class="status">
            <!-- Stats Box -->
            <div class="stats-box">
                <div class="stats-title">📊 Today's Activity</div>
                <div class="stat-row">
                    <span class="stat-label">Images Scanned</span>
                    <span class="stat-value">${todayStats.scanned}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Images Blocked</span>
                    <span class="stat-value">${todayStats.blocked}</span>
                </div>
                ${blockedCategories.length > 0 ? `
                    <div class="category-chips">
                        ${blockedCategories.map(([cat, count]) => 
                            `<span class="chip blocked">${cat}: ${count}</span>`
                        ).join('')}
                    </div>
                ` : ''}
            </div>

            <!-- Domain Box -->
            <div class="domain-box">
                <div class="domain-label">Current Website</div>
                <div class="domain-name">🌐 ${currentDomain}</div>
            </div>

            <!-- All-time Stats -->
            <div class="stats-box">
                <div class="stats-title">📈 All-Time Stats</div>
                <div class="stat-row">
                    <span class="stat-label">Total Scanned</span>
                    <span class="stat-value">${currentStats.total_scanned || 0}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Total Blocked</span>
                    <span class="stat-value">${currentStats.total_blocked || 0}</span>
                </div>
            </div>

            <!-- Recent Blocks -->
            ${renderRecentBlocks()}
        </div>

        <div class="actions">
            ${currentSettings.enabled ? 
                `<button class="danger" id="toggleBtn">⏸️ Disable for this site</button>` :
                `<button class="primary" id="toggleBtn">✅ Enable for this site</button>`
            }
            
            ${!currentSettings.whitelisted ? 
                `<button id="whitelistBtn">➕ Whitelist ${currentDomain}</button>` :
                `<button class="danger" id="whitelistBtn">➖ Remove from Whitelist</button>`
            }
            
            <button id="settingsBtn">⚙️ Open Settings</button>
            <button id="resetStatsBtn">🔄 Reset Statistics</button>
        </div>

        <div class="footer">
            <a href="#" class="footer-link" id="aboutLink">About • Privacy • v2.0</a>
        </div>
    `;
    
    // Attach event listeners
    attachEventListeners();
}

// Get today's statistics (from domain-specific stats if available)
function getTodayStats() {
    const domainStats = currentStats.by_domain?.[currentDomain];
    if (domainStats) {
        return {
            scanned: domainStats.scanned || 0,
            blocked: domainStats.blocked || 0
        };
    }
    
    // Fallback to global stats (approximation)
    return {
        scanned: currentStats.total_scanned || 0,
        blocked: currentStats.total_blocked || 0
    };
}

// Render recent blocks section
function renderRecentBlocks() {
    const recentBlocks = currentStats.recent_blocks || [];
    
    if (recentBlocks.length === 0) {
        return '';  // Don't show section if no recent blocks
    }
    
    return `
        <div class="stats-box">
            <div class="stats-title">🚫 Recently Blocked (AI)</div>
            ${recentBlocks.slice(0, 5).map(block => {
                const timeAgo = getTimeAgo(block.timestamp);
                return `
                    <div class="stat-row">
                        <div style="display: flex; flex-direction: column; gap: 2px;">
                            <span class="stat-label">${block.category}</span>
                            <span style="font-size: 11px; opacity: 0.6;">${block.domain} • ${timeAgo}</span>
                        </div>
                        <span class="chip blocked">${block.confidence}%</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Get time ago string
function getTimeAgo(timestamp) {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

// Attach event listeners to buttons
function attachEventListeners() {
    // Toggle enable/disable
    document.getElementById('toggleBtn')?.addEventListener('click', async () => {
        try {
            // Toggle by adding/removing from whitelist (per-domain control)
            if (currentSettings.whitelisted) {
                await storage.removeWhitelistDomain(currentDomain);
                currentSettings.whitelisted = false;
            } else {
                await storage.whitelistDomain(currentDomain);
                currentSettings.whitelisted = true;
            }
            
            // Update enabled state to match whitelist status
            currentSettings.enabled = !currentSettings.whitelisted;
            updateUI();
            
            // Reload current tab to apply changes
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
                chrome.tabs.reload(tab.id);
            }
        } catch (err) {
            console.error('Failed to toggle status:', err);
            showError('Failed to update settings');
        }
    });
    
    // Whitelist/Remove whitelist
    document.getElementById('whitelistBtn')?.addEventListener('click', async () => {
        try {
            if (currentSettings.whitelisted) {
                await storage.removeWhitelistDomain(currentDomain);
                currentSettings.whitelisted = false;
            } else {
                await storage.whitelistDomain(currentDomain);
                currentSettings.whitelisted = true;
            }
            updateUI();
            
            // Reload current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
                chrome.tabs.reload(tab.id);
            }
        } catch (err) {
            console.error('Failed to update whitelist:', err);
            showError('Failed to update whitelist');
        }
    });
    
    // Open settings page
    document.getElementById('settingsBtn')?.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
    
    // Reset statistics
    document.getElementById('resetStatsBtn')?.addEventListener('click', async () => {
        if (confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
            try {
                await storage.resetStats();
                currentStats = await storage.loadStats();
                updateUI();
            } catch (err) {
                console.error('Failed to reset stats:', err);
                showError('Failed to reset statistics');
            }
        }
    });
    
    // About link
    document.getElementById('aboutLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ 
            url: 'https://github.com/KarthikMallareddy/Zero-Trust-AI-Firewall' 
        });
    });
}

// Show error message
function showError(message) {
    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = `
        <div class="status">
            <div class="stats-box">
                <div class="stat-label" style="text-align: center; color: #ff6b6b;">
                    ⚠️ ${message}
                </div>
            </div>
        </div>
    `;
}

// Listen for storage changes
storage.onSettingsChanged((newSettings) => {
    console.log('Settings changed, reloading UI...');
    loadData();
});

// Listen for real-time stats updates from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'STATS_UPDATED') {
        console.log('📊 Stats updated in real-time:', message);
        // Reload stats to show updated numbers
        loadData();
    }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎨 Popup loaded, fetching data...');
    loadData();
});
