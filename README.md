# Record-n-Repeat

A browser extension that records user actions on web pages and allows you to replay them. Perfect for automating repetitive tasks, testing web applications, or creating user interaction demos.

## Features

- **Record User Actions**: Capture clicks, keyboard input, scrolling, form interactions, and more
- **Visual Recording Indicator**: See when recording is active with a clear visual indicator
- **Action Replay**: Replay recorded actions with configurable speed
- **Export/Import**: Save and share your recorded action sequences
- **Optimized Playback**: Intelligent action optimization for smoother replays
- **Cross-Browser Support**: Works with Chrome and Firefox (Manifest V3)

## Installation

### From Source

1. Clone this repository:
   ```bash
   git clone https://github.com/abel-haj/Record-n-Repeat.git
   cd Record-n-Repeat
   ```

2. Load the extension in your browser:

   **Chrome:**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the project directory

   **Firefox:**
   - Open `about:debugging`
   - Click "This Firefox"
   - Click "Load Temporary Add-on" and select the `manifest.json` file

### Generate Icons (Optional)

Convert the SVG icon to PNG format for better browser support:
```bash
# Install imagemagick if not already installed
sudo apt-get install imagemagick

# Generate PNG icons from SVG
convert icons/icon.svg -resize 16x16 icons/icon16.png
convert icons/icon.svg -resize 32x32 icons/icon32.png
convert icons/icon.svg -resize 48x48 icons/icon48.png
convert icons/icon.svg -resize 128x128 icons/icon128.png
```

## Usage

### Recording Actions

1. **Start Recording**:
   - Click the extension icon in your browser toolbar
   - Click "Start Recording" button
   - A red "REC" indicator will appear on the page

2. **Perform Actions**:
   - Interact with the web page normally
   - All actions (clicks, typing, scrolling, etc.) are automatically recorded

3. **Stop Recording**:
   - Click the extension icon again
   - Click "Stop Recording" button
   - The recording indicator will disappear

### Replaying Actions

1. **Start Replay**:
   - Click the extension icon
   - Click "Replay Actions" button
   - Watch as your actions are replayed automatically

2. **Manage Recordings**:
   - View recorded actions in the popup
   - Export recordings as JSON files
   - Import previously saved recordings
   - Clear all recorded actions

### Context Menu (Alternative)

Right-click on any page to access quick actions:
- Start Recording
- Stop Recording
- Replay Actions

## File Structure

```
Record-n-Repeat/
├── manifest.json           # Extension configuration
├── popup/
│   ├── popup.html          # Extension popup interface
│   ├── popup.css           # Popup styling
│   └── popup.js            # Popup functionality
├── content/
│   └── content.js          # Content script for action recording
├── background/
│   └── background.js       # Background service worker
├── utils/
│   └── utils.js            # Utility functions and helpers
├── icons/
│   ├── icon.svg            # Source icon file
│   ├── icon16.png          # 16x16 icon
│   ├── icon32.png          # 32x32 icon
│   ├── icon48.png          # 48x48 icon
│   └── icon128.png         # 128x128 icon
└── README.md               # This file
```

## Recorded Action Types

The extension captures the following user interactions:

- **Mouse Events**: Clicks, double-clicks, mouse up/down, mouse movement
- **Keyboard Events**: Key presses, key releases, text input
- **Form Events**: Input changes, form submissions, focus/blur
- **Scroll Events**: Page and element scrolling
- **Navigation**: Page loads and URL changes

## Utility Functions

The extension provides several utility classes for developers:

### ElementSelector
```javascript
// Generate robust CSS selectors
const selector = ElementSelector.generate(element);

// Find elements with fallback strategies
const element = ElementSelector.find(selector);
```

### ActionValidator
```javascript
// Validate action objects
const isValid = ActionValidator.isValid(action);

// Sanitize action data
const clean = ActionValidator.sanitize(action);
```

### ActionSequence
```javascript
// Optimize action sequences
const optimized = ActionSequence.optimize(actions);

// Group actions into sessions
const sessions = ActionSequence.groupSessions(actions);
```

### ReplayEngine
```javascript
// Execute individual actions
await ReplayEngine.executeAction(action, { speedMultiplier: 1.5 });

// Simulate different event types
ReplayEngine.simulateClick(element, action);
ReplayEngine.simulateInput(element, action);
```

### StorageManager
```javascript
// Save/load actions
await StorageManager.saveActions(actions);
const actions = await StorageManager.loadActions();
```

## Data Format

Recorded actions are stored in JSON format:

```json
{
  "version": "1.0",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "actions": [
    {
      "type": "click",
      "target": "#submit-button",
      "x": 150,
      "y": 200,
      "timestamp": 1704067200000,
      "delay": 500,
      "url": "https://example.com"
    }
  ]
}
```

## Development

### Building
No build process required - this is a pure JavaScript extension.

### Testing
Load the extension in developer mode and test on various websites.

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Browser Compatibility

- **Chrome**: 88+ (Manifest V3 support)
- **Firefox**: 109+ (Manifest V3 support)
- **Edge**: 88+ (Chromium-based)

## Privacy & Security

- No data is sent to external servers
- All recordings are stored locally in your browser
- Actions are only recorded when explicitly started by the user
- No sensitive information (passwords, credit cards) is captured in plain text

## License

MIT License - see LICENSE file for details.

## Troubleshooting

### Common Issues

1. **Extension not loading**: Ensure you're using a compatible browser version
2. **Actions not recording**: Check that the content script is properly injected
3. **Replay not working**: Verify that the target elements still exist on the page
4. **Permission errors**: Make sure the extension has the necessary permissions

### Debug Mode

Enable debug logging by opening browser console and looking for "Record-n-Repeat" messages.

## Future Enhancements

- [ ] Visual action editor
- [ ] Action recording filters
- [ ] Conditional logic support
- [ ] Integration with testing frameworks
- [ ] Cloud sync for recordings
- [ ] Mobile browser support
