// Content script for recording user actions
class ActionRecorder {
  constructor() {
    this.isRecording = false;
    this.actions = [];
    this.startTime = null;
    this.lastActionTime = null;
    
    this.setupMessageListener();
    this.loadRecordingIndicator();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'START_RECORDING':
          this.startRecording();
          sendResponse({ success: true });
          break;
          
        case 'STOP_RECORDING':
          this.stopRecording();
          sendResponse({ success: true });
          break;
          
        case 'REPLAY_ACTIONS':
          this.replayActions(request.actions);
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    });
  }

  startRecording() {
    if (this.isRecording) return;
    
    this.isRecording = true;
    this.actions = [];
    this.startTime = Date.now();
    this.lastActionTime = this.startTime;
    
    this.addEventListeners();
    this.showRecordingIndicator();
    
    console.log('Recording started on:', window.location.href);
  }

  stopRecording() {
    if (!this.isRecording) return;
    
    this.isRecording = false;
    this.removeEventListeners();
    this.hideRecordingIndicator();
    
    // Save actions to storage
    chrome.storage.local.set({ recordedActions: this.actions });
    
    console.log('Recording stopped. Total actions:', this.actions.length);
  }

  addEventListeners() {
    // Mouse events
    document.addEventListener('click', this.handleClick, true);
    document.addEventListener('dblclick', this.handleDoubleClick, true);
    document.addEventListener('mousedown', this.handleMouseDown, true);
    document.addEventListener('mouseup', this.handleMouseUp, true);
    document.addEventListener('mousemove', this.handleMouseMove, true);
    
    // Keyboard events
    document.addEventListener('keydown', this.handleKeyDown, true);
    document.addEventListener('keyup', this.handleKeyUp, true);
    document.addEventListener('input', this.handleInput, true);
    
    // Form events
    document.addEventListener('change', this.handleChange, true);
    document.addEventListener('submit', this.handleSubmit, true);
    
    // Scroll events
    document.addEventListener('scroll', this.handleScroll, true);
    window.addEventListener('scroll', this.handleScroll, true);
    
    // Focus events
    document.addEventListener('focus', this.handleFocus, true);
    document.addEventListener('blur', this.handleBlur, true);
  }

  removeEventListeners() {
    // Mouse events
    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('dblclick', this.handleDoubleClick, true);
    document.removeEventListener('mousedown', this.handleMouseDown, true);
    document.removeEventListener('mouseup', this.handleMouseUp, true);
    document.removeEventListener('mousemove', this.handleMouseMove, true);
    
    // Keyboard events
    document.removeEventListener('keydown', this.handleKeyDown, true);
    document.removeEventListener('keyup', this.handleKeyUp, true);
    document.removeEventListener('input', this.handleInput, true);
    
    // Form events
    document.removeEventListener('change', this.handleChange, true);
    document.removeEventListener('submit', this.handleSubmit, true);
    
    // Scroll events
    document.removeEventListener('scroll', this.handleScroll, true);
    window.removeEventListener('scroll', this.handleScroll, true);
    
    // Focus events
    document.removeEventListener('focus', this.handleFocus, true);
    document.removeEventListener('blur', this.handleBlur, true);
  }

  // Event handlers
  handleClick = (event) => {
    this.recordAction({
      type: 'click',
      target: this.getElementSelector(event.target),
      x: event.clientX,
      y: event.clientY,
      button: event.button,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey
    });
  }

  handleDoubleClick = (event) => {
    this.recordAction({
      type: 'dblclick',
      target: this.getElementSelector(event.target),
      x: event.clientX,
      y: event.clientY,
      button: event.button
    });
  }

  handleMouseDown = (event) => {
    this.recordAction({
      type: 'mousedown',
      target: this.getElementSelector(event.target),
      x: event.clientX,
      y: event.clientY,
      button: event.button
    });
  }

  handleMouseUp = (event) => {
    this.recordAction({
      type: 'mouseup',
      target: this.getElementSelector(event.target),
      x: event.clientX,
      y: event.clientY,
      button: event.button
    });
  }

  handleMouseMove = (event) => {
    // Throttle mouse move events to avoid too many recordings
    const now = Date.now();
    if (now - this.lastActionTime < 100) return; // Throttle to 10 events per second
    
    this.recordAction({
      type: 'mousemove',
      x: event.clientX,
      y: event.clientY
    });
  }

  handleKeyDown = (event) => {
    this.recordAction({
      type: 'keydown',
      target: this.getElementSelector(event.target),
      key: event.key,
      code: event.code,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey
    });
  }

  handleKeyUp = (event) => {
    this.recordAction({
      type: 'keyup',
      target: this.getElementSelector(event.target),
      key: event.key,
      code: event.code
    });
  }

  handleInput = (event) => {
    this.recordAction({
      type: 'input',
      target: this.getElementSelector(event.target),
      value: event.target.value,
      inputType: event.inputType
    });
  }

  handleChange = (event) => {
    this.recordAction({
      type: 'change',
      target: this.getElementSelector(event.target),
      value: event.target.value,
      checked: event.target.checked
    });
  }

  handleSubmit = (event) => {
    this.recordAction({
      type: 'submit',
      target: this.getElementSelector(event.target)
    });
  }

  handleScroll = (event) => {
    this.recordAction({
      type: 'scroll',
      target: this.getElementSelector(event.target),
      scrollTop: event.target.scrollTop || window.pageYOffset,
      scrollLeft: event.target.scrollLeft || window.pageXOffset
    });
  }

  handleFocus = (event) => {
    this.recordAction({
      type: 'focus',
      target: this.getElementSelector(event.target)
    });
  }

  handleBlur = (event) => {
    this.recordAction({
      type: 'blur',
      target: this.getElementSelector(event.target)
    });
  }

  recordAction(actionData) {
    if (!this.isRecording) return;
    
    const now = Date.now();
    const action = {
      ...actionData,
      timestamp: now,
      delay: now - this.lastActionTime,
      url: window.location.href
    };
    
    this.actions.push(action);
    this.lastActionTime = now;
    
    // Notify background script about the new action
    chrome.runtime.sendMessage({
      action: 'ACTION_RECORDED',
      actionData: action
    });
  }

  getElementSelector(element) {
    if (!element || element === document) return 'document';
    if (element === window) return 'window';
    
    // Try to get a meaningful selector
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(c => c.length > 0);
      if (classes.length > 0) {
        return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
      }
    }
    
    // Try to get a unique selector based on hierarchy
    const path = [];
    let current = element;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector = `#${current.id}`;
        path.unshift(selector);
        break;
      }
      
      // Add nth-child if there are siblings of the same type
      const siblings = Array.from(current.parentNode?.children || [])
        .filter(sibling => sibling.tagName === current.tagName);
      
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
      
      path.unshift(selector);
      current = current.parentNode;
    }
    
    return path.join(' > ') || element.tagName.toLowerCase();
  }

  // Action replay functionality
  async replayActions(actions) {
    if (!actions || actions.length === 0) {
      console.log('No actions to replay');
      return;
    }
    
    console.log('Starting replay of', actions.length, 'actions');
    
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      
      // Wait for the delay between actions
      if (action.delay && i > 0) {
        await this.wait(Math.min(action.delay, 5000)); // Cap delay at 5 seconds
      }
      
      await this.replayAction(action);
    }
    
    console.log('Replay completed');
  }

  async replayAction(action) {
    try {
      const element = this.findElement(action.target);
      
      switch (action.type) {
        case 'click':
          if (element) {
            this.simulateClick(element, action);
          }
          break;
          
        case 'input':
          if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
            element.value = action.value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
          }
          break;
          
        case 'keydown':
          if (element) {
            element.dispatchEvent(new KeyboardEvent('keydown', {
              key: action.key,
              code: action.code,
              ctrlKey: action.ctrlKey,
              shiftKey: action.shiftKey,
              altKey: action.altKey,
              metaKey: action.metaKey,
              bubbles: true
            }));
          }
          break;
          
        case 'scroll':
          if (action.target === 'window' || action.target === 'document') {
            window.scrollTo(action.scrollLeft || 0, action.scrollTop || 0);
          } else if (element) {
            element.scrollTop = action.scrollTop || 0;
            element.scrollLeft = action.scrollLeft || 0;
          }
          break;
          
        case 'change':
          if (element) {
            if (element.type === 'checkbox' || element.type === 'radio') {
              element.checked = action.checked;
            } else {
              element.value = action.value;
            }
            element.dispatchEvent(new Event('change', { bubbles: true }));
          }
          break;
          
        default:
          console.log('Unsupported action type for replay:', action.type);
      }
    } catch (error) {
      console.error('Error replaying action:', error, action);
    }
  }

  findElement(selector) {
    try {
      if (selector === 'document') return document;
      if (selector === 'window') return window;
      
      return document.querySelector(selector);
    } catch (error) {
      console.error('Error finding element:', selector, error);
      return null;
    }
  }

  simulateClick(element, action) {
    const rect = element.getBoundingClientRect();
    const x = action.x || rect.left + rect.width / 2;
    const y = action.y || rect.top + rect.height / 2;
    
    element.dispatchEvent(new MouseEvent('click', {
      clientX: x,
      clientY: y,
      button: action.button || 0,
      ctrlKey: action.ctrlKey || false,
      shiftKey: action.shiftKey || false,
      altKey: action.altKey || false,
      metaKey: action.metaKey || false,
      bubbles: true,
      cancelable: true
    }));
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Visual indicators
  showRecordingIndicator() {
    this.loadRecordingIndicator();
    if (this.recordingIndicator) {
      this.recordingIndicator.style.display = 'block';
    }
  }

  hideRecordingIndicator() {
    if (this.recordingIndicator) {
      this.recordingIndicator.style.display = 'none';
    }
  }

  loadRecordingIndicator() {
    if (this.recordingIndicator) return;
    
    this.recordingIndicator = document.createElement('div');
    this.recordingIndicator.id = 'record-n-repeat-indicator';
    this.recordingIndicator.innerHTML = '● REC';
    this.recordingIndicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #dc3545;
      color: white;
      padding: 8px 12px;
      border-radius: 20px;
      font-family: monospace;
      font-size: 12px;
      font-weight: bold;
      z-index: 999999;
      display: none;
      animation: pulse 1.5s infinite;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(this.recordingIndicator);
  }
}

// Initialize the action recorder
const actionRecorder = new ActionRecorder();

// Log that content script is loaded
console.log('Record-n-Repeat content script loaded on:', window.location.href);