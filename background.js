// background.js - Focus-Friendly Input Extension
// Service Worker for Manifest v3

// Global state
let habitModeActive = true;
let advancedModeActive = false;
let llmApiKey = '';

// Initialize extension state
async function initialize() {
  const data = await chrome.storage.sync.get([
    'habitModeActive', 
    'advancedModeActive',
    'llmApiKey'
  ]);
  
  habitModeActive = data.habitModeActive !== false;
  advancedModeActive = data.advancedModeActive || false;
  llmApiKey = data.llmApiKey || '';
}

// Check if we can access a tab's URL
function isAccessibleUrl(url) {
  try {
    const parsed = new URL(url);
    const allowedProtocols = ['http:', 'https:'];
    return allowedProtocols.includes(parsed.protocol);
  } catch {
    return false;
  }
}

// Inject necessary scripts
async function injectScripts(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/habit-mode.js']
    });
    
    if (advancedModeActive) {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/advanced-mode.js']
      });
    }
  } catch (error) {
    console.debug('Script injection skipped:', error.message);
  }
}

// Send current mode states to content scripts
async function sendModeUpdates(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, {
      action: "toggleHabitMode",
      enabled: habitModeActive
    });
    
    await chrome.tabs.sendMessage(tabId, {
      action: "toggleAdvancedMode",
      enabled: advancedModeActive
    });
    
    if (llmApiKey) {
      await chrome.tabs.sendMessage(tabId, {
        action: "setApiKey",
        key: llmApiKey
      });
    }
  } catch (error) {
    console.debug('Message passing failed:', error.message);
  }
}

// Handle mode toggling
async function toggleHabitMode() {
  habitModeActive = !habitModeActive;
  await chrome.storage.sync.set({ habitModeActive });
  
  if (habitModeActive && advancedModeActive) {
    advancedModeActive = false;
    await chrome.storage.sync.set({ advancedModeActive });
  }
  
  await updateActiveTab();
}

async function toggleAdvancedMode() {
  advancedModeActive = !advancedModeActive;
  await chrome.storage.sync.set({ advancedModeActive });
  
  if (advancedModeActive && habitModeActive) {
    habitModeActive = false;
    await chrome.storage.sync.set({ habitModeActive });
  }
  
  await updateActiveTab();
}

// Update the currently active tab
async function updateActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id || !isAccessibleUrl(tab.url)) return;
  
  await injectScripts(tab.id);
  await sendModeUpdates(tab.id);
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "saveApiKey":
      handleSaveApiKey(request.key, sendResponse);
      return true;
      
    case "getApiKey":
      sendResponse({ key: llmApiKey });
      return true;
      
    case "ping":
      sendResponse({ status: "active" });
      return true;
  }
});

async function handleSaveApiKey(key, sendResponse) {
  llmApiKey = key;
  await chrome.storage.sync.set({ llmApiKey });
  
  try {
    await updateActiveTab();
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Command handler
chrome.commands.onCommand.addListener(async (command) => {
  switch (command) {
    case 'toggle_habit_mode':
      await toggleHabitMode();
      break;
    case 'toggle_advanced_mode':
      await toggleAdvancedMode();
      break;
  }
});

// Tab event handlers
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await updateActiveTab();
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    await updateActiveTab();
  }
});

// Initialize
initialize().then(() => {
  console.log('Focus-Friendly Input initialized');
  updateActiveTab();
});