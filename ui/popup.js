document.addEventListener('DOMContentLoaded', async () => {
  const getElement = (id) => document.getElementById(id);


  const habitModeBtn = getElement('habit-mode-btn');
  const advancedModeBtn = getElement('advanced-mode-btn');
  const habitModePanel = getElement('habit-mode-settings');
  const advancedModePanel = getElement('advanced-mode-settings');
  const habitModeToggle = getElement('habit-mode-toggle');
  const advancedModeToggle = getElement('advanced-mode-toggle');
  const apiKeyInput = getElement('api-key');
  const saveApiKeyBtn = getElement('save-api-key');
  const optimizationLevel = getElement('optimization-level');
  const habitPosition = getElement('habit-position');

  const customPromptContainer = getElement('custom-prompt-container');
  const customPromptTextarea = getElement('custom-prompt-textarea');
  const customPromptSave = getElement('custom-prompt-save');
  const customPromptCancel = getElement('custom-prompt-cancel');


  let isCustomModeActive = false;


  async function loadInitialState() {
    try {
      const result = await chrome.storage.sync.get([
        'habitModeActive',
        'advancedModeActive',
        'llmApiKey',
        'habitPosition',
        'optimizationLevel',
        'customPrompt'
      ]);


      habitModeToggle.checked = result.habitModeActive !== false;
      advancedModeToggle.checked = result.advancedModeActive || false;
      apiKeyInput.value = result.llmApiKey || '';

  
      if (habitPosition && result.habitPosition) {
        habitPosition.value = result.habitPosition;
      }

      if (optimizationLevel && result.optimizationLevel) {
        optimizationLevel.value = result.optimizationLevel;
        isCustomModeActive = result.optimizationLevel === 'custom';
        toggleCustomPrompt(isCustomModeActive);
      }

      if (result.customPrompt) {
        customPromptTextarea.value = result.customPrompt;
      }

     
      if (advancedModeToggle.checked) {
        switchToAdvancedMode();
      } else {
        switchToHabitMode();
      }
    } catch (e) {
      showStatus('Error loading settings', 'error');
      console.error('Initialization error:', e);
    }
  }


  function switchToHabitMode() {
    habitModeBtn?.classList.add('active');
    advancedModeBtn?.classList.remove('active');
    habitModePanel?.classList.remove('hidden');
    advancedModePanel?.classList.add('hidden');
  }

  function switchToAdvancedMode() {
    advancedModeBtn?.classList.add('active');
    habitModeBtn?.classList.remove('active');
    advancedModePanel?.classList.remove('hidden');
    habitModePanel?.classList.add('hidden');
  }


  function toggleCustomPrompt(show) {
    customPromptContainer.style.display = show ? 'block' : 'none';
  }


  async function handleHabitModeToggle() {
    const enabled = habitModeToggle.checked;

    try {
      if (enabled && advancedModeToggle.checked) {
        advancedModeToggle.checked = false;
      }

      const response = await chrome.runtime.sendMessage({
        action: "toggleHabitMode",
        enabled
      });

      if (response?.success) {
        if (enabled) switchToHabitMode();
      } else {
        habitModeToggle.checked = !enabled;
        showStatus('Failed to toggle habit mode', 'error');
      }
    } catch (error) {
      console.error('Habit mode toggle error:', error);
      habitModeToggle.checked = !enabled;
      showStatus('Error toggling habit mode', 'error');
    }
  }

  async function handleAdvancedModeToggle() {
    const enabled = advancedModeToggle.checked;

    try {
      if (enabled && habitModeToggle.checked) {
        habitModeToggle.checked = false;
      }

      const response = await chrome.runtime.sendMessage({
        action: "toggleAdvancedMode",
        enabled
      });

      if (response?.success) {
        if (enabled) switchToAdvancedMode();
      } else {
        advancedModeToggle.checked = !enabled;
        showStatus('Failed to toggle advanced mode', 'error');
      }
    } catch (error) {
      console.error('Advanced mode toggle error:', error);
      advancedModeToggle.checked = !enabled;
      showStatus('Error toggling advanced mode', 'error');
    }
  }


  function showStatus(message, type) {
    const status = document.createElement('div');
    status.className = `status-message ${type}`;
    status.textContent = message;
    document.body.appendChild(status);
    setTimeout(() => status.remove(), 3000);
  }

 
  habitModeBtn?.addEventListener('click', switchToHabitMode);
  advancedModeBtn?.addEventListener('click', switchToAdvancedMode);
  habitModeToggle?.addEventListener('change', handleHabitModeToggle);
  advancedModeToggle?.addEventListener('change', handleAdvancedModeToggle);

  saveApiKeyBtn?.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      try {
        const response = await chrome.runtime.sendMessage({ 
          action: "saveApiKey", 
          key: apiKey 
        });
        
        showStatus(
          response?.success ? 'API key saved' : 'Failed to save API key',
          response?.success ? 'success' : 'error'
        );
      } catch (error) {
        console.error('API key save error:', error);
        showStatus('Error saving API key', 'error');
      }
    }
  });

  optimizationLevel?.addEventListener('change', () => {
    const level = optimizationLevel.value;
    isCustomModeActive = level === 'custom';
    chrome.storage.sync.set({ 
        optimizationLevel: level,
 
        customPrompt: isCustomModeActive ? customPromptTextarea.value : null
    });
    toggleCustomPrompt(isCustomModeActive);
  });


  customPromptSave?.addEventListener('click', async () => {
    const prompt = customPromptTextarea.value.trim();
    if (prompt) {
      try {
        console.log('Saving custom prompt:', prompt);
        await chrome.storage.sync.set({ customPrompt: prompt });
        showStatus('Custom prompt saved', 'success');
        
      } catch (error) {
        console.error('Error saving custom prompt:', error);
        showStatus('Error saving custom prompt', 'error');
      }
    } else {
      showStatus('Please enter a custom prompt', 'error');
    }
  });

  customPromptCancel?.addEventListener('click', () => {
    
    if (!isCustomModeActive) {
      optimizationLevel.value = 'balanced';
      chrome.storage.sync.set({ optimizationLevel: 'balanced' });
    }
  });

 
  await loadInitialState();
});