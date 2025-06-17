(() => {
  if (window.__advancedModeInitialized__) return;
  window.__advancedModeInitialized__ = true;

  let advancedModeEnabled = false;
  let llmApiKey = "";
  let observer = null;

  const LLM_API_ENDPOINT =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

  console.log("Advanced mode script loaded/content injected");

  initAdvancedMode();

  function initAdvancedMode() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (!request || typeof request !== "object") return;

      const { action, enabled, key } = request;

      if (action === "toggleAdvancedMode") {
        if (enabled !== advancedModeEnabled) {
          advancedModeEnabled = enabled;
          if (enabled) {
            console.log("Activating advanced mode");
            activateAdvancedMode();
          } else {
            console.log("Deactivating advanced mode");
            deactivateAdvancedMode();
          }
        }
      }

      if (action === "toggleHabitMode") {
        // Optional: clean up if needed
      }

      if (action === "setApiKey") {
        if (llmApiKey !== key) {
          llmApiKey = key;
          console.log("API key set in advanced mode");
        }
      }
    });
  }

  function activateAdvancedMode() {
    // Disable habit mode via background
    chrome.runtime.sendMessage({ action: "toggleHabitMode", enabled: false });
  }

  function deactivateAdvancedMode() {
    // Re-enable habit mode via background
    chrome.runtime.sendMessage({ action: "toggleHabitMode", enabled: true });
  }

  document.addEventListener("unload", () => {
    if (observer) observer.disconnect();
  });
})();
