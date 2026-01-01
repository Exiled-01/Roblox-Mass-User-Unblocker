// Roblox Mass Unblock - Content Script
(function() {
    'use strict';

    // Default configuration
    const DEFAULT_SETTINGS = {
        delay: 1200,
        batchSize: 20,
        batchDelay: 8000
    };

    let settings = { ...DEFAULT_SETTINGS };
    let isRunning = false;
    let isPaused = false;
    let processedCount = 0;
    let cachedUserId = null;

    // Load settings from storage
    chrome.storage.sync.get(DEFAULT_SETTINGS, (savedSettings) => {
        settings = savedSettings;
        console.log('Loaded settings:', settings);
    });

    // Listen for settings changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync') {
            if (changes.delay) settings.delay = changes.delay.newValue;
            if (changes.batchSize) settings.batchSize = changes.batchSize.newValue;
            if (changes.batchDelay) settings.batchDelay = changes.batchDelay.newValue;
            console.log('Settings updated:', settings);
        }
    });

    // Get CSRF token
    function getCSRFToken() {
        const token = document.querySelector('meta[name="csrf-token"]');
        return token ? token.getAttribute('content') : null;
    }

    // Get current user ID
    async function getCurrentUserId() {
        if (cachedUserId) return cachedUserId;
        
        const metaUser = document.querySelector('meta[name="user-data"]');
        if (metaUser) {
            try {
                const userData = JSON.parse(metaUser.getAttribute('data-user'));
                if (userData && userData.userId) {
                    cachedUserId = userData.userId;
                    return cachedUserId;
                }
            } catch (e) {}
        }
        
        try {
            const response = await fetch('https://users.roblox.com/v1/users/authenticated', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                cachedUserId = data.id;
                return cachedUserId;
            }
        } catch (e) {
            console.error('Failed to get user ID:', e);
        }
        
        throw new Error('Could not get user ID. Make sure you are logged in.');
    }

    // Fetch blocked users
    async function getBlockedUsers(cursor = '') {
        const url = cursor 
            ? `https://apis.roblox.com/user-blocking-api/v1/users/get-blocked-users?cursor=${cursor}&count=50`
            : 'https://apis.roblox.com/user-blocking-api/v1/users/get-blocked-users?count=50';
        
        const response = await fetch(url, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch blocked users: ${response.status}`);
        }
        
        return await response.json();
    }

    // Unblock a single user
    async function unblockUser(targetUserId) {
        const csrfToken = getCSRFToken();
        
        const response = await fetch(`https://apis.roblox.com/user-blocking-api/v1/users/${targetUserId}/unblock-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken
            },
            credentials: 'include'
        });

        if (response.status === 403) {
            const newToken = response.headers.get('x-csrf-token');
            if (newToken) {
                document.querySelector('meta[name="csrf-token"]').setAttribute('content', newToken);
                return unblockUser(targetUserId);
            }
        }

        return response.ok;
    }

    // Sleep function
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Update UI
    function updateUI(message, type = 'info') {
        const statusEl = document.getElementById('mass-unblock-status');
        const progressEl = document.getElementById('mass-unblock-progress');
        
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.style.color = type === 'error' ? '#d9534f' : type === 'success' ? '#5cb85c' : '#666';
        }
        
        console.log(message);
    }

    // Toggle pause
    function togglePause() {
        isPaused = !isPaused;
        const pauseBtn = document.getElementById('mass-unblock-pause');
        if (pauseBtn) {
            pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
            pauseBtn.style.background = isPaused ? '#5cb85c' : '#ff9800';
        }
        updateUI(isPaused ? 'Paused' : 'Resuming...', isPaused ? 'info' : 'success');
    }

    // Main unblock function
    async function startUnblock() {
        if (isRunning) {
            alert('Already running!');
            return;
        }

        const startBtn = document.getElementById('mass-unblock-start');
        const pauseBtn = document.getElementById('mass-unblock-pause');
        const progressEl = document.getElementById('mass-unblock-progress');

        isRunning = true;
        isPaused = false;
        processedCount = 0;

        startBtn.disabled = true;
        startBtn.style.opacity = '0.5';
        pauseBtn.style.display = 'inline-block';

        try {
            updateUI('Fetching all blocked users...', 'info');
            
            let allBlockedUsers = [];
            let cursor = '';
            let hasMore = true;

            while (hasMore) {
                const result = await getBlockedUsers(cursor);
                const blockedUsers = result.data?.blockedUsers || [];
                allBlockedUsers = allBlockedUsers.concat(blockedUsers);
                cursor = result.data?.cursor || '';
                hasMore = cursor !== '' && cursor !== null;
                
                progressEl.textContent = `Found ${allBlockedUsers.length} users...`;
                await sleep(500);
            }

            const totalUsers = allBlockedUsers.length;
            updateUI(`Found ${totalUsers} blocked users. Starting unblock...`, 'success');
            progressEl.textContent = `0 / ${totalUsers}`;
            await sleep(1500);

            for (let i = 0; i < allBlockedUsers.length; i++) {
                while (isPaused) {
                    await sleep(100);
                }

                const user = allBlockedUsers[i];
                const userId = user.blockedUserId;
                
                try {
                    const success = await unblockUser(userId);
                    processedCount++;
                    
                    progressEl.textContent = `${processedCount} / ${totalUsers}`;
                    
                    if (success) {
                        updateUI(`Unblocked user ID: ${userId}`, 'success');
                    } else {
                        updateUI(`Failed user ID: ${userId}`, 'error');
                    }
                    
                    if ((i + 1) % settings.batchSize === 0 && i + 1 < totalUsers) {
                        updateUI(`Batch complete. Pausing for ${settings.batchDelay/1000}s... (${processedCount}/${totalUsers})`, 'info');
                        await sleep(settings.batchDelay);
                    } else {
                        await sleep(settings.delay);
                    }
                } catch (error) {
                    updateUI(`Error: User ID ${userId} - ${error.message}`, 'error');
                    await sleep(settings.delay);
                }
            }

            updateUI(`Complete! Successfully processed ${processedCount} users!`, 'success');
            
            setTimeout(() => {
                if (confirm('Mass unblock complete! Refresh page to see updated list?')) {
                    location.reload();
                }
            }, 2000);

        } catch (error) {
            updateUI(`Error: ${error.message}`, 'error');
            console.error('Mass unblock error:', error);
        } finally {
            isRunning = false;
            startBtn.disabled = false;
            startBtn.style.opacity = '1';
            pauseBtn.style.display = 'none';
        }
    }

    // Create UI
    function createUI() {
        if (!window.location.href.includes('BlockedUsers')) {
            return;
        }

        const existing = document.getElementById('mass-unblock-container');
        if (existing) return;

        const container = document.createElement('div');
        container.id = 'mass-unblock-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 400px;
            background: white;
            border: 2px solid #00a2ff;
            border-radius: 8px;
            padding: 20px;
            z-index: 999999;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        `;

        container.innerHTML = `
            <div style="text-align: center;">
                <h2 style="margin: 0 0 10px 0; color: #00a2ff; font-size: 20px;">Mass Unblock Tool</h2>
                <p style="font-size: 12px; color: #666; margin-bottom: 15px;">
                    <span id="settings-display">Loading settings...</span>
                    <br>
                    <a href="#" id="open-settings" style="color: #00a2ff; text-decoration: none; cursor: pointer;">Change Settings</a>
                </p>
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <button id="mass-unblock-start" style="
                        flex: 1;
                        padding: 12px;
                        background: #00a2ff;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 14px;
                    ">Start</button>
                    <button id="mass-unblock-pause" style="
                        display: none;
                        padding: 12px 20px;
                        background: #ff9800;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 14px;
                    ">Pause</button>
                    <button id="mass-unblock-close" style="
                        padding: 12px 20px;
                        background: #d9534f;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 14px;
                    ">Close</button>
                </div>
                <div id="mass-unblock-progress" style="
                    margin-bottom: 10px;
                    padding: 8px;
                    background: #f0f0f0;
                    border-radius: 4px;
                    font-size: 16px;
                    font-weight: bold;
                    color: #00a2ff;
                ">0 / 0</div>
                <div id="mass-unblock-status" style="
                    color: #666;
                    font-size: 13px;
                    min-height: 40px;
                    line-height: 1.4;
                ">Ready to start. Click "Start" to begin unblocking.</div>
            </div>
        `;

        document.body.appendChild(container);

        // Update settings display
        function updateSettingsDisplay() {
            const settingsDisplay = document.getElementById('settings-display');
            if (settingsDisplay) {
                settingsDisplay.textContent = `${settings.delay}ms delay, ${settings.batchSize} user batches`;
            }
        }
        updateSettingsDisplay();

        document.getElementById('mass-unblock-start').addEventListener('click', startUnblock);
        document.getElementById('mass-unblock-pause').addEventListener('click', togglePause);
        document.getElementById('mass-unblock-close').addEventListener('click', () => container.remove());
document.getElementById('open-settings').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(chrome.runtime.getURL('options.html'), '_blank');
});

        const startBtn = document.getElementById('mass-unblock-start');
        startBtn.addEventListener('mouseenter', () => {
            if (!startBtn.disabled) startBtn.style.background = '#0081cc';
        });
        startBtn.addEventListener('mouseleave', () => {
            if (!startBtn.disabled) startBtn.style.background = '#00a2ff';
        });

        console.log('Roblox Mass Unblock extension loaded!');
    }

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createUI);
    } else {
        setTimeout(createUI, 1000);
    }

    // Also watch for navigation changes (Roblox uses client-side routing)
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            setTimeout(createUI, 1000);
        }
    }).observe(document, { subtree: true, childList: true });

})();