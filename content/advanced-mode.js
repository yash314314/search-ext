let advancedModeEnabled = false;
let llmApiKey = "";
let observer = null;
const LLM_API_ENDPOINT ="https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

initAdvancedMode();

function initAdvancedMode() {

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//db1
        console.log("Received message in advanced mode:", request);
    if (request.action === "toggleAdvancedMode") {
      advancedModeEnabled = request.enabled;
        if (advancedModeEnabled) {
        activateAdvancedMode();
      } else {
        deactivateAdvancedMode();
      }
    }
    if (request.action === "setApiKey") {
      llmApiKey = request.key;
      if (advancedModeEnabled) {
        refreshOptimizations();
      }
    }
  });
  chrome.storage.sync.get(["advancedModeActive", "llmApiKey"], (result) => {
    if (result.advancedModeActive) {
      llmApiKey = result.llmApiKey || "";
      activateAdvancedMode();
    }
  });
}

function activateAdvancedMode() {
  // Disable habit mode if active
  chrome.runtime.sendMessage({ action: "toggleHabitMode", enabled: false });

  // Start observing DOM changes
  observer = new MutationObserver(handleMutations);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style", "class"],
  });

  // Initial optimization
  optimizePageLayout();
}

function deactivateAdvancedMode() {
  // Stop observing
  if (observer) {
    observer.disconnect();
    observer = null;
  }

  // Remove all optimizations
  document.querySelectorAll(".ffi-optimized").forEach((el) => {
    el.classList.remove("ffi-optimized");
    el.style = "";
  });

  // Remove any injected elements
  document.querySelectorAll(".ffi-container").forEach((el) => el.remove());
}

function handleMutations(mutations) {
  if (!advancedModeEnabled) return;

  mutations.forEach((mutation) => {
    // Handle added nodes
    if (mutation.addedNodes) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          // Element node
          if (node.matches("input, textarea")) {
            optimizeInputElement(node);
          } else {
            const inputs = node.querySelectorAll("input, textarea");
            inputs.forEach(optimizeInputElement);
          }
        }
      });
    }

    // Handle attribute changes
    if (
      mutation.type === "attributes" &&
      (mutation.target.matches("input, textarea") ||
        mutation.target.querySelector("input, textarea"))
    ) {
      optimizeInputElement(mutation.target);
    }
  });
}

function optimizePageLayout() {
  // Simple heuristic-based optimizations
  document.querySelectorAll("input, textarea").forEach((input) => {
    optimizeInputElement(input);
  });

  // Group related form fields
  groupRelatedInputs();

  // If API key is available, use AI for more advanced optimizations
  if (llmApiKey) {
    applyAIOptimizations();
  }
}

function refreshOptimizations() {
  // Remove all optimizations
  document.querySelectorAll(".ffi-optimized").forEach((el) => {
    el.classList.remove("ffi-optimized");
    el.style = "";
  });

  // Re-apply optimizations
  optimizePageLayout();
}

