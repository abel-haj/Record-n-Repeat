const ACTIONS = {
  RECORD: "START_RECORDING",
  STOP: "STOP_RECORDING",
  REPLAY: "REPLAY_RECORDING",
};
let backgroundPort = null;

// Main
(() => {
  console.log("CONTENT SCRIPT EXECUTED!");

  let isRecording = false;
  let recordedActions = [];

  chrome.runtime.onMessage.addListener(
    async (request, sender, sendResponse) => {
      if (request.action === ACTIONS.RECORD) {
        isRecording = true;
        recordedActions = [];

        backgroundPort = chrome.runtime.connect({
          name: "content-background",
        });

        // bind listeners
        // document.addEventListener("focus", onDocFocus, true);
        // document.addEventListener("blur", onDocBlur, true);
        document.addEventListener("click", onDocClick, true);
        document.addEventListener(
          "pointerdown",
          onDocPointerDown,
          true
        );
        document.addEventListener("keypress", onKeyboardPress, true);
        document.addEventListener("change", onDocChange, true);
        document.addEventListener("input", onInput, true);
        console.log("LISTENING...");
      }

      if (request.action === ACTIONS.STOP) {
        isRecording = false;

        if (backgroundPort) {
          backgroundPort.disconnect();
          backgroundPort = null;
        }

        // unbind listeners
        // document.removeEventListener("focus", onDocFocus, true);
        // document.removeEventListener("blur", onDocBlur, true);
        document.removeEventListener("click", onDocClick, true);
        document.removeEventListener(
          "pointerdown",
          onDocPointerDown,
          true
        );
        document.removeEventListener(
          "keypress",
          onKeyboardPress,
          true
        );
        document.removeEventListener("change", onDocChange, true);
        console.log("STOPPED LISTENING!");
      }

      if (request.action === ACTIONS.REPLAY) {
        recordedActions = request.replay || [];

        console.log("REPLAYING RECORDED ACTIONS...", {
          recordedActions,
        });

        for (let i = 0; i < recordedActions.length; i++) {
          const action = recordedActions[i];
          const element = document.querySelector(
            action.details.selector
          );

          if (!element) {
            console.warn(
              "Element not found for selector:",
              action.details.selector
            );
            continue;
          }

          if (action.type === "click") {
            console.log(
              "REPLAYING CLICK ACTION",
              { element },
              `document.querySelector('${action.details.selector}').click()`
            );
            element.click();
          } else if (action.type === "pointerdown") {
            console.log(
              "REPLAYING POINTERDOWN ACTION",
              { element },
              `document.querySelector('${action.details.selector}').dispatchEvent(new PointerEvent('pointerdown', { button: ${action.details.button}, bubbles: true }))`
            );
            const event = new PointerEvent("pointerdown", {
              button: action.details.button,
              bubbles: true,
            });
            element.dispatchEvent(event);
          } else if (action.type === "focus") {
            console.log(
              "REPLAYING FOCUS ACTION",
              { element },
              `document.querySelector('${action.details.selector}').focus()`
            );
            element.focus();
          } else if (action.type === "blur") {
            console.log(
              "REPLAYING BLUR ACTION",
              { element },
              `document.querySelector('${action.details.selector}').blur()`
            );
            element.blur();
          } else if (action.type === "keypress") {
            console.log(
              "REPLAYING KEYPRESS ACTION",
              { element },
              `document.querySelector('${action.details.selector}').dispatchEvent(new KeyboardEvent('keypress', { key: '${action.details.key}', bubbles: true }))`
            );
            const event = new KeyboardEvent("keypress", {
              key: action.details.key,
              bubbles: true,
            });
            element.dispatchEvent(event);
          } else if (action.type === "input") {
            console.log(
              "REPLAYING INPUT ACTION",
              { element },
              `document.querySelector('${action.details.selector}').value = '${action.details.value}'; document.querySelector('${action.details.selector}').dispatchEvent(new Event('input', { bubbles: true }))`
            );
            if (element.value !== undefined) {
              element.value = action.details.value || "";
              // Trigger input event
              element.dispatchEvent(
                new Event("input", { bubbles: true })
              );
            }
          } else if (action.type === "change") {
            console.log("REPLAYING CHANGE ACTION", { element });
            if (
              element.type === "checkbox" ||
              element.type === "radio"
            ) {
              element.checked = action.details.checked;
            } else if (element.value !== undefined) {
              element.value = action.details.value || "";
            }
            // Trigger change event
            element.dispatchEvent(
              new Event("change", { bubbles: true })
            );
          }

          // Wait between actions (except for the last one)
          if (i < recordedActions.length - 1) {
            console.log("Waiting 0.9 seconds before next action...");
            await new Promise((resolve) => setTimeout(resolve, 900));
          }
        }

        console.log(
          "FINISHED REPLAYING " +
            recordedActions.length +
            " ACTION(S)"
        );

        // Send completion message to popup
        chrome.runtime.sendMessage({ action: "REPLAY_COMPLETE" });

        console.log("SENDING BACK SUCCESS FROM CONTENT");
        sendResponse({ success: true });
      }
    }
  );
})();

