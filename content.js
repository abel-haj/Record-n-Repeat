// ===== EVENT RECORDING CONFIGURATION =====
// Toggle these flags to control which events are recorded
// Set to true to ENABLE recording, false to DISABLE
const EVENT_CONFIG = {
  click: true, // Mouse clicks
  pointerdown: true, // Pointer/touch down events // some events require pointerdown events
  keypress: false, // Key presses (disabled by default - can be noisy)
  input: false, // Input field changes (typing)
  change: false, // Form element changes (checkboxes, selects, etc.)
  focus: false, // Element focus events (disabled by default)
  blur: false, // Element blur events (disabled by default)
};

// Helper function to get current configuration summary
const getEventConfigSummary = () => {
  const active = Object.entries(EVENT_CONFIG)
    .filter(([, enabled]) => enabled)
    .map(([event]) => event);
  const inactive = Object.entries(EVENT_CONFIG)
    .filter(([, enabled]) => !enabled)
    .map(([event]) => event);

  return {
    active,
    inactive,
    total: Object.keys(EVENT_CONFIG).length,
  };
};

// Display active events for debugging
const configSummary = getEventConfigSummary();
console.log("🎯 Record-n-Repeat Event Configuration:", {
  wouldBeActiveEvents: configSummary.active,
  wouldBeInactiveEvents: configSummary.inactive,
  summary: `${configSummary.active.length}/${configSummary.total} events enabled`,
});
// =========================================

const ACTIONS = {
  RECORD: "START_RECORDING",
  STOP: "STOP_RECORDING",
  REPLAY: "REPLAY_RECORDING",
};
let backgroundPort = null;

// ===== VISUAL FEEDBACK SYSTEM =====
class FeedbackUI {
  constructor() {
    this.container = null;
    this.recordingIndicator = null;
    this.replayIndicator = null;
  }

  createContainer() {
    if (this.container) return;

    this.container = document.createElement("div");
    this.container.id = "record-repeat-feedback";
    this.container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    document.body.appendChild(this.container);
  }

  showRecordingIndicator() {
    this.createContainer();
    this.hideReplayIndicator(); // Hide replay if active

    if (this.recordingIndicator) return;

    this.recordingIndicator = document.createElement("div");
    this.recordingIndicator.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #ff475794, #ff37424d);
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(255, 71, 87, 0.3);
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 600;
        animation: pulse 2s infinite;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          animation: blink 1s infinite;
        "></div>
        REC
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
      </style>
    `;

    this.container.appendChild(this.recordingIndicator);
  }

  hideRecordingIndicator() {
    if (this.recordingIndicator) {
      this.recordingIndicator.remove();
      this.recordingIndicator = null;
    }
  }

  showReplayIndicator(currentAction = 0, totalActions = 0) {
    this.createContainer();
    this.hideRecordingIndicator(); // Hide recording if active

    if (!this.replayIndicator) {
      this.replayIndicator = document.createElement("div");
      this.container.appendChild(this.replayIndicator);
    }

    const progressPercent =
      totalActions > 0 ? (currentAction / totalActions) * 100 : 0;

    this.replayIndicator.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #3742fa9e, #3742fa45);
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(55, 66, 250, 0.3);
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 14px;
        font-weight: 600;
        min-width: 200px;
      ">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="
            width: 8px;
            height: 8px;
            background: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          "></div>
          Replaying Actions
        </div>
        <div style="
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          height: 4px;
          overflow: hidden;
        ">
          <div style="
            background: white;
            height: 100%;
            width: ${progressPercent}%;
            transition: width 0.3s ease;
          "></div>
        </div>
        <div style="font-size: 12px; opacity: 0.9;">
          ${currentAction} / ${totalActions}
        </div>
      </div>
      <style>
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      </style>
    `;
  }

  hideReplayIndicator() {
    if (this.replayIndicator) {
      this.replayIndicator.remove();
      this.replayIndicator = null;
    }
  }

