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
        console.log("🚀 STARTING TABS INSPECTION, RAISE YOUR HANDS!");

        (async () => {
          console.log("🔍 Step 1: Starting tab query...");
          const tabs = await chrome.tabs.query({});
          console.log("📋 Step 2: ALL TABS INFO:", tabs);

          console.log("🎯 Step 3: Querying current tab...");
          const currentTab = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          console.log("📌 Step 4: DETAILS ABOUT CURRENT TAB:", currentTab);

          console.log("📤 Step 5: Sending tab data to popup...");
          // Send tab info back to popup
          if (sender.tab) {
            console.log("📨 Sending via runtime message (from content script)");
            // If called from content script, send to popup
            chrome.runtime.sendMessage({
              action: "TABS_INFO_RESPONSE",
              allTabs: tabs,
              currentTab: currentTab[0],
            });
          } else {
            console.log("📬 Sending via sendResponse (from popup)");
            // If called from popup, respond directly
            sendResponse({
              success: true,
              allTabs: tabs,
              currentTab: currentTab[0],
            });
          }
          console.log("✅ Step 6: Tab data sent successfully!");
        })();
        
        return true; // Keep message channel open for async response
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
