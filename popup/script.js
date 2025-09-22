(() => {
  let isRecording = false;
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
    } else {
      recordBtn.disabled = false;
      stopBtn.disabled = true;
      if (playBtn) playBtn.disabled = recordedActions.length === 0;
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
        .map(
          (action, index) => `
        <div class="action-item">
          <div>
            <div class="action-type">${action.type}</div>
            <div class="action-details">${action.details || ""}</div>
          </div>
          <div class="action-timestamp">${new Date(
            action.timestamp
          ).toLocaleTimeString()}</div>
        </div>
      `
        )
        .join("");
    }
  }

  // Initialize UI - hide it first
  hideUI();

  // retrieve state
  chrome.storage.local.get(
    ["isRecording", "recordedActions"],
    (result) => {
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
    .addEventListener("click", () => {
      console.log("TRYING TO RECORD");

      // flag as recording
      isRecording = true;

      // update state
      recordedActions = [];
      chrome.storage.local.set({ isRecording, recordedActions });

      // bind events to listeners

      // update UI
      updateUI();
    });

  document.getElementById("stopBtn").addEventListener("click", () => {
    console.log("STOPPING RECORD");

    // flag as not recording
    isRecording = false;

    // update state
    chrome.storage.local.set({ isRecording, recordedActions });

    // unbind events from listeners

    // update UI
    updateUI();
  });

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
