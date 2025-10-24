const ACTIONS = {
  RECORD: "START_RECORDING",
  STOP: "STOP_RECORDING",
  REPLAY: "REPLAY_RECORDING",
};
const l = console.log;

// Update tabs table
function updateTabsTable(allTabs, currentTab) {
  console.log("🏁 updateTabsTable called with:", {
    allTabs,
    currentTab,
  });

  const tabsTableBody = document.getElementById("tabsTableBody");
  const tabsTableSection = document.querySelector(
    ".tabs-info-section"
  );

  console.log("🔍 Found tabsTableBody element:", !!tabsTableBody);
  console.log("🔍 Found tabsTableHead element:", !!tabsTableSection);

  if (!tabsTableBody) {
    console.error("❌ tabsTableBody element not found!");
    return;
  }

  if (!allTabs || allTabs.length === 0) {
    console.log(
      "📝 No tabs found, hiding table head and showing empty state"
    );
    if (tabsTableSection) tabsTableSection.style.display = "none";
    tabsTableBody.innerHTML =
      '<tr><td colspan="3" class="empty-state">No tabs found</td></tr>';
    return;
  }

  console.log(`📊 Processing ${allTabs.length} tabs...`);

  // Show table head when there are tabs
  if (tabsTableSection) {
    tabsTableSection.style.display = "block";
    console.log("👁️ Table head made visible");
  }

  tabsTableBody.innerHTML = allTabs
    .map((tab) => {
      const isCurrentTab = currentTab && tab.id === currentTab.id;
      const tabId =
        typeof tab.id === "number"
          ? tab.id.toString().length > 4
            ? tab.id.toString().slice(0, 4) + "..."
            : tab.id.toString()
          : tab.id || "???";
      const title =
        tab.title && tab.title.length > 25
          ? tab.title.slice(0, 25) + "..."
          : tab.title || "Untitled";
      const url = (() => {
        try {
          if (tab.url) {
            const { hostname } = new URL(tab.url);
            return hostname;
          }
        } catch (e) {}
        return tab.url || "";
      })();
      // Determine tab type
      const tabType = tab.url
        ? '<span title="Normal Tab" class="tab-type-icon">🗂️</span>'
        : '<span title="Special Tab" class="tab-type-icon">⭐</span>';

      // Determine tab status icon
      let statusIcon = "";
      switch (tab.status) {
        case "loading":
          statusIcon =
            '<span title="Loading" class="tab-status-icon">⏳</span>';
          break;
        case "complete":
          statusIcon =
            '<span title="Complete" class="tab-status-icon">✅</span>';
          break;
        default:
          statusIcon =
            '<span title="Unknown" class="tab-status-icon">❔</span>';
      }

      if (tab.url)
        return `
          <tr class="${isCurrentTab ? "current-tab" : ""}">
            <!--<td class="tab-type">${tabType}</td>-- IGNORE --->
            <td class="tab-status">${statusIcon}</td>
            <td class="tab-id">${tabId}</td>
            <td class="tab-title" title="${
              tab.title || ""
            }">${title}</td>
            <td class="tab-url" title="${tab.url || ""}">${url}</td>
          </tr>
        `;
    })
    .join("");

  console.log("✨ Tabs table HTML updated successfully!");
}

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

  const infoButtonClickHandler = async () => {
    console.log("🔵 Step A: Test button clicked!");
    console.log("📡 Step B: SENDING SIGNAL FOR TESTING TABS");

    try {
      const response = await chrome.runtime.sendMessage({
        action: "INFO_TABS",
      });
      console.log(
        "📥 Step C: Received response from background:",
        response
      );

      if (response && response.success) {
        console.log(
          "✅ Step D: Response successful, updating table..."
        );
        updateTabsTable(response.allTabs, response.currentTab);
        console.log("🎨 Step E: Table updated successfully!");
      } else {
        console.log("❌ Step D: No valid response received");
      }
    } catch (error) {
      console.error("💥 Error in test button:", error);
    }
  };

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
      l("EXTENSION IS TRYING TO RECORD");
      // fetch the tab that is emitting action
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // send event to background to signal record start
      chrome.runtime.sendMessage({
        tab: activeTab.id,
        action: ACTIONS.RECORD,
      });
      // TODO: Get confirmation that recording started!
      isRecording = true;

      // reflect ui as it is recording
      updateUI();
    });

  document
    .getElementById("stopBtn")
    .addEventListener("click", async () => {
      l("🔴 EXTENSION IS TRYING TO STOP RECORDING");
      // fetch the tab that is emitting action
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // send event to background to signal record stop
      chrome.runtime.sendMessage({
        tab: activeTab.id,
        action: ACTIONS.STOP,
      });
      // TODO: Get confirmation that recording ended!
      isRecording = false;

      // reflect ui as it is recording
      updateUI();
    });

  document
    .getElementById("playBtn")
    .addEventListener("click", async () => {});

  document
    .getElementById("clearBtn")
    .addEventListener("click", async () => {
      recordedActions = [];

      chrome.storage.local.set({ recordedActions });
      updateActionsList();
    });

  document
    .getElementById("testBtn")
    .addEventListener("click", infoButtonClickHandler);

  infoButtonClickHandler();

  chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {}
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
