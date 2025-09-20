// Utility functions for Record-n-Repeat extension

/**
 * Action Types and Data Structures
 */
const ActionTypes = {
  CLICK: 'click',
  DOUBLE_CLICK: 'dblclick',
  MOUSE_DOWN: 'mousedown',
  MOUSE_UP: 'mouseup',
  MOUSE_MOVE: 'mousemove',
  KEY_DOWN: 'keydown',
  KEY_UP: 'keyup',
  INPUT: 'input',
  CHANGE: 'change',
  SUBMIT: 'submit',
  SCROLL: 'scroll',
  FOCUS: 'focus',
  BLUR: 'blur'
};

/**
 * Element selector utilities
 */
class ElementSelector {
  /**
   * Generate a robust CSS selector for an element
   * @param {Element} element - The DOM element
   * @returns {string} CSS selector
   */
  static generate(element) {
    if (!element || element === document) return 'document';
    if (element === window) return 'window';
    
    // Try ID first (most reliable)
    if (element.id) {
      return `#${CSS.escape(element.id)}`;
    }
    
    // Try data attributes
    const dataId = element.getAttribute('data-testid') || 
                   element.getAttribute('data-cy') || 
                   element.getAttribute('data-test');
    if (dataId) {
      return `[data-testid="${CSS.escape(dataId)}"]`;
    }
    
    // Try aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      return `[aria-label="${CSS.escape(ariaLabel)}"]`;
    }
    
    // Build path-based selector
    return this.buildPathSelector(element);
  }

  /**
   * Build a path-based selector
   * @param {Element} element - The DOM element
   * @returns {string} CSS selector path
   */
  static buildPathSelector(element) {
    const path = [];
    let current = element;
    
    while (current && current !== document.body && path.length < 5) {
      let selector = current.tagName.toLowerCase();
      
      // Add class if available and meaningful
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.split(' ')
          .filter(c => c.length > 0 && !c.startsWith('ng-') && !c.startsWith('_'))
          .slice(0, 2); // Limit to 2 classes
        
        if (classes.length > 0) {
          selector += `.${classes.map(c => CSS.escape(c)).join('.')}`;
        }
      }
      
      // Add nth-child if there are multiple siblings of the same type
      const siblings = Array.from(current.parentNode?.children || [])
        .filter(sibling => sibling.tagName === current.tagName);
      
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
      
      path.unshift(selector);
      current = current.parentNode;
      
      // Stop if we found a unique selector
      if (current?.id) {
        path.unshift(`#${CSS.escape(current.id)}`);
        break;
      }
    }
    
    return path.join(' > ') || element.tagName.toLowerCase();
  }

  /**
   * Find element by selector with fallback strategies
   * @param {string} selector - CSS selector
   * @returns {Element|null} Found element
   */
  static find(selector) {
    try {
      if (selector === 'document') return document;
      if (selector === 'window') return window;
      
      // Try direct selector first
      let element = document.querySelector(selector);
      if (element) return element;
      
      // Try fuzzy matching for text content
      if (selector.includes('text=')) {
        const text = selector.split('text=')[1];
        element = this.findByText(text);
        if (element) return element;
      }
      
      // Try partial class matching
      if (selector.includes('.')) {
        const className = selector.split('.')[1]?.split(':')[0];
        if (className) {
          element = document.querySelector(`[class*="${className}"]`);
          if (element) return element;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding element:', selector, error);
      return null;
    }
  }

  /**
   * Find element by text content
   * @param {string} text - Text to search for
   * @returns {Element|null} Found element
   */
  static findByText(text) {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          return node.textContent.trim().includes(text) ? 
            NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        }
      }
    );
    
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.trim() === text) {
        return node;
      }
    }
    
    return null;
  }
}

/**
 * Action validation and sanitization utilities
 */
