// Popup script for Record-n-Repeat extension
class PopupController {
  constructor() {
    this.isRecording = false;
    this.isPlaying = false;
    this.actions = [];
    
    this.initializeElements();
    this.bindEvents();
    this.loadState();
  }

  initializeElements() {
    this.recordBtn = document.getElementById('recordBtn');
    this.stopBtn = document.getElementById('stopBtn');
    this.playBtn = document.getElementById('playBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.exportBtn = document.getElementById('exportBtn');
    this.importBtn = document.getElementById('importBtn');
    this.statusDot = document.getElementById('statusDot');
    this.statusText = document.getElementById('statusText');
    this.actionCount = document.getElementById('actionCount');
    this.actionsList = document.getElementById('actionsList');
    this.fileInput = document.getElementById('fileInput');
  }

  bindEvents() {
    this.recordBtn.addEventListener('click', () => this.startRecording());
    this.stopBtn.addEventListener('click', () => this.stopRecording());
    this.playBtn.addEventListener('click', () => this.playActions());
    this.clearBtn.addEventListener('click', () => this.clearActions());
    this.exportBtn.addEventListener('click', () => this.exportActions());
    this.importBtn.addEventListener('click', () => this.importActions());
    this.fileInput.addEventListener('change', (e) => this.handleFileImport(e));
  }

  async loadState() {
    try {
      const result = await chrome.storage.local.get(['actions', 'isRecording']);
      this.actions = result.actions || [];
      this.isRecording = result.isRecording || false;
      
      this.updateUI();
      this.updateActionsList();
    } catch (error) {
      console.error('Failed to load state:', error);
    }
  }

  async saveState() {
    try {
      await chrome.storage.local.set({
        actions: this.actions,
        isRecording: this.isRecording
      });
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  async startRecording() {
    this.isRecording = true;
    this.actions = []; // Clear previous actions
    
    // Send message to content script to start recording
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    try {
      await chrome.tabs.sendMessage(tab.id, { 
        action: 'START_RECORDING' 
      });
      
      this.updateUI();
      this.saveState();
      this.showNotification('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.isRecording = false;
      this.updateUI();
    }
  }

  async stopRecording() {
    this.isRecording = false;
    
    // Send message to content script to stop recording
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    try {
      await chrome.tabs.sendMessage(tab.id, { 
        action: 'STOP_RECORDING' 
      });
      
      this.updateUI();
      this.saveState();
      this.showNotification('Recording stopped');
      
      // Retrieve recorded actions
      this.retrieveActions();
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  }

  async playActions() {
    if (this.actions.length === 0) {
      this.showNotification('No actions to replay');
      return;
    }

    this.isPlaying = true;
    this.updateUI();

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    try {
      await chrome.tabs.sendMessage(tab.id, { 
        action: 'REPLAY_ACTIONS',
        actions: this.actions
      });
      
      this.showNotification('Replaying actions...');
      
      // Listen for replay completion
      setTimeout(() => {
        this.isPlaying = false;
        this.updateUI();
        this.showNotification('Replay completed');
      }, 1000); // Adjust based on actual replay duration
      
    } catch (error) {
      console.error('Failed to replay actions:', error);
      this.isPlaying = false;
      this.updateUI();
    }
  }

  async retrieveActions() {
    try {
      const result = await chrome.storage.local.get(['recordedActions']);
      this.actions = result.recordedActions || [];
      this.updateActionsList();
      this.saveState();
    } catch (error) {
      console.error('Failed to retrieve actions:', error);
    }
  }

  clearActions() {
    this.actions = [];
    this.updateActionsList();
    this.saveState();
    chrome.storage.local.remove(['recordedActions']);
    this.showNotification('Actions cleared');
  }

  exportActions() {
    if (this.actions.length === 0) {
      this.showNotification('No actions to export');
      return;
    }

    const data = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      actions: this.actions
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `record-n-repeat-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    this.showNotification('Actions exported');
  }

  importActions() {
    this.fileInput.click();
  }

  handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        if (data.actions && Array.isArray(data.actions)) {
          this.actions = data.actions;
          this.updateActionsList();
          this.saveState();
          this.showNotification('Actions imported successfully');
        } else {
          this.showNotification('Invalid file format');
        }
      } catch (error) {
        console.error('Failed to import actions:', error);
        this.showNotification('Failed to import actions');
      }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
  }

  updateUI() {
    // Update status
    if (this.isRecording) {
      this.statusDot.className = 'status-dot recording';
      this.statusText.textContent = 'Recording...';
    } else if (this.isPlaying) {
      this.statusDot.className = 'status-dot playing';
      this.statusText.textContent = 'Playing...';
    } else {
      this.statusDot.className = 'status-dot';
      this.statusText.textContent = 'Ready';
    }

    // Update buttons
    this.recordBtn.disabled = this.isRecording || this.isPlaying;
    this.stopBtn.disabled = !this.isRecording;
    this.playBtn.disabled = this.isRecording || this.isPlaying || this.actions.length === 0;
    this.exportBtn.disabled = this.actions.length === 0;

    // Update button text
    if (this.isRecording) {
      this.recordBtn.innerHTML = '<span class="btn-icon">●</span>Recording...';
    } else {
      this.recordBtn.innerHTML = '<span class="btn-icon">●</span>Start Recording';
    }
  }

  updateActionsList() {
    this.actionCount.textContent = this.actions.length;

    if (this.actions.length === 0) {
      this.actionsList.innerHTML = '<p class="empty-state">No actions recorded yet</p>';
      return;
    }

    const actionsHTML = this.actions.slice(-10).map((action, index) => `
      <div class="action-item">
        <div>
          <div class="action-type">${action.type}</div>
          <div class="action-details">${this.formatActionDetails(action)}</div>
        </div>
        <div class="action-timestamp">${this.formatTimestamp(action.timestamp)}</div>
      </div>
    `).join('');

    this.actionsList.innerHTML = actionsHTML;
  }

  formatActionDetails(action) {
    switch (action.type) {
      case 'click':
        return `${action.target} at (${action.x}, ${action.y})`;
      case 'input':
        return `"${action.value}" in ${action.target}`;
      case 'scroll':
        return `to (${action.x}, ${action.y})`;
      case 'keypress':
        return `key: ${action.key}`;
      default:
        return JSON.stringify(action.data || {});
    }
  }

  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  }

  showNotification(message) {
    // Simple notification system - could be enhanced
    console.log('Notification:', message);
    
    // You could add a toast notification here
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #28a745;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});

// Listen for messages from background or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ACTION_RECORDED') {
    // Handle action recorded from content script
    console.log('Action recorded:', request.actionData);
  }
});