(() => {
  console.log("Habit Mode script loaded/content");

  // Prevent duplicate execution
  if (window.__habitModeInitialized__) return;
  window.__habitModeInitialized__ = true;

  if (window.habitModeEnabled === undefined) {
    window.habitModeEnabled = true;
  }

  let floatingInput = null;
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  // Initialize habit mode
  initHabitMode();

  function initHabitMode() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "toggleHabitMode") {
        window.habitModeEnabled = request.enabled;
        if (!window.habitModeEnabled && floatingInput) {
          floatingInput.remove();
          floatingInput = null;
        }
      }
    });

    setupInputListeners();

    const observer = new MutationObserver(mutations => {
      if (!window.habitModeEnabled) return;

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (
            node.nodeType === Node.ELEMENT_NODE &&
            (node.tagName === "INPUT" || node.tagName === "TEXTAREA")
          ) {
            setupInputListener(node);
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function setupInputListeners() {
    document.querySelectorAll("input, textarea").forEach(input => {
      setupInputListener(input);
    });
  }

  function setupInputListener(input) {
    input.addEventListener("focus", handleInputFocus);
    input.addEventListener("blur", handleInputBlur);
    input.addEventListener("input", handleInputChange);
  }

  function handleInputFocus(e) {
    if (!window.habitModeEnabled) return;

    const originalElement = e.target;

    if (!floatingInput) {
      createFloatingElement(originalElement);
    } else {
      syncFloatingElement(originalElement);
    }

    positionFloatingElement();
  }

  function handleInputBlur() {
    if (floatingInput) {
      setTimeout(() => {
        if (document.activeElement !== floatingInput.element) {
          floatingInput.container.style.display = "none";
        }
      }, 100);
    }
  }

  function handleInputChange(e) {
    if (floatingInput && e.target === floatingInput.original) {
      floatingInput.element.value = e.target.value;
    }
  }

  function createFloatingElement(originalElement) {
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.zIndex = "9999";
    container.style.backgroundColor = "white";
    container.style.padding = "10px";
    container.style.borderRadius = "5px";
    container.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
    container.style.transition = "opacity 0.2s";
    container.style.cursor = "move";
    container.style.userSelect = "none";

    const dragHandle = document.createElement("div");
    dragHandle.style.height = "20px";
    dragHandle.style.backgroundColor = "#f0f0f0";
    dragHandle.style.borderRadius = "5px 5px 0 0";
    dragHandle.style.margin = "-10px -10px 10px -10px";
    dragHandle.style.padding = "5px";
    dragHandle.style.cursor = "move";
    dragHandle.style.display = "flex";
    dragHandle.style.alignItems = "center";
    dragHandle.style.justifyContent = "center";

    for (let i = 0; i < 3; i++) {
      const dot = document.createElement("div");
      dot.style.width = "4px";
      dot.style.height = "4px";
      dot.style.backgroundColor = "#888";
      dot.style.borderRadius = "50%";
      dot.style.margin = "0 2px";
      dragHandle.appendChild(dot);
    }

    const element = document.createElement(originalElement.tagName.toLowerCase());

    if (originalElement.tagName === "TEXTAREA") {
      element.style.width = "400px";
      element.style.height = "200px";
      element.style.minHeight = "100px";
      element.style.resize = "vertical";
      element.style.overflowY = "auto";
      element.style.whiteSpace = "pre-wrap";
    } else {
      element.style.width = "300px";
    }

    element.value = originalElement.value;
    element.style.padding = "8px";
    element.style.border = "1px solid #ddd";
    element.style.borderRadius = "4px";
    element.style.cursor = "text";

    const attributesToCopy = ["name", "placeholder", "aria-label", "required", "rows", "cols"];
    attributesToCopy.forEach(attr => {
      if (originalElement.hasAttribute(attr)) {
        element.setAttribute(attr, originalElement.getAttribute(attr));
      }
    });

    element.className = originalElement.className;

    element.addEventListener("input", e => {
      originalElement.value = e.target.value;
      originalElement.dispatchEvent(new Event("input", { bubbles: true }));
    });

    element.addEventListener("blur", () => {
      container.style.display = "none";
    });

    dragHandle.addEventListener("mousedown", startDrag);
    document.addEventListener("mousemove", dragElement);
    document.addEventListener("mouseup", endDrag);

    container.appendChild(dragHandle);
    container.appendChild(element);
    document.body.appendChild(container);

    floatingInput = {
      container,
      element,
      original: originalElement,
      dragHandle
    };
  }

  function startDrag(e) {
    if (!floatingInput) return;
    isDragging = true;
    const rect = floatingInput.container.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    floatingInput.container.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)";
    floatingInput.container.style.opacity = "0.95";
    floatingInput.dragHandle.style.backgroundColor = "#e0e0e0";
    e.preventDefault();
  }

  function dragElement(e) {
    if (!isDragging || !floatingInput) return;
    floatingInput.container.style.left = `${e.clientX - offsetX}px`;
    floatingInput.container.style.top = `${e.clientY - offsetY}px`;
    floatingInput.container.style.transform = "none";
  }

  function endDrag() {
    if (!floatingInput) return;
    isDragging = false;
    floatingInput.container.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
    floatingInput.container.style.opacity = "1";
    floatingInput.dragHandle.style.backgroundColor = "#f0f0f0";
  }

  function syncFloatingElement(originalElement) {
    if (!floatingInput) return;

    floatingInput.original = originalElement;
    floatingInput.element.value = originalElement.value;

    if (floatingInput.element.tagName !== originalElement.tagName) {
      const newElement = document.createElement(originalElement.tagName.toLowerCase());
      newElement.value = originalElement.value;
      newElement.style.cssText = floatingInput.element.style.cssText;
      const attributes = floatingInput.element.attributes;
      for (let i = 0; i < attributes.length; i++) {
        newElement.setAttribute(attributes[i].name, attributes[i].value);
      }
      floatingInput.container.replaceChild(newElement, floatingInput.element);
      floatingInput.element = newElement;

      floatingInput.element.addEventListener("input", e => {
        floatingInput.original.value = e.target.value;
        floatingInput.original.dispatchEvent(new Event("input", { bubbles: true }));
      });

      floatingInput.element.addEventListener("blur", () => {
        floatingInput.container.style.display = "none";
      });
    }

    const attributesToCopy = ["name", "placeholder", "aria-label", "required", "rows", "cols"];
    attributesToCopy.forEach(attr => {
      if (originalElement.hasAttribute(attr)) {
        floatingInput.element.setAttribute(attr, originalElement.getAttribute(attr));
      } else {
        floatingInput.element.removeAttribute(attr);
      }
    });

    floatingInput.element.className = originalElement.className;

    if (originalElement.tagName === "TEXTAREA") {
      floatingInput.element.style.width = "400px";
      floatingInput.element.style.height = originalElement.offsetHeight + "px";
      floatingInput.element.style.minHeight = "100px";
    } else {
      floatingInput.element.style.width = "300px";
      floatingInput.element.style.height = "";
      floatingInput.element.style.minHeight = "";
    }
  }

  function positionFloatingElement() {
    if (!floatingInput) return;

    floatingInput.container.style.display = "block";

    if (!floatingInput.container.style.left || !floatingInput.container.style.top) {
      floatingInput.container.style.top =
        floatingInput.original.tagName === "TEXTAREA" ? "50px" : "20px";
      floatingInput.container.style.left = "50%";
      floatingInput.container.style.transform = "translateX(-50%)";
    }

    floatingInput.element.focus();
  }

  document.addEventListener("unload", () => {
    if (floatingInput) {
      document.removeEventListener("mousemove", dragElement);
      document.removeEventListener("mouseup", endDrag);
    }
  });
})();
