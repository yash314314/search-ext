// ui/popup.js
document.addEventListener('DOMContentLoaded', () => {
    // Safely get all elements with null checks
    const getElement = (id) => {
        const el = document.getElementById(id);
        if (!el) console.error(`Element with ID ${id} not found`);
        return el;
    };

    // Elements with null checks
    const habitModeBtn = getElement('habit-mode-btn');
    const advancedModeBtn = getElement('advanced-mode-btn');
    const habitModePanel = getElement('habit-mode-settings');
    const advancedModePanel = getElement('advanced-mode-settings');
    const habitModeToggle = getElement('habit-mode-toggle');
    const advancedModeToggle = getElement('advanced-mode-toggle');
    const apiKeyInput = getElement('api-key');
    const saveApiKeyBtn = getElement('save-api-key');
    const optimizationLevel = getElement('optimization-level');
    const customOptions = getElement('custom-options');
    const habitPosition = getElement('habit-position');

    // Only proceed if essential elements exist
    if (!habitModeToggle || !advancedModeToggle || !apiKeyInput || !saveApiKeyBtn) {
        showStatus('Critical UI elements missing', 'error');
        return;
    }

    // Load settings with error handling
    chrome.storage.sync.get([
        'habitModeActive',
        'advancedModeActive',
        'llmApiKey',
        'habitPosition',
        'optimizationLevel',
        'customOptions'
    ], (result) => {
        try {
            // Set mode states
            if (habitModeToggle) habitModeToggle.checked = result.habitModeActive !== false;
            if (advancedModeToggle) advancedModeToggle.checked = result.advancedModeActive || false;
            
            // Set API key
            if (apiKeyInput) apiKeyInput.value = result.llmApiKey || '';
            
            // Set habit position
            if (habitPosition && result.habitPosition) {
                habitPosition.value = result.habitPosition;
            }
            
            // Set optimization level
            if (optimizationLevel && result.optimizationLevel) {
                optimizationLevel.value = result.optimizationLevel;
                toggleCustomOptions(result.optimizationLevel === 'custom');
            }
            
            // Set custom options if they exist
            if (customOptions && result.customOptions) {
                const reposition = getElement('opt-reposition');
                const group = getElement('opt-group');
                const summarize = getElement('opt-summarize');
                
                if (reposition) reposition.checked = result.customOptions.reposition;
                if (group) group.checked = result.customOptions.group;
                if (summarize) summarize.checked = result.customOptions.summarize;
            }
            
            // Set active panel
            if (advancedModeToggle.checked) {
                switchToAdvancedMode();
            } else {
                switchToHabitMode();
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            showStatus('Error loading settings', 'error');
        }
    });

    // Event listeners with null checks
    if (habitModeBtn) habitModeBtn.addEventListener('click', switchToHabitMode);
    if (advancedModeBtn) advancedModeBtn.addEventListener('click', switchToAdvancedMode);

    if (habitModeToggle) {
        habitModeToggle.addEventListener('change', () => {
            chrome.runtime.sendMessage({
                action: "toggleHabitMode",
                enabled: habitModeToggle.checked
            });
            if (habitModeToggle.checked && advancedModeToggle.checked) {
                advancedModeToggle.checked = false;
                chrome.runtime.sendMessage({
                    action: "toggleAdvancedMode",
                    enabled: false
                });
                switchToHabitMode();
            }
        });
    }

    if (advancedModeToggle) {
        advancedModeToggle.addEventListener('change', () => {
            chrome.runtime.sendMessage({
                action: "toggleAdvancedMode",
                enabled: advancedModeToggle.checked
            });
            if (advancedModeToggle.checked && habitModeToggle.checked) {
                habitModeToggle.checked = false;
                chrome.runtime.sendMessage({
                    action: "toggleHabitMode",
                    enabled: false
                });
                switchToAdvancedMode();
            }
        });
    }

    if (saveApiKeyBtn) {
        saveApiKeyBtn.addEventListener('click', () => {
            const apiKey = apiKeyInput.value.trim();
            if (apiKey) {
                chrome.runtime.sendMessage({
                    action: "saveApiKey",
                    key: apiKey
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        showStatus(chrome.runtime.lastError.message, 'error');
                        return;
                    }
                    showStatus(response?.success ? 'API key saved' : 'Failed to save', 
                              response?.success ? 'success' : 'error');
                });
            }
        });
    }

    if (optimizationLevel) {
        optimizationLevel.addEventListener('change', () => {
            const level = optimizationLevel.value;
            chrome.storage.sync.set({ optimizationLevel: level });
            toggleCustomOptions(level === 'custom');
        });
    }

    // Helper functions
    function switchToHabitMode() {
        if (habitModeBtn && advancedModeBtn && habitModePanel && advancedModePanel) {
            habitModeBtn.classList.add('active');
            advancedModeBtn.classList.remove('active');
            habitModePanel.classList.remove('hidden');
            advancedModePanel.classList.add('hidden');
        }
    }

    function switchToAdvancedMode() {
        if (habitModeBtn && advancedModeBtn && habitModePanel && advancedModePanel) {
            advancedModeBtn.classList.add('active');
            habitModeBtn.classList.remove('active');
            advancedModePanel.classList.remove('hidden');
            habitModePanel.classList.add('hidden');
        }
    }

    function toggleCustomOptions(show) {
        if (!customOptions) return;
        customOptions.classList.toggle('hidden', !show);
    }

    function showStatus(message, type) {
        const status = document.createElement('div');
        status.className = `status-message ${type}`;
        status.textContent = message;
        document.body.appendChild(status);
        setTimeout(() => status.remove(), 3000);
    }
});