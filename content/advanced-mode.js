(() => {
  if (window.__advancedModeInitialized__) return;
  window.__advancedModeInitialized__ = true;

  let advancedModeEnabled = false;
  let llmApiKey = "";
  let observer = null;
  let formOptimizationApplied = false; 
  let optimizationLevel = "";
  let customPrompt = "";
  console.log("Advanced mode script loaded/content injected");
  initAdvancedMode();

  function initAdvancedMode() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (!request || typeof request !== "object") return;

      console.log("Received message in advanced mode:", request);
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

      if (action === "setApiKey") {
        if (llmApiKey !== key) {
          llmApiKey = key;
          console.log("API key set in advanced mode");
          if (advancedModeEnabled) {
            refreshOptimizations();
          }
        }
      }
    });

    chrome.storage.sync.get(["advancedModeActive", "llmApiKey", 'optimizationLevel', 'customPrompt'], (result) => {
      if (result.advancedModeActive) {
        llmApiKey = result.llmApiKey || "";
        optimizationLevel = result.optimizationLevel || "standard";
        customPrompt = result.customPrompt || "";
        activateAdvancedMode();
      }
      console.log("customPrompt:", customPrompt);
      console.log("current optimization level:", optimizationLevel);
    });

    chrome.storage.onChanged.addListener((changes, namespace) => {
      console.log("change was noticed:", changes);
      if (changes.customPrompt) {
        customPrompt = changes.customPrompt.newValue;
        if (advancedModeEnabled && optimizationLevel === 'custom') {
          refreshOptimizations();
        }
        if (advancedModeEnabled && optimizationLevel === "custom" && customPrompt !== "") {
          (async () => {
            const pageAnalysis = analyzePageStructure();
            let flag = true;
            const optimizations = await getAIOptimizations(pageAnalysis, flag);
            applyOptimizations(optimizations);
            console.log("we fired the prompt call", optimizations);
          })();
        }
      }
      if (changes.optimizationLevel) {
        optimizationLevel = changes.optimizationLevel.newValue;
      }
    });
  }

  function activateAdvancedMode() {
    chrome.runtime.sendMessage({ action: "toggleHabitMode", enabled: false });
    formOptimizationApplied = false;
    observer = new MutationObserver((mutations) => handleMutations(mutations, observer));
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    });
    optimizePageLayout();
  }

  function deactivateAdvancedMode() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    formOptimizationApplied = false;
    document.querySelectorAll(".ffi-optimized").forEach((el) => {
      el.classList.remove("ffi-optimized");
      el.style.boxShadow = "";
      el.style.borderColor = "";
      el.style.position = "";
      el.style.top = "";
      el.style.left = "";
      el.style.transition = "";
    });
    document.querySelectorAll(".ffi-container").forEach((el) => el.remove());
  }

  let isHandlingMutations = false;

  function handleMutations(mutations, observer) {
    if (!advancedModeEnabled || isHandlingMutations) return;

    isHandlingMutations = true;
    observer.disconnect();

    try {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.target.classList?.contains("ffi-optimized")
        ) {
          return;
        }
        if (mutation.addedNodes?.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType !== 1) return;
            if (node.matches?.("input[type='text'], textarea")) {
              optimizeInputElement(node);
            } else {
              const inputs = node.querySelectorAll?.("input[type='text'], textarea");
              if (inputs?.length > 0) {
                inputs.forEach(optimizeInputElement);
              }
            }
          });
        }
        if (
          mutation.type === "attributes" &&
          mutation.target &&
          (mutation.target.matches?.("input[type='text'], textarea") ||
            mutation.target.querySelector?.("input[type='text'], textarea"))
        ) {
          optimizeInputElement(mutation.target);
        }
      });
    } catch (err) {
      console.warn("Mutation handler error:", err);
    } finally {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "class", "placeholder"],
      });

      isHandlingMutations = false;
    }
  }

  function optimizePageLayout() {
    document.querySelectorAll("input[type='text'], textarea").forEach((input) => {
      optimizeInputElement(input);
    });

    if (!formOptimizationApplied) {
      groupRelatedInputs();
    }
    if (llmApiKey) {
      applyAIOptimizations();
    }
  }

  function refreshOptimizations() {
    document.querySelectorAll(".ffi-optimized").forEach((el) => {
      el.classList.remove("ffi-optimized");
      el.style.boxShadow = "";
      el.style.borderColor = "";
      el.style.position = "";
      el.style.top = "";
      el.style.left = "";
      el.style.transition = "";
    });
    document.querySelectorAll(".ffi-container").forEach((el) => el.remove());
    formOptimizationApplied = false;

    optimizePageLayout();
  }

  function isElementVisible(element) {
    if (!element.isConnected) return false;
    
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function optimizeInputElement(input) {
    if (
      !input.isConnected ||
      input.hasAttribute("data-ffi-optimized") ||
      input.classList.contains("ffi-optimized") ||
      !isElementVisible(input)
    )
      return;

    const rect = input.getBoundingClientRect();
    const viewportCenter = window.innerHeight / 2;

    if (rect.width === 0 || rect.height === 0) return;

    input.setAttribute("data-ffi-optimized", "true");
    input.classList.add("ffi-optimized");

    const originalWidth = input.style.width;
    const originalHeight = input.style.height;

    input.addEventListener("focus", () => {
      input.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    if (rect.top > viewportCenter) {
      const moveDistance = Math.min(
        rect.top - viewportCenter,
        viewportCenter * 0.7
      );

      let container = input;
      while (
        container.parentElement &&
        container.parentElement.clientHeight ===
          container.parentElement.scrollHeight
      ) {
        container = container.parentElement;
      }

      if (!container.hasAttribute("data-ffi-repositioned")) {
        container.setAttribute("data-ffi-repositioned", "true");
        container.style.position = "relative";
        container.style.top = `-${moveDistance}px`;
        container.style.transition = "top 0.3s ease";
      }
    }

    input.addEventListener("focus", () => {
      input.style.boxShadow = "0 0 0 2px rgba(0, 150, 255, 0.5)";
      input.style.borderColor = "#0096ff";
      input.style.width = originalWidth;
      input.style.height = originalHeight;
    });

    input.addEventListener("blur", () => {
      input.style.boxShadow = "";
      input.style.borderColor = "";
      input.style.width = originalWidth;
      input.style.height = originalHeight;
    });
  }

  function groupRelatedInputs() {
    if (formOptimizationApplied) return;
    const allVisibleInputs = Array.from(document.querySelectorAll("input[type='text'], textarea"))
      .filter(input => isElementVisible(input));

    console.log(`Found ${allVisibleInputs.length} visible text inputs/areas`);

    if (allVisibleInputs.length < 2) return;
    const firstRect = allVisibleInputs[0].getBoundingClientRect();
    const lastRect = allVisibleInputs[allVisibleInputs.length - 1].getBoundingClientRect();
    const verticalDistance = lastRect.bottom - firstRect.top;
    if (verticalDistance > window.innerHeight * 0.6) {
      console.log(`Creating input group for ${allVisibleInputs.length} text inputs/areas`);
      createInputGroup(null, allVisibleInputs);
      formOptimizationApplied = true;
    }
  }

  function getInputIdentifier(input) {
    const id = input.id || '';
    const name = input.name || '';
    const type = input.type || '';
    const placeholder = input.placeholder || '';
    const ariaLabel = input.getAttribute('aria-label') || '';
    const rect = input.getBoundingClientRect();
    const position = `${Math.round(rect.top)}-${Math.round(rect.left)}`;
    
    return `${id}|${name}|${type}|${placeholder}|${ariaLabel}|${position}`;
  }

  function getBestLabel(input) {
    let labelText = "";
    if (input.id) {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label) labelText = label.textContent.trim();
    }
    if (!labelText) {
      const parentLabel = input.closest('label');
      if (parentLabel) {
        const labelClone = parentLabel.cloneNode(true);
        const nestedInputs = labelClone.querySelectorAll('input, textarea, select');
        nestedInputs.forEach(inp => inp.remove());
        labelText = labelClone.textContent.trim();
      }
    }

    if (!labelText) {
      let sibling = input.previousElementSibling;
      let attempts = 0;
      while (sibling && !labelText && attempts < 3) {
        if (sibling.tagName === "LABEL") {
          labelText = sibling.textContent.trim();
          break;
        }
        if (sibling.textContent && sibling.textContent.trim().length < 100) {
          const text = sibling.textContent.trim();
          if (text && !text.match(/^(submit|click|button|go|send|ok)$/i)) {
            labelText = text;
            break;
          }
        }
        sibling = sibling.previousElementSibling;
        attempts++;
      }
    }
    if (!labelText) {
      const parent = input.parentElement;
      if (parent) {
        const parentClone = parent.cloneNode(true);
        const nestedInputs = parentClone.querySelectorAll('input, textarea, select, button');
        nestedInputs.forEach(inp => inp.remove());
        const parentText = parentClone.textContent.trim();
        if (parentText && parentText.length < 100 && parentText.length > 2) {
          labelText = parentText;
        }
      }
    }

    if (!labelText) {
      labelText = input.getAttribute("aria-label") || "";
    }
    if (!labelText) {
      labelText = input.getAttribute("placeholder") || "";
    }

    if (!labelText && input.name) {
      labelText = input.name.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    if (!labelText) {
      labelText = input.getAttribute("title") || "";
    }

    if (!labelText) {
      labelText = input.type.charAt(0).toUpperCase() + input.type.slice(1);
    }

    labelText = labelText.replace(/\s+/g, ' ').trim();
    
    return labelText;
  }

  function deduplicateInputs(inputs) {
    const seen = new Set();
    const uniqueInputs = [];
    const seenLabels = new Map(); 
    
    inputs.forEach(input => {
      const identifier = getInputIdentifier(input);
      const label = getBestLabel(input).toLowerCase();
      
      if (seen.has(identifier)) {
        console.log(`Skipping duplicate input with identifier: ${identifier}`);
        return;
      }
      
      let isDuplicateLabel = false;
      for (const [existingLabel, existingInput] of seenLabels) {
        if (areLabelsSimular(label, existingLabel)) {
          console.log(`Skipping input with similar label: "${label}" (similar to "${existingLabel}")`);
          if (label.length > existingLabel.length) {
            const indexToReplace = uniqueInputs.indexOf(existingInput);
            if (indexToReplace >= 0) {
              uniqueInputs[indexToReplace] = input;
              seenLabels.delete(existingLabel);
              seenLabels.set(label, input);
            }
          }
          isDuplicateLabel = true;
          break;
        }
      }
      
      if (!isDuplicateLabel) {
        seen.add(identifier);
        uniqueInputs.push(input);
        seenLabels.set(label, input);
      }
    });
    
    console.log(`Deduplicated inputs: ${inputs.length} -> ${uniqueInputs.length}`);
    return uniqueInputs;
  }

  function areLabelsSimular(label1, label2) {
    if (!label1 || !label2) return false;
    
    const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const norm1 = normalize(label1);
    const norm2 = normalize(label2);
    
    if (norm1 === norm2) return true;
    
    if (norm1.length > 3 && norm2.length > 3) {
      if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
    }
    
    const patterns = [
      ['email', 'emailaddress', 'mail', 'e-mail'],
      ['password', 'pwd', 'pass'],
      ['username', 'user', 'login'],
      ['firstname', 'fname', 'first'],
      ['lastname', 'lname', 'last'],
      ['phone', 'telephone', 'mobile', 'phoneumber'],
      ['address', 'addr', 'location'],
      ['city', 'town'],
      ['state', 'province'],
      ['zip', 'zipcode', 'postalcode', 'postal'],
      ['country', 'nation']
    ];
    
    for (const pattern of patterns) {
      if (pattern.includes(norm1) && pattern.includes(norm2)) {
        return true;
      }
    }
    
    return false;
  }

  function createInputGroup(form, inputs) {
    const uniqueInputs = deduplicateInputs(inputs);
    
    if (uniqueInputs.length === 0) {
      console.log("No unique inputs found after deduplication");
      return;
    }

    const container = document.createElement("div");
    container.className = "ffi-container";
    container.style.position = "fixed";
    container.style.top = "50%";
    container.style.left = "50%";
    container.style.transform = "translate(-50%, -50%)";
    container.style.zIndex = "9999";
    container.style.backgroundColor = "white";
    container.style.padding = "20px";
    container.style.borderRadius = "8px";
    container.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.15)";
    container.style.maxHeight = "80vh";
    container.style.overflowY = "auto";
    container.style.width = "min(90vw, 600px)";

    let formTitle = "";
    if (form) {
      formTitle = form.getAttribute("name") || "";
      if (!formTitle) {
        const heading = form.querySelector("h1, h2, h3, legend");
        if (heading) formTitle = heading.textContent.trim();
      }
    }

    if (!formTitle) {
      const pageHeading = document.querySelector("h1, h2, title");
      if (pageHeading) {
        formTitle = pageHeading.textContent.trim();
      }
    }
    
    const title = document.createElement("h3");
    title.textContent = formTitle || "Page Inputs";
    title.style.marginTop = "0";
    title.style.marginBottom = "15px";
    title.style.color = "#333";
    container.appendChild(title);

    const info = document.createElement("div");
    info.textContent = `Optimized ${uniqueInputs.length} unique input${uniqueInputs.length !== 1 ? 's' : ''} from page`;
    info.style.fontSize = "12px";
    info.style.color = "#666";
    info.style.marginBottom = "15px";
    info.style.fontStyle = "italic";
    container.appendChild(info);

    uniqueInputs.forEach((input, index) => {
      const wrapper = document.createElement("div");
      wrapper.style.marginBottom = "15px";

      const labelText = getBestLabel(input);

      const label = document.createElement("label");
      label.textContent = labelText;
      label.style.display = "block";
      label.style.marginBottom = "5px";
      label.style.fontWeight = "500";
      label.style.color = "#333";
      const inputId = `ffi-input-${index}-${Date.now()}`;
      label.htmlFor = inputId;

      const clonedInput = input.cloneNode(true);
      clonedInput.id = inputId;
      clonedInput.style.width = "100%";
      clonedInput.style.padding = "10px";
      clonedInput.style.border = "2px solid #e0e0e0";
      clonedInput.style.borderRadius = "6px";
      clonedInput.style.boxSizing = "border-box";
      clonedInput.style.fontSize = "14px";
      clonedInput.style.transition = "border-color 0.2s ease";

      clonedInput.value = input.value;

      if (input.required) clonedInput.required = true;
      if (input.pattern) clonedInput.pattern = input.pattern;

      if (input.minLength !== undefined && input.minLength !== null && input.minLength >= 0) {
        clonedInput.minLength = input.minLength;
      } else if (input.minLength < 0) {
        console.warn('Skipping negative minLength value:', input.minLength, 'for input:', input);
      }

      if (input.maxLength !== undefined && input.maxLength !== null && input.maxLength >= 0) {
        clonedInput.maxLength = input.maxLength;
      } else if (input.maxLength < 0) {
        console.warn('Skipping negative maxLength value:', input.maxLength, 'for input:', input);
      }

      clonedInput.addEventListener("focus", () => {
        clonedInput.style.borderColor = "#4CAF50";
        clonedInput.style.boxShadow = "0 0 0 3px rgba(76, 175, 80, 0.1)";
        clonedInput.style.outline = "none";
      });

      clonedInput.addEventListener("blur", () => {
        clonedInput.style.borderColor = "#e0e0e0";
        clonedInput.style.boxShadow = "none";
      });

      let syncTimeout;
      clonedInput.addEventListener("input", () => {
        clearTimeout(syncTimeout);
        syncTimeout = setTimeout(() => {
          input.value = clonedInput.value;
          const event = new Event("input", { bubbles: true });
          input.dispatchEvent(event);
        }, 100);
      });

      clonedInput.addEventListener("change", () => {
        input.value = clonedInput.value;
        const event = new Event("change", { bubbles: true });
        input.dispatchEvent(event);
      });

      wrapper.appendChild(label);
      wrapper.appendChild(clonedInput);
      container.appendChild(wrapper);
      input.style.opacity = "0.1";
      input.style.pointerEvents = "none";
      input.style.border = "2px dashed #ccc";
      input.setAttribute("data-ffi-hidden", "true");

      if (!input.getAttribute('title')) {
        input.setAttribute('title', 'This field is optimized - use the popup form');
      }
    });

    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = "center";
    buttonContainer.style.gap = "10px";
    buttonContainer.style.marginTop = "20px";
    buttonContainer.style.borderTop = "1px solid #eee";
    buttonContainer.style.paddingTop = "15px";

    const closeButton = document.createElement("button");
    closeButton.textContent = "Close Optimization";
    closeButton.style.padding = "10px 20px";
    closeButton.style.backgroundColor = "#6c757d";
    closeButton.style.color = "white";
    closeButton.style.border = "none";
    closeButton.style.borderRadius = "6px";
    closeButton.style.cursor = "pointer";
    closeButton.style.fontSize = "14px";
    closeButton.style.transition = "background-color 0.2s ease";
    
    closeButton.addEventListener("mouseenter", () => {
      closeButton.style.backgroundColor = "#5a6268";
    });
    
    closeButton.addEventListener("mouseleave", () => {
      closeButton.style.backgroundColor = "#6c757d";
    });
    
    closeButton.addEventListener("click", () => {
      container.remove();
      uniqueInputs.forEach((input) => {
        input.style.opacity = "";
        input.style.pointerEvents = "";
        input.style.border = "";
        input.removeAttribute("data-ffi-hidden");
        input.removeAttribute("title");
      });
      formOptimizationApplied = false;
    });

    buttonContainer.appendChild(closeButton);
    container.appendChild(buttonContainer);

    document.body.appendChild(container);
    
    const firstInput = container.querySelector("input, textarea, select");
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }

    console.log(`Created optimized form with ${uniqueInputs.length} unique inputs`);
  }

  async function applyAIOptimizations() {
    const statusElement = document.createElement("div");
    statusElement.style.position = "fixed";
    statusElement.style.bottom = "10px";
    statusElement.style.left = "10px";
    statusElement.style.zIndex = "99999";
    statusElement.style.padding = "10px";
    statusElement.style.background = "white";
    statusElement.style.borderRadius = "5px";
    statusElement.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.2)";

    try {
      statusElement.textContent = "Analyzing page with AI...";
      document.body.appendChild(statusElement);

      const pageAnalysis = analyzePageStructure();
      let optimizations;

      if (llmApiKey) {
        optimizations = await getAIOptimizations(pageAnalysis);
      } else {
        optimizations = getFallbackOptimizations();
        statusElement.textContent = "Using fallback optimizations (no API key)";
        console.log("No API key provided, using fallback optimizations.");
      }

      applyOptimizations(optimizations);

      statusElement.textContent = "Optimization complete!";
      setTimeout(() => statusElement.remove(), 2000);
    } catch (error) {
      statusElement.style.background = "red";
      statusElement.textContent = `AI Error: ${error.message}. Using fallback heuristics.`;
      setTimeout(() => statusElement.remove(), 5000);

      const fallback = getFallbackOptimizations();
      applyOptimizations(fallback);
    }
  }

  function analyzePageStructure() {
    const inputs = Array.from(document.querySelectorAll("input[type='text'], textarea"))
      .filter(input => isElementVisible(input))
      .map((input) => {
        let labelText = '';
        if (input.id) {
          const label = document.querySelector(`label[for="${input.id}"]`);
          if (label) labelText = label.textContent.trim();
        }
        
        if (!labelText && input.previousElementSibling?.tagName === 'LABEL') {
          labelText = input.previousElementSibling.textContent.trim();
        }
        
        labelText = labelText || 
                   input.getAttribute('aria-label') || 
                   input.getAttribute('placeholder') || 
                   input.name || 
                   '';

        return {
          id: input.id,
          name: input.name,
          type: input.type,
          label: labelText,
          placeholder: input.placeholder,
          position: input.getBoundingClientRect(),
          parent: {
            tag: input.parentElement?.tagName,
            id: input.parentElement?.id,
            class: input.parentElement?.className,
          }
        };
      });

    const forms = Array.from(document.querySelectorAll("form, .form, [role='form']"))
      .slice(0, 1)
      .map((form) => {
        const formInputs = Array.from(form.querySelectorAll("input[type='text'], textarea"))
          .filter(input => isElementVisible(input));
        
        return {
          id: form.id,
          class: form.className,
          name: form.getAttribute('name') || '',
          inputs: formInputs.map(input => ({
            id: input.id,
            name: input.name,
            type: input.type
          })),
          position: form.getBoundingClientRect()
        };
      });

    if (forms.length === 0 && inputs.length > 0) {
      forms.push({
        id: 'virtual-form',
        class: 'page-inputs',
        name: 'Page Inputs',
        inputs: inputs.map(input => ({
          id: input.id,
          name: input.name,
          type: input.type
        })),
        position: {
          top: Math.min(...inputs.map(i => i.position.top)),
          bottom: Math.max(...inputs.map(i => i.position.bottom)),
          left: Math.min(...inputs.map(i => i.position.left)),
          right: Math.max(...inputs.map(i => i.position.right))
        }
      });
    }

    return {
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      inputs,
      forms: forms.slice(0, 1),
      scrollableAreas: findScrollableAreas(),
    };
  }

  const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

  async function getAIOptimizations(pageData, forceflag) {
    if (!llmApiKey) {
      console.warn("No API key provided. Using fallback optimizations.");
      return getFallbackOptimizations();
    }
    let prompt;
    if (optimizationLevel === 'custom' && customPrompt !== "" && forceflag) {
      console.log("firing custom css prompt")
  
      prompt = `${customPrompt}
      
      IMPORTANT: You must return ONLY valid JSON in this exact format:
      {
        "css_changes": [{
          "selector": "valid CSS selector",
          "properties": {
            "css-property": "value",
            "another-property": "value"
          },
          "reason": "explanation"
        }],
        "input_repositioning": [{
          "selector": "CSS selector",
          "new_position": {"top": "px", "left": "px"},
          "new_styles": {"property": "value"},
          "reason": "Explanation"
        }],
        "input_optimizations": [{
          "selector": "input/textarea selector",
          "action": "reposition|resize|enhance",
          "position": {"top": "px", "left": "px"},
          "styles": {"property": "value"}
        }],
        "form_optimizations": [{
            "selector": "CSS selector",
            "action": "group|reposition",
            "new_position": {"top": "px", "left": "px"}
        }],
        "scroll_optimizations": [{
            "selector": "CSS selector",
            "action": "expand|focus_area"
        }],
        "summary": "brief explanation"
      }

      Current Page Structure:
      ${JSON.stringify(pageData, null, 2)}`;
    }
    else {
      prompt = `Analyze this web page and suggest UX improvements focusing on:
      1. Input field positioning and styling (only for text inputs and textareas)
      2. Form organization
      3. Accessibility enhancements
      Return ONLY JSON in this format:
      {
        "input_repositioning": [{
          "selector": "CSS selector for text input or textarea",
          "new_position": {"top": "px", "left": "px"},
          "new_styles": {"property": "value"},
          "reason": "Explanation"
        }],
        "form_optimizations": [{
            "selector": "CSS selector",
            "action": "group|reposition",
            "new_position": {"top": "px", "left": "px"}
        }],
        "scroll_optimizations": [{
            "selector": "CSS selector",
            "action": "expand|focus_area"
        }],
        "summary": "Brief explanation"
      }

      Page Data:
      ${JSON.stringify(pageData, null, 2)}`;
    }

    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${llmApiKey}`
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error:", response.status, errorText);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      let reply = data.choices?.[0]?.message?.content;
      const jsonMatch = reply.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        reply = jsonMatch[1];
      }

      try {
        const optimizations = JSON.parse(reply);
        console.log("Successfully parsed optimizations:", optimizations);
        return optimizations;
      } catch (e) {
        console.warn("Failed to parse JSON response. Content was:", reply);
        return getFallbackOptimizations();
      }
    } catch (error) {
      console.error("Error in getAIOptimizations:", error);
      return getFallbackOptimizations();
    }
  }

  function getFallbackOptimizations() {
    const inputs = Array.from(document.querySelectorAll("input[type='text'], textarea"))
      .filter((input) => {
        if (!isElementVisible(input)) return false;
        
        const rect = input.getBoundingClientRect();
        return rect.top > window.innerHeight / 2;
      })
      .map((input) => ({
        selector: input.id
          ? `#${input.id}`
          : input.name
          ? `[name="${input.name}"]`
          : `input[type="${input.type}"]`,
        new_position: {
          top: Math.min(window.innerHeight / 3, 200),
        },
        reason: "Text input was in bottom half of screen (fallback heuristic)",
      }));

    return {
      input_repositioning: inputs,
      summary: "Applied fallback heuristics to visible text inputs only",
    };
  }

  function applyOptimizations(optimizations) {
    optimizations.input_repositioning?.forEach((item) => {
      const element = document.querySelector(item.selector);
      if (!element || element.hasAttribute("data-ffi-ai-optimized") || !isElementVisible(element)) return;

      element.setAttribute("data-ffi-ai-optimized", "true");
      element.classList.add("ffi-optimized");

      if (item.new_position) {
        element.style.position = "relative";
        element.style.top = `${item.new_position.top}px`;
        element.style.left = item.new_position.left
          ? `${item.new_position.left}px`
          : "";
        element.style.transition = "all 0.3s ease";
      }

      if (item.new_styles) {
        const filteredStyles = Object.fromEntries(
          Object.entries(item.new_styles).filter(
            ([prop]) => !['width', 'height', 'min-width', 'min-height', 'max-width', 'max-height'].includes(prop)
          )
        );
        Object.entries(filteredStyles).forEach(([prop, value]) => {
          element.style[prop] = value;
        });
      }

      if (item.reason) {
        element.title = item.reason;
      }
    });

    optimizations.input_optimizations?.forEach(opt => {
      const elements = document.querySelectorAll(opt.selector);
      elements.forEach(el => {
        if (!isElementVisible(el)) return;
        
        if (opt.position) {
          el.style.position = "relative";
          el.style.top = opt.position.top ? `${opt.position.top}px` : "";
          el.style.left = opt.position.left ? `${opt.position.left}px` : "";
        }
        
        if (opt.styles) {
          const filteredStyles = Object.fromEntries(
            Object.entries(opt.styles).filter(
              ([prop]) => !['width', 'height', 'min-width', 'min-height', 'max-width', 'max-height'].includes(prop)
            )
          );
          Object.entries(filteredStyles).forEach(([prop, value]) => {
            el.style[prop] = value;
          });
        }
      });
    });

    if (optimizations.form_optimizations?.length > 0 && !formOptimizationApplied) {
      const formOpt = optimizations.form_optimizations[0];
      const form = document.querySelector(formOpt.selector);
      if (formOpt.action === "group") {
        const allInputs = Array.from(document.querySelectorAll("input[type='text'], textarea"))
          .filter(input => isElementVisible(input));
          
        if (allInputs.length >= 2) {
          createInputGroup(form, allInputs);
          formOptimizationApplied = true;
        }
      } else if (formOpt.action === "reposition" && form) {
        form.style.position = "relative";
        form.style.top = `${formOpt.new_position.top}px`;
        if (formOpt.new_position.left) {
          form.style.left = `${formOpt.new_position.left}px`;
        }
        formOptimizationApplied = true;
      }
    }

    optimizations.scroll_optimizations?.forEach((opt) => {
      const element = document.querySelector(opt.selector);
      if (!element || element.hasAttribute("data-ffi-scroll-optimized")) return;

      element.setAttribute("data-ffi-scroll-optimized", "true");

      if (opt.action === "expand") {
        element.style.maxHeight = "none";
        element.style.overflowY = "visible";
      } else if (opt.action === "focus_area") {
        element.scrollIntoView({ behavior: "smooth" });
      }
    });

    optimizations.css_changes?.forEach(change => {
      try {
        const elements = document.querySelectorAll(change.selector);
        elements.forEach(el => {
          if (!isElementVisible(el)) return;
          
          const filteredProperties = Object.fromEntries(
            Object.entries(change.properties).filter(
              ([prop]) => !['width', 'height', 'min-width', 'min-height', 'max-width', 'max-height'].includes(prop)
            )
          );
          
          Object.entries(filteredProperties).forEach(([prop, value]) => {
            el.style[prop] = value;
          });
          
          if (change.reason) {
            el.setAttribute('data-ffi-custom-reason', change.reason);
          }
          
          el.classList.add('ffi-custom-optimized');
        });
      } catch (e) {
        console.warn(`Failed to apply CSS changes for ${change.selector}`, e);
      }
    });

    if (optimizations.summary) {
      console.log("Optimization Summary:", optimizations.summary);
      const status = document.createElement('div');
      status.textContent = `Custom: ${optimizations.summary}`;
      status.style.position = 'fixed';
      status.style.bottom = '10px';
      status.style.right = '10px';
      status.style.background = 'white';
      status.style.padding = '8px 12px';
      status.style.borderRadius = '4px';
      status.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
      status.style.zIndex = '99999';
      status.style.fontSize = '12px';
      status.style.background = '#a6ff81'
      document.body.appendChild(status);
      setTimeout(() => status.remove(), 5000);
    }
  }

  function findScrollableAreas() {
    const scrollable = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT
    );

    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (
        node.clientHeight < node.scrollHeight ||
        node.clientWidth < node.scrollWidth
      ) {
        scrollable.push({
          id: node.id,
          class: node.className,
          tag: node.tagName,
          scrollHeight: node.scrollHeight,
          clientHeight: node.clientHeight,
          containsInputs: node.querySelector("input, textarea") !== null,
        });
      }
    }

    return scrollable;
  }

  document.addEventListener("unload", () => {
    if (observer) {
      observer.disconnect();
    }
  });
})();