const onDocFocus = (event) => {
  let element = getElementSelector(event.target);
  if (!element) {
    console.log("COULDNT FIND AN ELEMENT");
    return;
  }

  console.log("DOCUMENT WAS FOCUSED", {
    selector: element,
    timestamp: new Date().toLocaleTimeString(),
  });

  // send to background
  if (backgroundPort) {
    backgroundPort.postMessage({
      type: "focus",
      details: {
        selector: getElementSelector(event.target),
        button: event.button,
        key: event.key,
        timestamp: new Date().toLocaleTimeString(),
      },
    });
  }
};

const onDocBlur = (event) => {
  let element = getElementSelector(event.target);
  if (!element) {
    console.log("COULDNT FIND AN ELEMENT");
    return;
  }

  console.log("DOCUMENT WAS BLURRED", {
    selector: element,
    timestamp: new Date().toLocaleTimeString(),
  });

  // send to background
  if (backgroundPort) {
    backgroundPort.postMessage({
      type: "blur",
      details: {
        selector: getElementSelector(event.target),
        button: event.button,
        key: event.key,
        timestamp: new Date().toLocaleTimeString(),
      },
    });
  }
};

const onDocClick = (event) => {
  let element = getElementSelector(event.target);
  if (!element) {
    console.log("COULDNT FIND AN ELEMENT");
    return;
  }

  console.log("DOCUMENT WAS CLICKED", {
    selector: element,
    button: event.button,
    key: event.key,
    timestamp: new Date().toLocaleTimeString(),
  });

  // send to background
  if (backgroundPort) {
    backgroundPort.postMessage({
      type: "click",
      details: {
        selector: getElementSelector(event.target),
        button: event.button,
        key: event.key,
        timestamp: new Date().toLocaleTimeString(),
      },
    });
  }
};

const onDocPointerDown = (event) => {
  let element = getElementSelector(event.target);
  if (!element) {
    console.log("COULDNT FIND AN ELEMENT");
    return;
  }

  console.log("DOCUMENT POINTERDOWN", {
    selector: element,
    button: event.button,
    key: event.key,
    timestamp: new Date().toLocaleTimeString(),
  });

  // send to background
  if (backgroundPort) {
    backgroundPort.postMessage({
      type: "pointerdown",
      details: {
        selector: element,
        button: event.button,
        key: event.key,
        timestamp: new Date().toLocaleTimeString(),
      },
    });
  }
};

const onKeyboardPress = (event) => {
  let element = getElementSelector(event.target);
  if (!element) {
    console.log("COULDNT FIND AN ELEMENT");
    return;
  }

  console.log("KEYBOARD WAS USED", {
    selector: element,
    button: event.button,
    key: event.key,
    timestamp: new Date().toLocaleTimeString(),
  });

  // send to background
  if (backgroundPort) {
    backgroundPort.postMessage({
      type: "keypress",
      details: {
        selector: getElementSelector(event.target),
        button: event.button,
        key: event.key,
        timestamp: new Date().toLocaleTimeString(),
      },
    });
  }
};

const onDocChange = (event) => {
  let element = getElementSelector(event.target);
  if (!element) {
    console.log("COULDNT FIND AN ELEMENT");
    return;
  }

  console.log("DOCUMENT WAS CHANGED", {
    selector: element,
    value: event.target.value,
    checked: event.target.checked,
  });

  // send to background
  if (backgroundPort) {
    backgroundPort.postMessage({
      type: "change",
      details: {
        selector: getElementSelector(event.target),
        value: event.target.value,
        checked: event.target.checked,
        timestamp: new Date().toLocaleTimeString(),
      },
    });
  }
};

const onInput = (event) => {
  let element = getElementSelector(event.target);
  if (!element) {
    console.log("COULDNT FIND AN ELEMENT");
    return;
  }

  console.log("INPUT WAS CHANGED", {
    selector: element,
    value: event.target.value,
    input: event.target.inputType,
  });

  // send to background
  if (backgroundPort) {
    backgroundPort.postMessage({
      type: "input",
      details: {
        selector: getElementSelector(event.target),
        value: event.target.value,
        inputType: event.inputType,
        timestamp: new Date().toLocaleTimeString(),
      },
    });
  }
};

// Validate that a selector is actually usable
const isValidSelector = (selector) => {
  try {
    document.querySelector(selector);
    return true;
  } catch (e) {
    console.warn("Invalid selector generated:", selector, e);
    return false;
  }
};