class ActionValidator {
  /**
   * Validate an action object
   * @param {Object} action - Action to validate
   * @returns {boolean} Is valid
   */
  static isValid(action) {
    if (!action || typeof action !== 'object') return false;
    if (!action.type || !Object.values(ActionTypes).includes(action.type)) return false;
    if (!action.timestamp || typeof action.timestamp !== 'number') return false;
    
    return true;
  }

  /**
   * Sanitize action data
   * @param {Object} action - Action to sanitize
   * @returns {Object} Sanitized action
   */
  static sanitize(action) {
    const sanitized = {
      type: action.type,
      timestamp: action.timestamp,
      delay: action.delay || 0,
      url: action.url
    };
    
    // Sanitize based on action type
    switch (action.type) {
      case ActionTypes.CLICK:
      case ActionTypes.DOUBLE_CLICK:
      case ActionTypes.MOUSE_DOWN:
      case ActionTypes.MOUSE_UP:
        sanitized.target = action.target;
        sanitized.x = Math.round(action.x || 0);
        sanitized.y = Math.round(action.y || 0);
        sanitized.button = action.button || 0;
        break;
        
      case ActionTypes.INPUT:
        sanitized.target = action.target;
        sanitized.value = String(action.value || '').substring(0, 1000); // Limit length
        break;
        
      case ActionTypes.KEY_DOWN:
      case ActionTypes.KEY_UP:
        sanitized.target = action.target;
        sanitized.key = action.key;
        sanitized.code = action.code;
        break;
        
      case ActionTypes.SCROLL:
        sanitized.target = action.target;
        sanitized.scrollTop = Math.round(action.scrollTop || 0);
        sanitized.scrollLeft = Math.round(action.scrollLeft || 0);
        break;
        
      default:
        sanitized.target = action.target;
    }
    
    return sanitized;
  }
}

/**
 * Action sequence utilities
 */
class ActionSequence {
  /**
   * Optimize action sequence by removing redundant actions
   * @param {Array} actions - Array of actions
   * @returns {Array} Optimized actions
   */
  static optimize(actions) {
    if (!Array.isArray(actions) || actions.length === 0) return [];
    
    const optimized = [];
    let lastAction = null;
    
    for (const action of actions) {
      // Skip invalid actions
      if (!ActionValidator.isValid(action)) continue;
      
      // Remove redundant mouse moves
      if (action.type === ActionTypes.MOUSE_MOVE) {
        if (lastAction?.type === ActionTypes.MOUSE_MOVE) {
          continue; // Skip redundant mouse move
        }
      }
      
      // Merge rapid input events
      if (action.type === ActionTypes.INPUT && 
          lastAction?.type === ActionTypes.INPUT &&
          lastAction?.target === action.target &&
          action.timestamp - lastAction.timestamp < 100) {
        lastAction.value = action.value;
        lastAction.timestamp = action.timestamp;
        continue;
      }
      
      optimized.push(ActionValidator.sanitize(action));
      lastAction = action;
    }
    
    return optimized;
  }

  /**
   * Split actions into logical groups/sessions
   * @param {Array} actions - Array of actions
   * @param {number} sessionGap - Gap in ms to split sessions (default: 30 seconds)
   * @returns {Array} Array of action groups
   */
  static groupSessions(actions, sessionGap = 30000) {
    if (!Array.isArray(actions) || actions.length === 0) return [];
    
    const sessions = [];
    let currentSession = [];
    let lastTimestamp = 0;
    
    for (const action of actions) {
      if (action.timestamp - lastTimestamp > sessionGap && currentSession.length > 0) {
        sessions.push([...currentSession]);
        currentSession = [];
      }
      
      currentSession.push(action);
      lastTimestamp = action.timestamp;
    }
    
    if (currentSession.length > 0) {
      sessions.push(currentSession);
    }
    
    return sessions;
  }
}

/**
 * Replay utilities
 */
