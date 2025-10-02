const ACTIONS = {
  RECORD: "START_RECORDING",
  STOP: "STOP_RECORDING",
  REPLAY: "REPLAY_RECORDING",
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
      console.log(
        "Message received in background.js for tab:",
        message.tab,
        "with action:",
        message.action
      );

      if (!message.action) return;

      // Send signal to content script
      // to start listening for and sending actions
      if (message.action === ACTIONS.RECORD && message.tab) {
        chrome.tabs.sendMessage(message.tab, {
          action: ACTIONS.RECORD,
        });
      }

      // Send signal to content script
      // to stop listening and cleaning up
      if (message.action === ACTIONS.STOP && message.tab) {
        chrome.tabs.sendMessage(message.tab, {
          action: ACTIONS.STOP,
        });
      }

      if (message.action === "INFO_TABS") {
        console.log("STARTING TABS INSPECTION, RAISE YOUR HANDS!");

        (async () => {
          const tabs = await chrome.tabs.query({});
          console.log("ALL TABS INFO:", tabs);

          const currentTab = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          console.log("DETAILS ABOUT CURRENT TAB:", currentTab);
        })();
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