// Since we're filtering out problematic characters in getElementSelector,
// we can simplify this function to handle only the basic cases
const cssEscape = (str) => {
  // Use native CSS.escape if available
  if (window.CSS && typeof window.CSS.escape === "function") {
    return window.CSS.escape(str);
  }

  // Simple escape for basic cases - most strings should be safe now
  return String(str).replace(/["'\\]/g, "\\$&");
};

const ACTIONABLE_SEL = [
  "a[href]",
  "button",
  "input:not([type=hidden])",
  "select",
  "textarea",
  "label",
  "summary",
  "details",
  "[role=button]",
  "[role=link]",
  "[role=menuitem]",
  "[role=tab]",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const getElementSelector = (element) => {
  if (!(element instanceof Element)) return null;

  // Find the closest actionable ancestor (including self)
  const actionableEl = element.closest(ACTIONABLE_SEL);
  if (!actionableEl) return null;

  // Try ID first (most specific)
  if (actionableEl.id) {
    // Only use ID if it doesn't contain problematic characters
    const id = actionableEl.id;
    if (/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id)) {
      return `#${id}`;
    }
  }

  // Build selector starting with tag name
  let selector = actionableEl.nodeName.toLowerCase();

  // Add safe classes (avoid classes with special characters)
  if (
    actionableEl.className &&
    typeof actionableEl.className === "string"
  ) {
    const safeClasses = actionableEl.className
      .split(/\s+/)
      .filter((cls) => {
        // Only include classes that are safe (alphanumeric, hyphens, underscores)
        return (
          cls &&
          /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(cls) &&
          !cls.includes(":") &&
          cls.length < 50
        ); // Avoid very long class names
      })
      .slice(0, 3) // Limit to 3 classes to keep selectors manageable
      .map((cls) => `.${cls}`)
      .join("");

    if (safeClasses) {
      selector += safeClasses;
    }
  }

  // Add attributes for better specificity if needed
  const attrs = [];

  // Handle type attribute properly - only include if explicitly set and useful
  const explicitType = actionableEl.getAttribute("type");
  const tagName = actionableEl.tagName.toLowerCase();

  if (explicitType) {
    if (tagName === "input") {
      // For inputs, always include type since it's crucial for functionality
      attrs.push(`[type="${explicitType}"]`);
    } else if (tagName === "button") {
      // For buttons, only include if it's not the default "submit" or if explicitly set to submit
      // This handles cases where type="submit" is explicitly set vs implicit
      if (
        explicitType !== "submit" ||
        (explicitType === "submit" &&
          actionableEl.hasAttribute("type"))
      ) {
        attrs.push(`[type="${explicitType}"]`);
      }
    }
  }

  // Add name attribute if it exists and is safe
  if (
    actionableEl.name &&
    /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(actionableEl.name)
  ) {
    attrs.push(`[name="${actionableEl.name}"]`);
  }

  // Add role attribute if explicitly set
  const explicitRole = actionableEl.getAttribute("role");
  if (explicitRole) {
    attrs.push(`[role="${explicitRole}"]`);
  }

  // Add other useful attributes for better specificity
  if (actionableEl.getAttribute("data-testid")) {
    const testId = actionableEl.getAttribute("data-testid");
    if (/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(testId)) {
      attrs.push(`[data-testid="${testId}"]`);
    }
  }

  // Add aria-label for accessibility-based selection
  if (actionableEl.getAttribute("aria-label")) {
    const ariaLabel = actionableEl.getAttribute("aria-label");
    if (
      ariaLabel.length < 30 &&
      /^[a-zA-Z0-9\s_-]+$/.test(ariaLabel)
    ) {
      attrs.push(`[aria-label="${ariaLabel}"]`);
    }
  }

  // Add up to 2 attributes to keep selector manageable
  selector += attrs.slice(0, 2).join("");

  // Add nth-child/nth-of-type for uniqueness if still not unique enough
  const parent = actionableEl.parentElement;
  if (parent) {
    // Try to make selector unique by adding position
    const testSelector = selector;
    try {
      const matches = parent.querySelectorAll(testSelector);
      if (matches.length > 1) {
        const siblings = Array.from(parent.children).filter(
          (child) => child.nodeName === actionableEl.nodeName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(actionableEl) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }
    } catch (e) {
      console.warn(
        "Error testing selector uniqueness:",
        testSelector,
        e
      );
    }
  }

  // // Validate the selector before returning
  // if (!isValidSelector(selector)) {
  //   // Fallback to a simple tag + nth-of-type selector
  //   const parent = actionableEl.parentElement;
  //   if (parent) {
  //     const siblings = Array.from(parent.children).filter(
  //       (child) => child.nodeName === actionableEl.nodeName
  //     );
  //     const index = siblings.indexOf(actionableEl) + 1;
  //     selector = `${actionableEl.nodeName.toLowerCase()}:nth-of-type(${index})`;
  //   } else {
  //     selector = actionableEl.nodeName.toLowerCase();
  //   }
  // }

  return selector;
};