class ReplayEngine {
  /**
   * Execute an action with proper timing
   * @param {Object} action - Action to execute
   * @param {Object} options - Replay options
   * @returns {Promise} Execution promise
   */
  static async executeAction(action, options = {}) {
    const { speedMultiplier = 1, maxDelay = 5000 } = options;
    
    // Apply speed multiplier to delay
    const delay = Math.min(action.delay / speedMultiplier, maxDelay);
    
    if (delay > 0) {
      await this.wait(delay);
    }
    
    const element = ElementSelector.find(action.target);
    
    switch (action.type) {
      case ActionTypes.CLICK:
        return this.simulateClick(element, action);
        
      case ActionTypes.INPUT:
        return this.simulateInput(element, action);
        
      case ActionTypes.KEY_DOWN:
        return this.simulateKeyboard(element, action);
        
      case ActionTypes.SCROLL:
        return this.simulateScroll(element, action);
        
      default:
        console.warn('Unsupported action type for replay:', action.type);
    }
  }

  /**
   * Simulate a click event
   * @param {Element} element - Target element
   * @param {Object} action - Action data
   */
  static simulateClick(element, action) {
    if (!element) {
      console.warn('Element not found for click action:', action.target);
      return;
    }
    
    const rect = element.getBoundingClientRect();
    const x = action.x || rect.left + rect.width / 2;
    const y = action.y || rect.top + rect.height / 2;
    
    element.dispatchEvent(new MouseEvent('click', {
      clientX: x,
      clientY: y,
      button: action.button || 0,
      bubbles: true,
      cancelable: true
    }));
  }

  /**
   * Simulate input
   * @param {Element} element - Target element
   * @param {Object} action - Action data
   */
  static simulateInput(element, action) {
    if (!element || (!element.tagName.match(/^(INPUT|TEXTAREA)$/i))) {
      console.warn('Invalid element for input action:', action.target);
      return;
    }
    
    element.value = action.value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * Simulate keyboard event
   * @param {Element} element - Target element
   * @param {Object} action - Action data
   */
  static simulateKeyboard(element, action) {
    if (!element) {
      console.warn('Element not found for keyboard action:', action.target);
      return;
    }
    
    element.dispatchEvent(new KeyboardEvent(action.type, {
      key: action.key,
      code: action.code,
      bubbles: true,
      cancelable: true
    }));
  }

  /**
   * Simulate scroll
   * @param {Element} element - Target element
   * @param {Object} action - Action data
   */
  static simulateScroll(element, action) {
    if (action.target === 'window' || action.target === 'document') {
      window.scrollTo(action.scrollLeft || 0, action.scrollTop || 0);
    } else if (element) {
      element.scrollTop = action.scrollTop || 0;
      element.scrollLeft = action.scrollLeft || 0;
    }
  }

  /**
   * Wait for specified duration
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise} Wait promise
   */
  static wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Storage utilities
 */
class StorageManager {
  /**
   * Save actions to storage
   * @param {Array} actions - Actions to save
   * @returns {Promise} Save promise
   */
  static async saveActions(actions) {
    try {
      await chrome.storage.local.set({ recordedActions: actions });
      return { success: true };
    } catch (error) {
      console.error('Failed to save actions:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Load actions from storage
   * @returns {Promise<Array>} Actions array
   */
  static async loadActions() {
    try {
      const result = await chrome.storage.local.get(['recordedActions']);
      return result.recordedActions || [];
    } catch (error) {
      console.error('Failed to load actions:', error);
      return [];
    }
  }

  /**
   * Clear all stored data
   * @returns {Promise} Clear promise
   */
  static async clearAll() {
    try {
      await chrome.storage.local.clear();
      return { success: true };
    } catch (error) {
      console.error('Failed to clear storage:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export utilities for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ActionTypes,
    ElementSelector,
    ActionValidator,
    ActionSequence,
    ReplayEngine,
    StorageManager
  };
} else if (typeof window !== 'undefined') {
  window.RecordNRepeatUtils = {
    ActionTypes,
    ElementSelector,
    ActionValidator,
    ActionSequence,
    ReplayEngine,
    StorageManager
  };
}