function optimizeInputElement(input) {
  if (!input.isConnected || input.classList.contains("ffi-optimized")) return;

  const rect = input.getBoundingClientRect();
  const viewportCenter = window.innerHeight / 2;

  // Skip hidden inputs
  if (rect.width === 0 || rect.height === 0) return;

  // Mark as optimized
  input.classList.add("ffi-optimized");

  // 1. Ensure inputs are visible when focused
  input.addEventListener("focus", () => {
    input.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  // 2. Reposition inputs that are too low
  if (rect.top > viewportCenter) {
    const moveDistance = Math.min(
      rect.top - viewportCenter,
      viewportCenter * 0.7
    );

    // Find the nearest scrollable parent
    let container = input;
    while (
      container.parentElement &&
      container.parentElement.clientHeight ===
        container.parentElement.scrollHeight
    ) {
      container = container.parentElement;
    }

    container.style.position = "relative";
    container.style.top = `-${moveDistance}px`;
    container.style.transition = "top 0.3s ease";
  }

  // 3. Improve visibility of focused input
  input.addEventListener("focus", () => {
    input.style.boxShadow = "0 0 0 2px rgba(0, 150, 255, 0.5)";
    input.style.borderColor = "#0096ff";
  });

  input.addEventListener("blur", () => {
    input.style.boxShadow = "";
    input.style.borderColor = "";
  });
}

function groupRelatedInputs() {
  // Find all forms on the page
  const forms = document.querySelectorAll("form");

  forms.forEach((form) => {
    // Skip if already processed
    if (form.classList.contains("ffi-optimized")) return;

    const inputs = form.querySelectorAll("input, textarea");
    if (inputs.length < 2) return;

    // Check if inputs are spread vertically
    const firstRect = inputs[0].getBoundingClientRect();
    const lastRect = inputs[inputs.length - 1].getBoundingClientRect();
    const verticalDistance = lastRect.bottom - firstRect.top;

    if (verticalDistance > window.innerHeight * 0.6) {
      createInputGroup(form, inputs);
    }
  });
}

function createInputGroup(form, inputs) {
  // Create container for grouped inputs
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

  // Add title
  const title = document.createElement("h3");
  title.textContent = form.getAttribute("name") || "Form";
  title.style.marginTop = "0";
  title.style.marginBottom = "15px";
  container.appendChild(title);

  // Clone inputs into container
  inputs.forEach((input) => {
    // Skip hidden inputs
    if (input.type === "hidden") return;

    const wrapper = document.createElement("div");
    wrapper.style.marginBottom = "15px";

    const label = document.createElement("label");
    label.textContent =
      input.getAttribute("placeholder") ||
      input.getAttribute("aria-label") ||
      input.previousElementSibling?.textContent ||
      `Field ${input.type}`;
    label.style.display = "block";
    label.style.marginBottom = "5px";
    label.style.fontWeight = "500";

    const clonedInput = input.cloneNode(true);
    clonedInput.style.width = "100%";
    clonedInput.style.padding = "8px";
    clonedInput.style.border = "1px solid #ddd";
    clonedInput.style.borderRadius = "4px";

    // Sync changes back to original input
    clonedInput.addEventListener("input", () => {
      input.value = clonedInput.value;
      const event = new Event("input", { bubbles: true });
      input.dispatchEvent(event);
    });

    wrapper.appendChild(label);
    wrapper.appendChild(clonedInput);
    container.appendChild(wrapper);

    // Hide original input
    input.style.opacity = "0";
    input.style.position = "absolute";
    input.style.pointerEvents = "none";
  });

  // Add submit button if form has one
  const submitButton = form.querySelector(
    'input[type="submit"], button[type="submit"]'
  );
  if (submitButton) {
    const clonedSubmit = submitButton.cloneNode(true);
    clonedSubmit.addEventListener("click", (e) => {
      e.preventDefault();
      submitButton.click();
    });
    container.appendChild(clonedSubmit);
  }

  // Add close button
  const closeButton = document.createElement("button");
  closeButton.textContent = "Close";
  closeButton.style.marginLeft = "10px";
  closeButton.style.padding = "6px 12px";
  closeButton.style.backgroundColor = "#f0f0f0";
  closeButton.style.border = "none";
  closeButton.style.borderRadius = "4px";
  closeButton.addEventListener("click", () => {
    container.remove();
    inputs.forEach((input) => {
      input.style.opacity = "";
      input.style.position = "";
      input.style.pointerEvents = "";
    });
  });
  container.appendChild(closeButton);

  document.body.appendChild(container);
  form.classList.add("ffi-optimized");
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
  statusElement.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";

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
    }

    applyOptimizations(optimizations);

    statusElement.textContent = "Optimization complete!";
    setTimeout(() => statusElement.remove(), 2000);
  } catch (error) {
    statusElement.style.background = "#ffebee";
    statusElement.textContent = `AI Error: ${error.message}. Using fallback heuristics.`;
    setTimeout(() => statusElement.remove(), 5000);

    // Fallback to basic heuristics
    const fallback = getFallbackOptimizations();
    applyOptimizations(fallback);
  }
}

function analyzePageStructure() {
  const inputs = Array.from(document.querySelectorAll("input, textarea")).map(
    (input) => ({
      id: input.id,
      name: input.name,
      type: input.type,
      placeholder: input.placeholder,
      position: input.getBoundingClientRect(),
      parent: {
        tag: input.parentElement?.tagName,
        id: input.parentElement?.id,
        class: input.parentElement?.className,
      },
    })
  );

  const forms = Array.from(document.querySelectorAll("form")).map((form) => ({
    id: form.id,
    class: form.className,
    inputs: Array.from(form.querySelectorAll("input, textarea")).map(
      (input) => input.id || input.name
    ),
    position: form.getBoundingClientRect(),
  }));

  return {
    url: window.location.href,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    inputs,
    forms,
    scrollableAreas: findScrollableAreas(),
  };
}

