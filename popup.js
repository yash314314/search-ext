document.addEventListener('DOMContentLoaded', () => {
  const selector = document.getElementById('modeSelector');

  // Load current mode
  chrome.storage.sync.get(['mode'], (data) => {
    selector.value = data.mode || 'habit';
  });

  // Update mode on change
  selector.addEventListener('change', () => {
    chrome.storage.sync.set({ mode: selector.value }, () => {
      console.log('🔄 Mode updated to:', selector.value);
    });
  });
});
