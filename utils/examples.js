// Example usage of Record-n-Repeat utility functions
// This file demonstrates how to use the various utility classes

// Example 1: Using ElementSelector to generate robust selectors
function demonstrateElementSelector() {
  console.log('=== ElementSelector Examples ===');
  
  // Get a button element
  const button = document.querySelector('button');
  if (button) {
    const selector = RecordNRepeatUtils.ElementSelector.generate(button);
    console.log('Generated selector for button:', selector);
    
    // Find it back
    const foundElement = RecordNRepeatUtils.ElementSelector.find(selector);
    console.log('Found element matches original:', foundElement === button);
  }
}

// Example 2: Validating and sanitizing actions
function demonstrateActionValidator() {
  console.log('=== ActionValidator Examples ===');
  
  const testAction = {
    type: 'click',
    target: '#test-button',
    x: 100,
    y: 200,
    timestamp: Date.now(),
    delay: 500,
    url: window.location.href,
    extraData: 'should be removed' // Will be filtered out
  };
  
  const isValid = RecordNRepeatUtils.ActionValidator.isValid(testAction);
  console.log('Action is valid:', isValid);
  
  const sanitized = RecordNRepeatUtils.ActionValidator.sanitize(testAction);
  console.log('Sanitized action:', sanitized);
}

// Example 3: Optimizing action sequences
function demonstrateActionSequence() {
  console.log('=== ActionSequence Examples ===');
  
  const sampleActions = [
    {
      type: 'mousemove',
      x: 100,
      y: 100,
      timestamp: Date.now(),
      delay: 10
    },
    {
      type: 'mousemove',
      x: 101,
      y: 101,
      timestamp: Date.now() + 10,
      delay: 10
    },
    {
      type: 'click',
      target: '#button',
      x: 150,
      y: 150,
      timestamp: Date.now() + 20,
      delay: 10
    },
    {
      type: 'input',
      target: '#text-field',
      value: 'test',
      timestamp: Date.now() + 100,
      delay: 80
    },
    {
      type: 'input',
      target: '#text-field',
      value: 'testing',
      timestamp: Date.now() + 150,
      delay: 50
    }
  ];
  
  console.log('Original actions count:', sampleActions.length);
  
  const optimized = RecordNRepeatUtils.ActionSequence.optimize(sampleActions);
  console.log('Optimized actions count:', optimized.length);
  console.log('Optimized actions:', optimized);
  
  // Group into sessions (using small gap for demo)
  const sessions = RecordNRepeatUtils.ActionSequence.groupSessions(optimized, 1000);
  console.log('Number of sessions:', sessions.length);
}

// Example 4: Using ReplayEngine
async function demonstrateReplayEngine() {
  console.log('=== ReplayEngine Examples ===');
  
  // Create a test button
  const testButton = document.createElement('button');
  testButton.id = 'demo-button';
  testButton.textContent = 'Click me!';
  testButton.style.cssText = 'padding: 10px; margin: 10px; font-size: 16px;';
  testButton.addEventListener('click', () => {
    console.log('Test button clicked!');
    testButton.textContent = 'Clicked!';
  });
  document.body.appendChild(testButton);
  
  // Create an action to click the button
  const clickAction = {
    type: 'click',
    target: '#demo-button',
    x: 100,
    y: 100,
    timestamp: Date.now(),
    delay: 1000
  };
  
  console.log('Executing click action in 2 seconds...');
  
  setTimeout(async () => {
    await RecordNRepeatUtils.ReplayEngine.executeAction(clickAction);
  }, 2000);
}

// Example 5: Using StorageManager (in extension context)
async function demonstrateStorageManager() {
  console.log('=== StorageManager Examples ===');
  
  if (typeof chrome !== 'undefined' && chrome.storage) {
    const testActions = [
      {
        type: 'click',
        target: '#test',
        timestamp: Date.now(),
        delay: 0
      }
    ];
    
    // Save actions
    const saveResult = await RecordNRepeatUtils.StorageManager.saveActions(testActions);
    console.log('Save result:', saveResult);
    
    // Load actions
    const loadedActions = await RecordNRepeatUtils.StorageManager.loadActions();
    console.log('Loaded actions:', loadedActions);
  } else {
    console.log('StorageManager requires Chrome extension context');
  }
}

// Example 6: Complete workflow simulation
function demonstrateCompleteWorkflow() {
  console.log('=== Complete Workflow Example ===');
  
  // Simulate recording a sequence of actions
  const recordedActions = [
    {
      type: 'click',
      target: '#login-button',
      x: 150,
      y: 50,
      timestamp: Date.now(),
      delay: 0,
      url: 'https://example.com/login'
    },
    {
      type: 'input',
      target: '#username',
      value: 'testuser',
      timestamp: Date.now() + 500,
      delay: 500,
      url: 'https://example.com/login'
    },
    {
      type: 'input',
      target: '#password',
      value: 'password123',
      timestamp: Date.now() + 1000,
      delay: 500,
      url: 'https://example.com/login'
    },
    {
      type: 'click',
      target: '#submit',
      x: 200,
      y: 100,
      timestamp: Date.now() + 1500,
      delay: 500,
      url: 'https://example.com/login'
    }
  ];
  
  console.log('Recorded', recordedActions.length, 'actions');
  
  // Validate all actions
  const validActions = recordedActions.filter(action => 
    RecordNRepeatUtils.ActionValidator.isValid(action)
  );
  console.log('Valid actions:', validActions.length);
  
  // Optimize the sequence
  const optimizedActions = RecordNRepeatUtils.ActionSequence.optimize(validActions);
  console.log('Optimized to', optimizedActions.length, 'actions');
  
  // Create export data
  const exportData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    actions: optimizedActions
  };
  
  console.log('Export data ready:', exportData);
  
  return exportData;
}

// Run demonstrations when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Running Record-n-Repeat utility demonstrations...');
  
  // Wait a bit for the page to settle
  setTimeout(() => {
    demonstrateElementSelector();
    demonstrateActionValidator();
    demonstrateActionSequence();
    demonstrateReplayEngine();
    demonstrateStorageManager();
    demonstrateCompleteWorkflow();
  }, 1000);
});

// Helper function to create a demo page for testing
function createDemoPage() {
  const demoContainer = document.createElement('div');
  demoContainer.id = 'record-n-repeat-demo';
  demoContainer.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    background: white;
    border: 2px solid #007bff;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 999999;
    font-family: Arial, sans-serif;
  `;
  
  demoContainer.innerHTML = `
    <h3 style="margin: 0 0 15px 0; color: #007bff;">Record-n-Repeat Demo</h3>
    <div style="margin-bottom: 10px;">
      <input type="text" id="demo-input" placeholder="Type something..." style="padding: 5px; margin-right: 10px;">
      <button id="demo-action" style="padding: 5px 10px;">Demo Action</button>
    </div>
    <div style="margin-bottom: 10px;">
      <input type="checkbox" id="demo-checkbox"> <label for="demo-checkbox">Check me</label>
    </div>
    <div>
      <button id="close-demo" style="padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 3px;">Close Demo</button>
    </div>
  `;
  
  // Add event listeners
  demoContainer.querySelector('#demo-action').addEventListener('click', () => {
    alert('Demo action triggered!');
  });
  
  demoContainer.querySelector('#close-demo').addEventListener('click', () => {
    demoContainer.remove();
  });
  
  document.body.appendChild(demoContainer);
}

// Add global function to create demo page
window.createRecordNRepeatDemo = createDemoPage;