async function getAIOptimizations(pageData) {
  if (!llmApiKey) {
    return getFallbackOptimizations();
  }

  const prompt = `Analyze this web page structure and suggest UX improvements for input fields. Focus on:
1. Repositioning inputs that require excessive scrolling
2. Grouping related form fields
3. Improving visibility and accessibility
4. Preserving the page's original design as much as possible

Return response in this exact JSON format:
{
    "input_repositioning": [{
        "selector": "CSS selector",
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
    "summary": "Brief explanation of changes"
}

Page Data:
${JSON.stringify(pageData, null, 2)}`;

  const response = await fetch(LLM_API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${llmApiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4-turbo",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

function getFallbackOptimizations() {
  const inputs = Array.from(document.querySelectorAll("input, textarea"))
    .filter((input) => {
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
      reason: "Input was in bottom half of screen (fallback heuristic)",
    }));

  return {
    input_repositioning: inputs,
    summary: "Applied fallback heuristics",
  };
}

function applyAIOptimizationsToPage(optimizations) {
  // Apply input repositioning
  optimizations.input_repositioning?.forEach((item) => {
    const element = document.querySelector(item.selector);
    if (element) {
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
        Object.entries(item.new_styles).forEach(([prop, value]) => {
          element.style[prop] = value;
        });
      }

      if (item.reason) {
        element.title = item.reason;
      }
    }
  });

  // Apply form optimizations
  optimizations.form_optimizations?.forEach((formOpt) => {
    const form = document.querySelector(formOpt.selector);
    if (form) {
      if (formOpt.action === "group") {
        const inputs = form.querySelectorAll("input, textarea");
        createInputGroup(form, inputs);
      } else if (formOpt.action === "reposition") {
        form.style.position = "relative";
        form.style.top = `${formOpt.new_position.top}px`;
        if (formOpt.new_position.left) {
          form.style.left = `${formOpt.new_position.left}px`;
        }
      }
    }
  });

  // Apply scroll optimizations
  optimizations.scroll_optimizations?.forEach((opt) => {
    const element = document.querySelector(opt.selector);
    if (element) {
      if (opt.action === "expand") {
        element.style.maxHeight = "none";
        element.style.overflowY = "visible";
      } else if (opt.action === "focus_area") {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  });

  console.log("AI Optimization Summary:", optimizations.summary);
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
function applyOptimizations(optimizations) {
  // This function applies both AI and fallback optimizations
  if (!optimizations || typeof optimizations !== 'object') {
    console.error('Invalid optimizations object:', optimizations);
    return;
  }

  // Apply input repositioning
  if (optimizations.input_repositioning && Array.isArray(optimizations.input_repositioning)) {
    optimizations.input_repositioning.forEach(item => {
      try {
        const element = document.querySelector(item.selector);
        if (element) {
          element.classList.add('ffi-optimized');
          
          if (item.new_position) {
            element.style.position = 'relative';
            if (item.new_position.top !== undefined) {
              element.style.top = `${item.new_position.top}px`;
            }
            if (item.new_position.left !== undefined) {
              element.style.left = `${item.new_position.left}px`;
            }
          }
          
          if (item.new_styles) {
            Object.entries(item.new_styles).forEach(([prop, value]) => {
              element.style[prop] = value;
            });
          }
        }
      } catch (error) {
        console.error('Error applying optimization:', error);
      }
    });
  }

  // Apply form optimizations
  if (optimizations.form_optimizations && Array.isArray(optimizations.form_optimizations)) {
    optimizations.form_optimizations.forEach(formOpt => {
      try {
        const form = document.querySelector(formOpt.selector);
        if (form) {
          if (formOpt.action === 'group') {
            const inputs = form.querySelectorAll('input, textarea');
            if (inputs.length > 0) {
              createInputGroup(form, inputs);
            }
          } else if (formOpt.action === 'reposition' && formOpt.new_position) {
            form.style.position = 'relative';
            if (formOpt.new_position.top !== undefined) {
              form.style.top = `${formOpt.new_position.top}px`;
            }
            if (formOpt.new_position.left !== undefined) {
              form.style.left = `${formOpt.new_position.left}px`;
            }
          }
        }
      } catch (error) {
        console.error('Error applying form optimization:', error);
      }
    });
  }

  // Apply scroll optimizations
  if (optimizations.scroll_optimizations && Array.isArray(optimizations.scroll_optimizations)) {
    optimizations.scroll_optimizations.forEach(opt => {
      try {
        const element = document.querySelector(opt.selector);
        if (element) {
          if (opt.action === 'expand') {
            element.style.maxHeight = 'none';
            element.style.overflowY = 'visible';
          } else if (opt.action === 'focus_area') {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }
      } catch (error) {
        console.error('Error applying scroll optimization:', error);
      }
    });
  }

  console.log('Applied optimizations:', optimizations.summary || 'Fallback heuristics');
}