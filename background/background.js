// Background service worker for Record-n-Repeat extension
class BackgroundService {
  constructor() {
    this.setupMessageListener();
    this.setupStorageListener();
    this.initializeExtension();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'ACTION_RECORDED':
          this.handleActionRecorded(request.actionData, sender);
          break;
          
        case 'GET_RECORDING_STATE':
          this.getRecordingState().then(sendResponse);
          return true; // Keep message channel open for async response
          
        case 'SET_RECORDING_STATE':
          this.setRecordingState(request.isRecording).then(sendResponse);
          return true;
          
        default:
          console.log('Unknown message action:', request.action);
      }
    });
  }

  setupStorageListener() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        if (changes.isRecording) {
          this.updateBadgeText(changes.isRecording.newValue);
        }
        
        if (changes.recordedActions) {
          const actionCount = changes.recordedActions.newValue?.length || 0;
          this.updateBadgeText(null, actionCount);
        }
      }
    });
  }

  async initializeExtension() {
    // Set initial badge state
    await this.updateBadgeText(false);
    
    // Clean up old data on startup
    await this.cleanupOldData();
    
    console.log('Record-n-Repeat background service initialized');
  }

  async handleActionRecorded(actionData, sender) {
    try {
      // Get current actions from storage
      const result = await chrome.storage.local.get(['recordedActions']);
      const actions = result.recordedActions || [];
      
      // Add new action
      actions.push(actionData);
      
      // Save back to storage
      await chrome.storage.local.set({ recordedActions: actions });
      
      // Update badge with action count
      this.updateBadgeText(null, actions.length);
      
      console.log('Action recorded:', actionData.type, 'Total actions:', actions.length);
    } catch (error) {
      console.error('Error handling recorded action:', error);
    }
  }

  async getRecordingState() {
    try {
      const result = await chrome.storage.local.get(['isRecording', 'recordedActions']);
      return {
        isRecording: result.isRecording || false,
        actionCount: result.recordedActions?.length || 0
      };
    } catch (error) {
      console.error('Error getting recording state:', error);
      return { isRecording: false, actionCount: 0 };
    }
  }

  async setRecordingState(isRecording) {
    try {
      await chrome.storage.local.set({ isRecording });
      this.updateBadgeText(isRecording);
      return { success: true };
    } catch (error) {
      console.error('Error setting recording state:', error);
      return { success: false, error: error.message };
    }
  }

  async updateBadgeText(isRecording = null, actionCount = null) {
    try {
      if (isRecording !== null) {
        if (isRecording) {
          await chrome.action.setBadgeText({ text: 'REC' });
          await chrome.action.setBadgeBackgroundColor({ color: '#dc3545' });
        } else {
          const result = await chrome.storage.local.get(['recordedActions']);
          const count = result.recordedActions?.length || 0;
          await chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
          await chrome.action.setBadgeBackgroundColor({ color: '#007bff' });
        }
      } else if (actionCount !== null) {
        const result = await chrome.storage.local.get(['isRecording']);
        if (!result.isRecording) {
          await chrome.action.setBadgeText({ text: actionCount > 0 ? actionCount.toString() : '' });
          await chrome.action.setBadgeBackgroundColor({ color: '#007bff' });
        }
      }
    } catch (error) {
      console.error('Error updating badge:', error);
    }
  }

  async cleanupOldData() {
    try {
      // Clean up data older than 7 days
      const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const result = await chrome.storage.local.get(['recordedActions']);
      
      if (result.recordedActions) {
        const filteredActions = result.recordedActions.filter(
          action => action.timestamp > cutoffTime
        );
        
        if (filteredActions.length !== result.recordedActions.length) {
          await chrome.storage.local.set({ recordedActions: filteredActions });
          console.log('Cleaned up old actions:', 
            result.recordedActions.length - filteredActions.length, 'removed');
        }
      }
    } catch (error) {
      console.error('Error cleaning up old data:', error);
    }
  }

  // Tab management
  async handleTabUpdated(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url) {
      // Check if recording is active and inject content script if needed
      const result = await chrome.storage.local.get(['isRecording']);
      if (result.isRecording) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content/content.js']
          });
        } catch (error) {
          console.error('Error injecting content script:', error);
        }
      }
    }
  }
}

// Utility functions for data management
class DataManager {
  static async exportData() {
    try {
      const result = await chrome.storage.local.get(['recordedActions']);
      const data = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        actions: result.recordedActions || []
      };
      
      return data;
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  }

  static async importData(data) {
    try {
      if (!data || !data.actions || !Array.isArray(data.actions)) {
        throw new Error('Invalid data format');
      }
      
      await chrome.storage.local.set({ recordedActions: data.actions });
      return { success: true, actionCount: data.actions.length };
    } catch (error) {
      console.error('Error importing data:', error);
      return { success: false, error: error.message };
    }
  }

  static async clearData() {
    try {
      await chrome.storage.local.remove(['recordedActions', 'isRecording']);
      return { success: true };
    } catch (error) {
      console.error('Error clearing data:', error);
      return { success: false, error: error.message };
    }
  }
}

// Context menu setup
function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'record-n-repeat-start',
      title: 'Start Recording',
      contexts: ['page']
    });
    
    chrome.contextMenus.create({
      id: 'record-n-repeat-stop',
      title: 'Stop Recording',
      contexts: ['page']
    });
    
    chrome.contextMenus.create({
      id: 'record-n-repeat-replay',
      title: 'Replay Actions',
      contexts: ['page']
    });
  });
}

// Context menu click handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    switch (info.menuItemId) {
      case 'record-n-repeat-start':
        await chrome.tabs.sendMessage(tab.id, { action: 'START_RECORDING' });
        break;
        
      case 'record-n-repeat-stop':
        await chrome.tabs.sendMessage(tab.id, { action: 'STOP_RECORDING' });
        break;
        
      case 'record-n-repeat-replay':
        const result = await chrome.storage.local.get(['recordedActions']);
        await chrome.tabs.sendMessage(tab.id, { 
          action: 'REPLAY_ACTIONS',
          actions: result.recordedActions || []
        });
        break;
    }
  } catch (error) {
    console.error('Context menu action failed:', error);
  }
});

// Tab event listeners
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (backgroundService) {
    backgroundService.handleTabUpdated(tabId, changeInfo, tab);
  }
});

// Extension lifecycle events
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Record-n-Repeat extension installed/updated:', details.reason);
  setupContextMenus();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Record-n-Repeat extension startup');
  setupContextMenus();
});

// Initialize background service
const backgroundService = new BackgroundService();

// Export utility functions for use by other scripts
self.DataManager = DataManager;