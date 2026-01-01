// Options page script
const DEFAULT_SETTINGS = {
    delay: 1200,
    batchSize: 20,
    batchDelay: 8000
};

const PRESETS = {
    safest: { delay: 1500, batchSize: 15, batchDelay: 10000 },
    recommended: { delay: 1200, batchSize: 20, batchDelay: 8000 },
    balanced: { delay: 1000, batchSize: 25, batchDelay: 6000 },
    aggressive: { delay: 800, batchSize: 30, batchDelay: 5000 }
};

// Load saved settings
function loadSettings() {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
        document.getElementById('delay').value = settings.delay;
        document.getElementById('batchSize').value = settings.batchSize;
        document.getElementById('batchDelay').value = settings.batchDelay;
        updateCalculations();
    });
}

// Save settings
function saveSettings() {
    const settings = {
        delay: parseInt(document.getElementById('delay').value),
        batchSize: parseInt(document.getElementById('batchSize').value),
        batchDelay: parseInt(document.getElementById('batchDelay').value)
    };

    chrome.storage.sync.set(settings, () => {
        showStatus('Settings saved successfully!', 'success');
        updateCalculations();
    });
}

// Reset to defaults
function resetSettings() {
    document.getElementById('delay').value = DEFAULT_SETTINGS.delay;
    document.getElementById('batchSize').value = DEFAULT_SETTINGS.batchSize;
    document.getElementById('batchDelay').value = DEFAULT_SETTINGS.batchDelay;
    updateCalculations();
}

// Apply preset
function applyPreset(preset) {
    const settings = PRESETS[preset];
    document.getElementById('delay').value = settings.delay;
    document.getElementById('batchSize').value = settings.batchSize;
    document.getElementById('batchDelay').value = settings.batchDelay;
    updateCalculations();
}

// Show status message
function showStatus(message, type) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    statusEl.style.display = 'block';
    
    setTimeout(() => {
        statusEl.style.display = 'none';
    }, 3000);
}

// Update calculations
function updateCalculations() {
    const delay = parseInt(document.getElementById('delay').value);
    const batchSize = parseInt(document.getElementById('batchSize').value);
    const batchDelay = parseInt(document.getElementById('batchDelay').value);

    // Calculate requests per second
    const avgDelay = ((delay * batchSize) + batchDelay) / (batchSize + 1);
    const reqPerSec = 1000 / avgDelay;
    document.getElementById('reqPerSec').textContent = reqPerSec.toFixed(2);

    // Calculate time for 100 users
    const time100 = ((delay * 99) + (Math.floor(99 / batchSize) * batchDelay)) / 1000;
    const min100 = Math.floor(time100 / 60);
    const sec100 = Math.round(time100 % 60);
    document.getElementById('time100').textContent = min100 > 0 ? `${min100}m ${sec100}s` : `${sec100}s`;

    // Calculate time for 800 users
    const time800 = ((delay * 799) + (Math.floor(799 / batchSize) * batchDelay)) / 1000;
    const min800 = Math.floor(time800 / 60);
    document.getElementById('time800').textContent = `${min800}m`;

    // Safety level
    const safetyEl = document.getElementById('safetyLevel');
    if (reqPerSec > 2.0) {
        safetyEl.textContent = 'Risky';
        safetyEl.style.color = '#d9534f';
    } else if (reqPerSec > 1.5) {
        safetyEl.textContent = 'Fast';
        safetyEl.style.color = '#ff9800';
    } else if (reqPerSec > 1.0) {
        safetyEl.textContent = 'Safe';
        safetyEl.style.color = '#5cb85c';
    } else {
        safetyEl.textContent = 'Very Safe';
        safetyEl.style.color = '#00a2ff';
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();

    document.getElementById('saveBtn').addEventListener('click', saveSettings);
    document.getElementById('resetBtn').addEventListener('click', resetSettings);

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = btn.getAttribute('data-preset');
            applyPreset(preset);
        });
    });

    // Update calculations on input change
    document.getElementById('delay').addEventListener('input', updateCalculations);
    document.getElementById('batchSize').addEventListener('input', updateCalculations);
    document.getElementById('batchDelay').addEventListener('input', updateCalculations);
});