  showActionHighlight(element) {
    if (!element) return;

    const highlight = document.createElement("div");
    const rect = element.getBoundingClientRect();

    highlight.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 2px solid #3742fa;
      border-radius: 4px;
      background: rgba(55, 66, 250, 0.1);
      pointer-events: none;
      z-index: 2147483646;
      animation: highlightPulse 0.6s ease-out;
    `;

    const style = document.createElement("style");
    style.textContent = `
      @keyframes highlightPulse {
        0% { transform: scale(1.1); opacity: 0; }
        50% { transform: scale(1); opacity: 1; }
        100% { transform: scale(1); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(highlight);

    setTimeout(() => {
      highlight.remove();
      style.remove();
    }, 600);
  }

  cleanup() {
    if (this.container) {
      this.container.remove();
      this.container = null;
      this.recordingIndicator = null;
      this.replayIndicator = null;
    }
  }
}

const feedbackUI = new FeedbackUI();
// =====================================

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

        // bind listeners to actionable elements based on configuration
        const actionableElements = document.querySelectorAll(ACTIONABLE_SEL);
        const activeEvents = [];
        
        actionableElements.forEach(element => {
          if (EVENT_CONFIG.focus) {
            element.addEventListener("focus", onDocFocus);
            if (!activeEvents.includes("focus")) activeEvents.push("focus");
          }
          if (EVENT_CONFIG.blur) {
            element.addEventListener("blur", onDocBlur);
            if (!activeEvents.includes("blur")) activeEvents.push("blur");
          }
          if (EVENT_CONFIG.click) {
            element.addEventListener("click", onDocClick);
            if (!activeEvents.includes("click")) activeEvents.push("click");
          }
          if (EVENT_CONFIG.pointerdown) {
            element.addEventListener("pointerdown", onDocPointerDown);
            if (!activeEvents.includes("pointerdown")) activeEvents.push("pointerdown");
          }
          if (EVENT_CONFIG.keypress) {
            element.addEventListener("keypress", onKeyboardPress);
            if (!activeEvents.includes("keypress")) activeEvents.push("keypress");
          }
          if (EVENT_CONFIG.change) {
            element.addEventListener("change", onDocChange);
            if (!activeEvents.includes("change")) activeEvents.push("change");
          }
          if (EVENT_CONFIG.input) {
            element.addEventListener("input", onInput);
            if (!activeEvents.includes("input")) activeEvents.push("input");
          }
        });

        console.log("🎯 LISTENING FOR EVENTS:", activeEvents);

        // Show recording feedback
        feedbackUI.showRecordingIndicator();
      }

      if (request.action === ACTIONS.STOP) {
        isRecording = false;

        if (backgroundPort) {
          backgroundPort.disconnect();
          backgroundPort = null;
        }

        // unbind listeners from actionable elements based on configuration
        const actionableElements = document.querySelectorAll(ACTIONABLE_SEL);
        const removedEvents = [];
        
        actionableElements.forEach(element => {
          if (EVENT_CONFIG.focus) {
            element.removeEventListener("focus", onDocFocus);
            if (!removedEvents.includes("focus")) removedEvents.push("focus");
          }
          if (EVENT_CONFIG.blur) {
            element.removeEventListener("blur", onDocBlur);
            if (!removedEvents.includes("blur")) removedEvents.push("blur");
          }
          if (EVENT_CONFIG.click) {
            element.removeEventListener("click", onDocClick);
            if (!removedEvents.includes("click")) removedEvents.push("click");
          }
          if (EVENT_CONFIG.pointerdown) {
            element.removeEventListener("pointerdown", onDocPointerDown);
            if (!removedEvents.includes("pointerdown")) removedEvents.push("pointerdown");
          }
          if (EVENT_CONFIG.keypress) {
            element.removeEventListener("keypress", onKeyboardPress);
            if (!removedEvents.includes("keypress")) removedEvents.push("keypress");
          }
          if (EVENT_CONFIG.change) {
            element.removeEventListener("change", onDocChange);
            if (!removedEvents.includes("change")) removedEvents.push("change");
          }
          if (EVENT_CONFIG.input) {
            element.removeEventListener("input", onInput);
            if (!removedEvents.includes("input")) removedEvents.push("input");
          }
        });

        console.log("🛑 STOPPED LISTENING FOR:", removedEvents);

        // Hide recording feedback
        feedbackUI.hideRecordingIndicator();
      }

      if (request.action === ACTIONS.REPLAY) {
        recordedActions = request.replay || [];

        console.log("REPLAYING RECORDED ACTIONS...", {
          recordedActions,
        });

        // Show replay feedback
        feedbackUI.showReplayIndicator(0, recordedActions.length);

        for (let i = 0; i < recordedActions.length; i++) {
          const action = recordedActions[i];
          const element = document.querySelector(
            action.details.selector
          );

          // Update replay progress
          feedbackUI.showReplayIndicator(
            i + 1,
            recordedActions.length
          );

          if (!element) {
            // console.warn(
            //   "Element not found for selector:",
            //   action.details.selector
            // );
            // continue;
          }

          // Highlight the element being acted upon
          feedbackUI.showActionHighlight(element);

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

        // Hide replay feedback
        feedbackUI.hideReplayIndicator();

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
