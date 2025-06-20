let habitModeActive = true;
let advancedModeActive = false;
let llmApiKey = '';

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

function isAccessibleUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}


async function setIfChanged(key, newValue) {
  const data = await chrome.storage.sync.get(key);
  if (data[key] !== newValue) {
    await chrome.storage.sync.set({ [key]: newValue });
    return true;
  }
  return false;
}


async function removeAllScripts(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        if (window.habitModeEnabled !== undefined) {
          window.habitModeEnabled = false;
          if (window.floatingInput) {
            window.floatingInput.remove();
            window.floatingInput = null;
          }
        }
      
      }
    });
  } catch (error) {
    console.debug('Script cleanup failed:', error.message);
  }
}


async function injectScripts(tabId) {
  try {
    await removeAllScripts(tabId);

    if (habitModeActive) {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/habit-mode.js']
      });
    }

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


async function updateActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id || !isAccessibleUrl(tab.url)) return;

  await injectScripts(tab.id);
  await sendModeUpdates(tab.id);
}


async function toggleHabitMode(enabled) {
  const data = await chrome.storage.sync.get(['habitModeActive', 'advancedModeActive']);

  const updates = [];

  if (data.habitModeActive !== enabled) {
    habitModeActive = enabled;
    updates.push(setIfChanged('habitModeActive', enabled));
  }

  if (enabled && data.advancedModeActive) {
    advancedModeActive = false;
    updates.push(setIfChanged('advancedModeActive', false));
  }

  await Promise.all(updates);
  await updateActiveTab();
  return { success: true };
}

async function toggleAdvancedMode(enabled) {
  const data = await chrome.storage.sync.get(['habitModeActive', 'advancedModeActive']);

  const updates = [];

  if (data.advancedModeActive !== enabled) {
    advancedModeActive = enabled;
    updates.push(setIfChanged('advancedModeActive', enabled));
  }

  if (enabled && data.habitModeActive) {
    habitModeActive = false;
    updates.push(setIfChanged('habitModeActive', false));
  }

  await Promise.all(updates);
  await updateActiveTab();
  return { success: true };
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    switch (request.action) {
      case "saveApiKey":
        if (llmApiKey !== request.key) {
          llmApiKey = request.key;
          await setIfChanged('llmApiKey', llmApiKey);
          await updateActiveTab();
        }
        sendResponse({ success: true });
        break;

      case "getApiKey":
        sendResponse({ key: llmApiKey });
        break;

      case "ping":
        sendResponse({ status: "active" });
        break;

      case "toggleHabitMode":
        sendResponse(await toggleHabitMode(request.enabled));
        break;

      case "toggleAdvancedMode":
        sendResponse(await toggleAdvancedMode(request.enabled));
        break;

      default:
        sendResponse({ success: false, error: "Unknown action" });
        break;
    }
  })();
  return true;
});


chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle_habit_mode') {
    await toggleHabitMode(!habitModeActive);
  } else if (command === 'toggle_advanced_mode') {
    await toggleAdvancedMode(!advancedModeActive);
  }
});


chrome.tabs.onActivated.addListener(updateActiveTab);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    updateActiveTab();
  }
});


initialize().then(() => {
  console.log('Focus-Friendly Input initialized from background.js');
  updateActiveTab();
});
