let habitModeActive = true;
let advancedModeActive = false;

// Initialize mode states
chrome.storage.sync.get(['habitModeActive', 'advancedModeActive'], (result) => {
    habitModeActive = result.habitModeActive !== false; // Default true
    advancedModeActive = result.advancedModeActive || false;
});

// Handle commands
chrome.commands.onCommand.addListener((command) => {
    switch (command) {
        case 'toggle_habit_mode':
            toggleHabitMode();
            break;
        case 'toggle_advanced_mode':
            toggleAdvancedMode();
            break;
    }
});

function toggleHabitMode() {
    habitModeActive = !habitModeActive;
    chrome.storage.sync.set({ habitModeActive });
    
    // Disable advanced mode if enabling habit mode
    if (habitModeActive && advancedModeActive) {
        advancedModeActive = false;
        chrome.storage.sync.set({ advancedModeActive });
    }
    
    sendModeUpdates();
}

function toggleAdvancedMode() {
    advancedModeActive = !advancedModeActive;
    chrome.storage.sync.set({ advancedModeActive });
    
    // Disable habit mode if enabling advanced mode
    if (advancedModeActive && habitModeActive) {
        habitModeActive = false;
        chrome.storage.sync.set({ habitModeActive });
    }
    
    sendModeUpdates();
    
    // Inject advanced mode script if needed
    if (advancedModeActive) {
        injectAdvancedMode();
    }
}

function sendModeUpdates() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            // First inject content scripts if they don't exist
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ['content/habit-mode.js']
            }).then(() => {
                // Then send messages
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "toggleHabitMode",
                    enabled: habitModeActive
                }).catch(err => console.log("Habit mode message not received (may be first load)"));

                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "toggleAdvancedMode",
                    enabled: advancedModeActive
                }).catch(err => console.log("Advanced mode message not received (may be first load)"));
            });
        }
    });
}

function injectAdvancedMode() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ['content/advanced-mode.js']
            }).catch(err => console.error("Advanced mode injection failed:", err));
        }
    });
}

// Handle API key storage
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "saveApiKey") {
        chrome.storage.sync.set({ llmApiKey: request.key }, () => {
            sendResponse({ success: true });
            
            // Notify content script about the new key
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length > 0) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "setApiKey",
                        key: request.key
                    }).catch(err => console.log("API key update not received"));
                }
            });
        });
        return true;
    }
    
    if (request.action === "getApiKey") {
        chrome.storage.sync.get(['llmApiKey'], (result) => {
            sendResponse({ key: result.llmApiKey });
        });
        return true;
    }

    // Add this to handle connection checks
    if (request.action === "ping") {
        sendResponse({ status: "alive" });
        return true;
    }
});

// Track tab changes to maintain mode state
chrome.tabs.onActivated.addListener((activeInfo) => {
    sendModeUpdates();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        sendModeUpdates();
    }
});