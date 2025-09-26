const ACTIONS = {
  RECORD: "START_RECORDING",
  STOP: "STOP_RECORDING",
  REPLAY: "REPLAY_RECORDING",
};

(() => {
  let isRecording = false;
  let isPlaying = false;
  let recordedActions = [];

  // Hide UI initially to prevent showing wrong state
  function hideUI() {
    const loadingState = document.getElementById("loadingState");

    // Hide main controls but keep the container visible
    const buttonGroups = document.querySelectorAll(".button-group");
    const actionsSection = document.querySelector(".actions-section");

    buttonGroups.forEach((group) => {
      if (group) group.style.display = "none";
    });
    if (actionsSection) actionsSection.style.display = "none";

    // Show loading state
    if (loadingState) {
      loadingState.classList.remove("hidden");
      loadingState.style.display = "flex";
    }
  }

  // Show UI after state is loaded
  function showUI() {
    const loadingState = document.getElementById("loadingState");
    const buttonGroups = document.querySelectorAll(".button-group");
    const actionsSection = document.querySelector(".actions-section");

    // Hide loading state
    if (loadingState) {
      loadingState.classList.add("hidden");
      loadingState.style.display = "none";
    }

    // Show main controls with animation
    buttonGroups.forEach((group) => {
      if (group) {
        group.style.display = "flex";
        group.style.opacity = "0";
        group.style.animation = "fadeIn 0.3s ease forwards";
      }
    });

    if (actionsSection) {
      actionsSection.style.display = "block";
      actionsSection.style.opacity = "0";
      actionsSection.style.animation = "fadeIn 0.3s ease forwards";
    }
  }

  // Update UI based on current state
  function updateUI() {
    const recordBtn = document.getElementById("recordBtn");
    const stopBtn = document.getElementById("stopBtn");
    const playBtn = document.getElementById("playBtn");
    const actionCount = document.getElementById("actionCount");

    if (isRecording) {
      recordBtn.disabled = true;
      stopBtn.disabled = false;
      if (playBtn) playBtn.disabled = true;
    } else if (isPlaying) {
      recordBtn.disabled = true;
      stopBtn.disabled = true;
      if (playBtn) {
        playBtn.disabled = true;
        playBtn.innerHTML =
          '<span class="btn-icon spinning">⟳</span>Replaying...';
        playBtn.classList.add("btn-playing");
      }
    } else {
      recordBtn.disabled = false;
      stopBtn.disabled = true;
      if (playBtn) {
        playBtn.disabled = recordedActions.length === 0;
        playBtn.innerHTML =
          '<span class="btn-icon">▶</span>Replay Actions';
        playBtn.classList.remove("btn-playing");
      }
    }

    // Update action count
    if (actionCount) {
      actionCount.textContent = recordedActions.length;
    }

    // Update actions list
    updateActionsList();
  }

  // Update the actions list display
  function updateActionsList() {
    const actionsList = document.getElementById("actionsList");
    if (!actionsList) return;

    if (recordedActions.length === 0) {
      actionsList.innerHTML =
        '<p class="empty-state">No actions recorded yet</p>';
    } else {
      actionsList.innerHTML = recordedActions
        .map((action, index) => {
          let details = "";
          if (action.type === "keypress") {
            details = `<div class="action-details" title="Key: ${
              action.details.key || ""
            }">
            Key pressed: <b>${action.details.key || ""}</b>
            <br/><span title="${action.details.selector || ""}">
            ${
              action.details.selector &&
              action.details.selector.length > 30
                ? action.details.selector.slice(0, 30) + "…"
                : action.details.selector || ""
            }</span>
          </div>`;
          } else if (action.type === "change") {
            details = `<div class="action-details" title="Value: ${
              action.details.value || ""
            }">
            Value changed to: <b>${
              action.details.value || ""
            }</b><br/><span title="${action.details.selector || ""}">
            ${
              action.details.selector &&
              action.details.selector.length > 30
                ? action.details.selector.slice(0, 30) + "…"
                : action.details.selector || ""
            }</span>
          </div>`;
          } else {
            details = `<div class="action-details" title="${
              action.details.selector || ""
            }">
            ${
              action.details.selector &&
              action.details.selector.length > 30
                ? action.details.selector.slice(0, 30) + "…"
                : action.details.selector || ""
            }
          </div>`;
          }
          return `
          <div class="action-item">
            <div>
          <div class="action-type">${action.type} <span style=""></span></div>
          ${details}
            </div>
            <div class="action-timestamp">
            ${action.details.timestamp}</div>
          </div>
        `;
        })
        .join("");
    }
  }

  // Initialize UI - hide it first
  hideUI();

  // retrieve state
  chrome.storage.local.get(
    ["isRecording", "recordedActions"],
    async (result) => {
      // Update local state from storage
      if (result.isRecording !== undefined) {
        isRecording = result.isRecording;
      }

      if (result.recordedActions) {
        recordedActions = result.recordedActions;
      }

      // Update UI based on retrieved state
      updateUI();

      // Show UI now that state is loaded
      showUI();
    }
  );

  document
    .getElementById("recordBtn")
    .addEventListener("click", async () => {
      console.log("TRYING TO RECORD");

      // flag as recording
      isRecording = true;

      // update state
      recordedActions = [];
      chrome.storage.local.set({ isRecording, recordedActions });

      // send signal to listen for actions
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      // console.log('QUERY FROM CHROME API', activeTab);
      chrome.runtime.sendMessage({
        tab: activeTab.id,
        action: ACTIONS.RECORD,
      });

      // update UI
      updateUI();
    });

  document
    .getElementById("stopBtn")
    .addEventListener("click", async () => {
      console.log("STOPPING RECORD");

      // flag as not recording
      isRecording = false;

      // update state
      chrome.storage.local.set({ isRecording, recordedActions });

      // send signal to stop listening for actions
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      console.log(
        "CONTENT SCRIPT OF " +
          activeTab.id +
          " SHOULD START LISTENING"
      );
      chrome.runtime.sendMessage({
        tab: activeTab.id,
        action: ACTIONS.STOP,
      });

      // update UI
      updateUI();
    });

  document
    .getElementById("playBtn")
    .addEventListener("click", async () => {
      console.log("SIGNAL TO PLAY RECORDED ACTIONS");

      // Set playing state
      isPlaying = true;
      updateUI();

      // send signal to play recorded actions
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      try {
        chrome.tabs
          .sendMessage(activeTab.id, {
            action: ACTIONS.REPLAY,
            replay: recordedActions,
          })
          .then((response) => {
            console.log("REPLAY RESPONSE:", response);

            // Reset playing state after replay completes
            setTimeout(() => {
              isPlaying = false;
              updateUI();
            }, 1000); // Give some time for the replay to visually complete
          });
      } catch (error) {
        console.error("Replay failed:", error);
        // Reset playing state on error
        isPlaying = false;
        updateUI();
      }
    });

  document
    .getElementById("clearBtn")
    .addEventListener("click", async () => {
      recordedActions = [];

      chrome.storage.local.set({ recordedActions });
      updateActionsList();
    });

  chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
      if (message.action === ACTIONS.STOP) {
        console.log("RECORDING STOPPED MESSAGE RECEIVED");
        isRecording = false;
        chrome.storage.local.set({ isRecording });
        updateUI();
      } else if (message.action === "REPLAY_COMPLETE") {
        console.log("REPLAY COMPLETED MESSAGE RECEIVED");
        isPlaying = false;
        updateUI();
      }
    }
  );

  // Add clear button functionality
  const clearBtn = document.getElementById("clearBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      recordedActions = [];
      chrome.storage.local.set({ recordedActions });
      updateUI();
    });
  }
})();
