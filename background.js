const ACTIONS = {
  RECORD: "START_RECORDING",
  STOP: "STOP_RECORDING",
};

(() => {
  let isRecording = false;
  let recordedActions = [];

  chrome.runtime.onInstalled.addListener((details) => {
    console.log(
      "Record-n-Repeat extension installed/updated:",
      details.reasons
    );
  });

  chrome.runtime.onStartup.addListener(() => {
    console.log("Record-n-Repeat extension startup");
  });

  // Incoming from extension popup
  chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
      if (!message.action || !message.tab) return;
      console.log(
        "Message received in background.js for tab:",
        message.tab,
        "with action:",
        message.action
      );

      // Send signal to content script
      // to start listening for and sending actions
      if (message.action === ACTIONS.RECORD) {
        chrome.tabs.sendMessage(message.tab, {
          action: ACTIONS.RECORD,
        });
      }

      // Send signal to content script
      // to stop listening and cleaning up
      if (message.action === ACTIONS.STOP) {
        chrome.tabs.sendMessage(message.tab, {
          action: ACTIONS.STOP,
        });
      }
    }
  );

  // Incoming from content script
  chrome.runtime.onConnect.addListener((port) => {
    //
    if (port.name === "content-background") {
      // push new action
      port.onMessage.addListener((newAction) => {
        console.log("NEW ACTION RECORDED", newAction);

        recordedActions.push(newAction);
        chrome.storage.local.set({ recordedActions });
      });

      // abrupt disconnection
      // stop recording
      port.onDisconnect.addListener((port) => {
        console.log("DISCONNECTED", port);

        isRecording = false;
        recordedActions = [];
        chrome.storage.local.set({ isRecording });

        // update UI in popup
        chrome.runtime.sendMessage({
          action: ACTIONS.STOP,
        });
      });
    }
  });
})();
