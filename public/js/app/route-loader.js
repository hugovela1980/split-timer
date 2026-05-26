// Route Loader - Dynamically loads and populates route data from JSON
import {
  deepClone,
  timeToSeconds,
  isBetterTime,
  secondsToTime,
  escapeHtml,
  toKebabCase,
  formatDurationDelta,
  getSegmentPbSplitTime,
  setSegmentPbSplitTime,
  getSegmentPbSegmentDuration,
  setSegmentPbSegmentDuration,
  getSegmentGoldSplit,
  setSegmentGoldSplit,
  normalizeSegmentTimingFields,
  normalizeRouteTimingFields
} from '../utils/utils.js';
import {
  persistRouteDataToStorage as persistRouteDataToStorageHelper,
  saveRunSessionToStorage as saveRunSessionToStorageHelper,
  restoreRunSessionFromStorage as restoreRunSessionFromStorageHelper,
  saveBaselineRouteToStorage,
  restoreBaselineRouteFromStorage,
  saveActiveRunRouteToStorage,
  restoreActiveRunRouteFromStorage,
  clearRunStorage
} from '../persistence/storage.js';
import { createRouteSegmentElement, createRouteSubSegmentElement, createSidebarSegmentItem, createRunCompleteComparisonsHtml, createComparisonsHtml } from '../ui/ui.js';

class RouteLoader {
  constructor(options = {}) {
    this.routeData = null;
    this.currentRouteFilename = 'act-1-100-percent.json';
    this.routeContainer = null;
    this.sidebarList = null;
    this.comparisonsContainer = null;
    this.startScreen = null;
    this.appShell = null;
    this.startRouteSelector = null;
    this.startRouteButton = null;
    this.startCreateRouteButton = null;
    this.liveStopwatchTime = '00:00:00';
    this.isStopwatchRunning = false;
    this.runPaceState = 'neutral'
    this.lastCompletedSegmentId = null;
    this.hasRunStarted = false;
    this.runComplete = null;
    this.sessionGoldSplits = new Set();
    this.sessionSetSegments = new Set();
    this.sessionBestBySegment = new Map();
    this.runDataSnapshot = null;
    this.personalBestAtRunStart = '';
    this.observer = null;
    this.suppressObserverUntil = 0;
    this.sidebarContextMenu = null;
    this.sidebarContextTarget = null;
    this.renameSidebarItemModal = null;
    this.renameSidebarItemTarget = null;
    this.expandedSidebarSegmentIds = new Set();
    this.routeStorageKey = 'stopwatch:routeData';
    this.baselineRouteStorageKey = 'stopwatch:baselineRouteData';
    this.activeRunRouteStorageKey = 'stopwatch:activeRunRouteData';
    this.runSessionStorageKey = 'stopwatch:runSession';
    this.storageProvider = options.storageProvider || (typeof globalThis !== 'undefined' && globalThis.localStorage ? globalThis.localStorage : null);
  }

  async init() {
    try {
      await this.populateRouteSelectorFromServer();
      await this.loadRouteData(this.currentRouteFilename);
      this.ensureRouteStatsStructure();
      this.updateSegmentDurations();

      // Fresh page load should always start clean.
      // Do not restore stale active-run state from localStorage.
      this.resetRunSessionState();

      this.routeContainer = document.querySelector('.route');
      this.sidebarList = document.querySelector('.sidebar__list');
      this.comparisonsContainer = document.querySelector('.comparisons');
      this.startScreen = document.getElementById('start-screen');
      this.appShell = document.getElementById('app-shell');
      this.startRouteSelector = document.getElementById('start-route-selector');
      this.startRouteButton = document.getElementById('start-route-btn');
      this.startCreateRouteButton = document.getElementById('start-create-route-btn');

      this.resetRouteProgressToFirstSegment();

      this.initStopwatchSync();
      this.initEditorControls();
      this.initSidebarContextMenu();
      this.initRouteSelector();
      this.initStartScreen();

      this.populateRoute();
      this.populateSidebar();
      this.renderComparisonsPanel();
      this.refreshEditorSegmentOptions();
      this.initScrollObserver();

      await this.resetRouteProgressToFirstSegmentAndRender({
        scroll: false,
        save: false
      });

      // On fresh app load, treat the JSON file as the clean source of truth.
      // Do not write the loaded route back to disk.
      this.persistRouteDataToStorage();
      this.saveBaselineRouteToStorage();
      this.saveActiveRunRouteToStorage();
    } catch (error) {
      console.error('Failed to initialize route loader:', error);
    }
  }

  disableSubsegmentTimingControls() {
    document.querySelectorAll('.sub-segment__set').forEach((button) => {
      button.hidden = true;
      button.disabled = true;
    });
  }

  initStartScreen() {
    if (!this.startRouteButton ||!this.startRouteSelector ||!this.startScreen ||!this.appShell) {
      return;
    }

    this.populateStartRouteSelectorFromMainSelector();
    this.startRouteSelector.focus();

    const openSelectedRoute = async () => {
      const selectedRoute = this.startRouteSelector.value;
      if (!selectedRoute) return;
  
      if (!this.confirmRouteSwitchIfRunActive()) return;
      await this.switchRoute(selectedRoute);
  
      this.showMainApp();
  
      window.dispatchEvent(new CustomEvent('stopwatch:clear'));
    };

    this.startRouteButton.addEventListener('click', openSelectedRoute);

    this.startRouteSelector.addEventListener('keydown', async (event) => {
      if (event.key !== 'Enter') return;

      event.preventDefault();
      await openSelectedRoute();
    });

    if (this.startCreateRouteButton) {
      this.startCreateRouteButton.addEventListener('click', () => {
        this.showCreateRouteModal({
          onRouteCreated: () => {
            this.showMainApp();
          }
        });
      });
    }
  }

  showMainApp() {
    if (this.startScreen) {
      this.startScreen.hidden = true;
    }

    if (this.appShell) {
      this.appShell.hidden = false;
    }
  }

  async loadRouteData(filename = 'act-1-100-percent.json') {
    try {
      // Set the current route filename
      this.currentRouteFilename = filename;
      this.expandedSidebarSegmentIds = new Set();

      // Load data from specified route file
      const response = await fetch(`./data/routes/${filename}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      // Support both shapes:
      // 1) { route: { ... } }
      // 2) { ...routeData }
      this.routeData = data.route || data;

      if (!this.routeData || !Array.isArray(this.routeData.segments)) {
        throw new Error(`Invalid ${filename} format: missing route segments`);
      }
      
      normalizeRouteTimingFields(this.routeData);
    } catch (error) {
      this.clearRunSnapshot();
      throw error;
    }
  }

  persistRouteDataToStorage() {
    persistRouteDataToStorageHelper(this.routeData, this.routeStorageKey, this.storageProvider);
  }

  saveBaselineRouteToStorage() {
    saveBaselineRouteToStorage(
      this.routeData,
      this.baselineRouteStorageKey,
      this.storageProvider
    );
  }

  restoreBaselineRouteFromStorage() {
    return restoreBaselineRouteFromStorage(
      this.baselineRouteStorageKey,
      this.storageProvider
    );
  }

  saveActiveRunRouteToStorage() {
    saveActiveRunRouteToStorage(
      this.routeData,
      this.activeRunRouteStorageKey,
      this.storageProvider
    );
  }

  restoreActiveRunRouteFromStorage() {
    return restoreActiveRunRouteFromStorage(
      this.activeRunRouteStorageKey,
      this.storageProvider
    );
  }

  clearRunStorage() {
    clearRunStorage(
      [
        this.runSessionStorageKey,
        this.activeRunRouteStorageKey
      ],
      this.storageProvider
    );
  }

  clearAllRouteStorage() {
    clearRunStorage(
      [
        this.routeStorageKey,
        this.baselineRouteStorageKey,
        this.activeRunRouteStorageKey,
        this.runSessionStorageKey
      ],
      this.storageProvider
    );
  }

  async saveActiveRunState() {
    // Active run data is temporary.
    // For now, keep it in localStorage only.
    // Later, this can be replaced with a temporary run-session file save.
    this.persistRouteDataToStorage();
    this.saveActiveRunRouteToStorage();
    this.saveRunSessionToStorage();
  }

  async saveCleanRouteState(options = {}) {
    this.persistRouteDataToStorage();
    this.saveBaselineRouteToStorage();
    this.saveActiveRunRouteToStorage();
    await this.saveRouteDataToFile(options);
  }

  ensureRunSnapshotCaptured() {
    if (this.runDataSnapshot) return;

    this.runDataSnapshot = deepClone(this.routeData);
    this.personalBestAtRunStart = this.routeData && typeof this.routeData.personalBest === 'string'
      ? this.routeData.personalBest
      : '';

    // Persist the pre-run state so we can restore it even after active-run data
    // has been autosaved to the JSON file.
    this.saveBaselineRouteToStorage();
  }

  clearRunSnapshot() {
    this.runDataSnapshot = null;
    this.personalBestAtRunStart = '';
  }

  restoreRouteDataFromSnapshot() {
    if (!this.runDataSnapshot) return;
    this.routeData = deepClone(this.runDataSnapshot);
    this.clearRunSnapshot();
  }

  restoreBaselineRouteState() {
    const storedBaseline = this.restoreBaselineRouteFromStorage();

    if (storedBaseline && Array.isArray(storedBaseline.segments)) {
      this.routeData = deepClone(storedBaseline);
      return true;
    }

    if (this.runDataSnapshot) {
      this.routeData = deepClone(this.runDataSnapshot);
      return true;
    }

    return false;
  }

  resetRunSessionState() {
    this.runComplete = null;
    this.hasRunStarted = false;
    this.runPaceState = 'neutral';
    this.lastCompletedSegmentId = null;
    this.sessionGoldSplits.clear();
    this.sessionSetSegments.clear();
    this.sessionBestBySegment.clear();
    this.clearRunSnapshot();
    this.clearRunStorage();
  }

  resetRouteProgressToFirstSegment() {
    const firstSegment = this.routeData && Array.isArray(this.routeData.segments)
      ? this.routeData.segments[0]
      : null;

    if (!firstSegment) return;

    this.routeData.currentSegmentId = Number(firstSegment.id);
    this.routeData.currentSegmentName = firstSegment.name;
  }

  async syncUiToCurrentSegment({ scroll = true } = {}) {
    const currentSegmentId = Number(this.routeData?.currentSegmentId);

    if (!currentSegmentId) return;

    const segmentDomId = `segment-${currentSegmentId}`;

    this.suppressObserverUntil = Date.now() + 1500;

    this.populateSidebar();
    this.renderComparisonsPanel();

    await this.setActiveSidebarButton(segmentDomId, false);

    if (scroll) {
      const target = document.getElementById(segmentDomId);

      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  async resetRouteProgressToFirstSegmentAndRender({ scroll = true, save = false } = {}) {
    this.resetRouteProgressToFirstSegment();
    await this.syncUiToCurrentSegment({ scroll });

    if (save) {
      await this.saveCleanRouteState({ force: true });
    }
  }

  async saveRouteDataToFile(options = {}) {
    if (window.fileSaver && typeof window.fileSaver.saveRouteData === 'function') {
      await window.fileSaver.saveRouteData(this.routeData, this.currentRouteFilename, options);
    }
  }

  isSidebarSegmentExpanded(segmentId) {
    return this.expandedSidebarSegmentIds.has(Number(segmentId));
  }

  toggleSidebarSegmentExpansion(segmentId) {
    const numericSegmentId = Number(segmentId);
    if (!Number.isInteger(numericSegmentId)) return;

    if (this.expandedSidebarSegmentIds.has(numericSegmentId)) {
      this.expandedSidebarSegmentIds.delete(numericSegmentId);
    } else {
      this.expandedSidebarSegmentIds.add(numericSegmentId);
    }

    this.populateSidebar();
  }

  async deleteCompletedRunData() {
    this.restoreBaselineRouteState();
    this.resetRunSessionState();

    this.populateRoute();
    await this.resetRouteProgressToFirstSegmentAndRender({ scroll: true, save: false });

    window.dispatchEvent(new CustomEvent('stopwatch:clear'));

    await this.saveCleanRouteState({ force: true });
  }

  async restartRun() {
    this.restoreBaselineRouteState();
    this.resetRunSessionState();

    this.populateRoute();
    await this.resetRouteProgressToFirstSegmentAndRender({ scroll: true, save: false });

    window.dispatchEvent(new CustomEvent('stopwatch:clear'));
  }

  updateSessionGoldSplitState(segment) {
    const segmentId = Number(segment.id);
    const activeDuration = getSegmentPbSegmentDuration(segment);
    const baselineBest = this.sessionBestBySegment.get(segmentId) || '';

    if (activeDuration && isBetterTime(activeDuration, baselineBest)) {
      this.sessionGoldSplits.add(segmentId);
    } else {
      this.sessionGoldSplits.delete(segmentId);
    }

    this.saveRunSessionToStorage();
  }

  updateGoldSplitsFromCompletedRun(targetRouteData, activeRunRouteData, baselineRouteData) {
    if (
      !targetRouteData ||
      !activeRunRouteData ||
      !baselineRouteData ||
      !Array.isArray(targetRouteData.segments) ||
      !Array.isArray(activeRunRouteData.segments) ||
      !Array.isArray(baselineRouteData.segments)
    ) {
      return;
    }

    targetRouteData.segments.forEach((targetSegment) => {
      const segmentId = Number(targetSegment.id);

      if (!this.sessionSetSegments.has(segmentId)) {
        return;
      }

      const activeSegment = activeRunRouteData.segments.find(
        (segment) => Number(segment.id) === segmentId
      );

      const baselineSegment = baselineRouteData.segments.find(
        (segment) => Number(segment.id) === segmentId
      );

      if (!activeSegment || !baselineSegment) return;

      const activeDuration = getSegmentPbSegmentDuration(activeSegment);
      const baselineGoldSplit = getSegmentGoldSplit(baselineSegment);

      if (activeDuration && isBetterTime(activeDuration, baselineGoldSplit)) {
        setSegmentGoldSplit(targetSegment, activeDuration);
      } else {
        setSegmentGoldSplit(targetSegment, baselineGoldSplit);
      }
    });
  }

  async endRunWithGoldSegments() {
    const activeRunRouteData = this.restoreActiveRunRouteFromStorage()
      || deepClone(this.routeData);

    const baselineRouteData = this.restoreBaselineRouteFromStorage()
      || this.runDataSnapshot;

    if (!baselineRouteData || !Array.isArray(baselineRouteData.segments)) {
      return;
    }

    const mergedRouteData = deepClone(baselineRouteData);

    this.updateGoldSplitsFromCompletedRun(
      mergedRouteData,
      activeRunRouteData,
      baselineRouteData
    );

    // Non-PB run: keep previous PB/splits, but recalculate sum of best after gold updates.
    mergedRouteData.personalBest = this.personalBestAtRunStart || mergedRouteData.personalBest || '';

    this.routeData = mergedRouteData;
    this.updateRouteRunStats();

    await this.saveCleanRouteState({ force: true });
  }

  async endRunManually() {
    const currentRunTime = this.liveStopwatchTime || this.getCurrentStopwatchTime();
    const baselinePersonalBest = this.personalBestAtRunStart || this.routeData.personalBest;

    this.runComplete = {
      finalTime: currentRunTime,
      isNewPB: false,
      previousPB: baselinePersonalBest || '--:--:--'
    };

    this.hasRunStarted = false;

    // Important:
    // Do NOT clear sessionGoldSplits, sessionSetSegments, or sessionBestBySegment here.
    // The Run Complete card still needs that data if the user chooses "End Run & Save Gold".
    this.resetRouteProgressToFirstSegment();
    this.populateSidebar();
    this.renderComparisonsPanel();

    window.dispatchEvent(new CustomEvent('stopwatch:clear'));
  }

  async resetRun() {
    await this.endRunManually();
  }

  async saveRunCompleteGold() {
    if (!this.runComplete) return;

    if (!this.runComplete.isNewPB) {
      await this.endRunWithGoldSegments();
    } else {
      const activeRunRouteData = this.restoreActiveRunRouteFromStorage()
        || deepClone(this.routeData);

      const baselineRouteData = this.restoreBaselineRouteFromStorage()
        || this.runDataSnapshot;

      if (baselineRouteData && Array.isArray(baselineRouteData.segments)) {
        this.updateGoldSplitsFromCompletedRun(
          this.routeData,
          activeRunRouteData,
          baselineRouteData
        );
      }

      this.updateRouteRunStats();
      await this.saveCleanRouteState({ force: true });
    }

    this.resetRunSessionState();

    this.populateRoute();
    await this.resetRouteProgressToFirstSegmentAndRender({ scroll: true, save: false });

    window.dispatchEvent(new CustomEvent('stopwatch:clear'));

    await this.saveCleanRouteState({ force: true });
  }

  async cancelRunMidway() {
    if (this.runDataSnapshot) {
      this.restoreRouteDataFromSnapshot();
    }

    this.runComplete = null;
    this.hasRunStarted = false;
    this.sessionGoldSplits.clear();
    this.sessionSetSegments.clear();
    this.sessionBestBySegment.clear();
    this.clearRunSnapshot();
    this.clearRunStorage();

    const firstSegment = this.routeData && Array.isArray(this.routeData.segments)
      ? this.routeData.segments[0]
      : null;

    if (firstSegment) {
      this.routeData.currentSegmentId = Number(firstSegment.id);
      this.routeData.currentSegmentName = firstSegment.name;
    }

    this.populateRoute();
    this.populateSidebar();
    this.renderComparisonsPanel();
    this.persistRouteDataToStorage();
    await this.saveRouteDataToFile();
  }

  async handleRouteDataChanged() {
    this.runComplete = null;
    this.updateSegmentDurations();
    this.populateSidebar();
    this.renderComparisonsPanel();

    if (this.hasRunStarted || this.sessionSetSegments.size > 0) {
      await this.saveActiveRunState();
    } else {
      await this.saveCleanRouteState();
    }
  }

  async handleRouteStructureChanged() {
    this.runComplete = null;
    this.updateSegmentDurations();
    this.rerenderRouteUI();
    this.persistRouteDataToStorage();
    await this.saveRouteDataToFile({ force: true });
  }

  rerenderRouteUI() {
    const editorPanel = document.querySelector('.sidebar__editor-panel');
    const editorWasOpen = editorPanel ? editorPanel.open : false;
    const parentSelectValue = document.getElementById('subsegment-parent-id')?.value;
    const deleteSelectValue = document.getElementById('delete-segment-id')?.value;

    this.populateRoute();
    this.populateSidebar();
    this.renderComparisonsPanel();
    this.refreshEditorSegmentOptions();
    this.initScrollObserver();

    const newEditorPanel = document.querySelector('.sidebar__editor-panel');
    if (newEditorPanel && editorWasOpen) newEditorPanel.open = true;

    const newParentSelect = document.getElementById('subsegment-parent-id');
    if (newParentSelect && parentSelectValue) newParentSelect.value = parentSelectValue;

    const newDeleteSelect = document.getElementById('delete-segment-id');
    if (newDeleteSelect && deleteSelectValue) newDeleteSelect.value = deleteSelectValue;
  }

  initEditorControls() {
    const addSegmentForm = document.getElementById('add-segment-form');
    const addSegmentInput = document.getElementById('new-segment-name');
    const addSubsegmentForm = document.getElementById('add-subsegment-form');
    const addSubsegmentParent = document.getElementById('subsegment-parent-id');
    const addSubsegmentInput = document.getElementById('new-subsegment-description');
    const addSubsegmentAllowSetTime = document.getElementById('new-subsegment-allow-set-time');
    const deleteSegmentForm = document.getElementById('delete-segment-form');
    const deleteSegmentSelect = document.getElementById('delete-segment-id');

    if (addSegmentForm && addSegmentInput) {
      addSegmentForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const name = addSegmentInput.value.trim();
        if (!name) return;

        this.routeData.segments.push({
          id: this.getNextSegmentId(),
          name,
          time: '',
          duration: '',
          bestTime: '',
          allowSetTime: true,
          completed: false,
          subSegments: []
        });

        addSegmentInput.value = '';
        await this.handleRouteStructureChanged();
      });
    }

    if (addSubsegmentForm && addSubsegmentParent && addSubsegmentInput) {
      addSubsegmentForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const parentId = Number(addSubsegmentParent.value);
        const description = addSubsegmentInput.value.trim();
        const allowSetTime = addSubsegmentAllowSetTime ? addSubsegmentAllowSetTime.checked : false;
        if (!parentId || !description) return;

        const targetSegment = this.routeData.segments.find((segment) => segment.id === parentId);
        if (!targetSegment) return;

        targetSegment.subSegments.push({
          description,
          time: '',
          completed: false,
          allowSetTime
        });

        addSubsegmentInput.value = '';
        if (addSubsegmentAllowSetTime) addSubsegmentAllowSetTime.checked = false;
        await this.handleRouteStructureChanged();
      });
    }

    if (deleteSegmentForm && deleteSegmentSelect) {
      deleteSegmentForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const segmentId = Number(deleteSegmentSelect.value);
        if (!segmentId) return;

        const segmentName = deleteSegmentSelect.options[deleteSegmentSelect.selectedIndex].textContent;
        if (!confirm(`Delete segment "${segmentName}"? This cannot be undone.`)) return;

        this.routeData.segments = this.routeData.segments.filter((segment) => segment.id !== segmentId);
        this.reindexSegmentIds();
        const fallbackSegment = this.routeData.segments[0] || null;
        this.routeData.currentSegmentId = fallbackSegment ? Number(fallbackSegment.id) : null;
        this.routeData.currentSegmentName = fallbackSegment ? fallbackSegment.name : '';

        await this.handleRouteStructureChanged();
      });
    }
  }

  initSidebarContextMenu() {
    this.sidebarContextMenu = document.getElementById('sidebar-context-menu');
    this.renameSidebarItemModal = document.getElementById('rename-sidebar-item-modal');

    const editButton = document.getElementById('sidebar-context-edit');
    const clearSplitButton = document.getElementById('sidebar-context-clear-split');
    const deleteButton = document.getElementById('sidebar-context-delete');
    const renameForm = document.getElementById('rename-sidebar-item-form');
    const renameInput = document.getElementById('rename-sidebar-item-input');
    const renameTitle = document.getElementById('rename-sidebar-item-title');
    const cancelRenameButton = document.getElementById('rename-sidebar-item-cancel');

    if (!this.sidebarContextMenu || !this.renameSidebarItemModal || !editButton || !clearSplitButton || !deleteButton || !renameForm || !renameInput || !renameTitle || !cancelRenameButton) {
      return;
    }

    editButton.addEventListener('click', () => {
      const target = this.sidebarContextTarget;
      this.hideSidebarContextMenu();
      if (!target) return;
      this.showRenameSidebarItemModal(target);
    });

    deleteButton.addEventListener('click', async () => {
      const target = this.sidebarContextTarget;
      this.hideSidebarContextMenu();
      if (!target) return;
      await this.deleteSidebarContextTarget(target);
    });

    clearSplitButton.addEventListener('click', async () => {
      const target = this.sidebarContextTarget;
      this.hideSidebarContextMenu();
      if (!target || target.type !== 'segment') return;
      await this.clearSegmentSplitFromContextTarget(target);
    });

    document.addEventListener('click', (event) => {
      if (!this.sidebarContextMenu || this.sidebarContextMenu.hidden) return;
      if (this.sidebarContextMenu.contains(event.target)) return;
      this.hideSidebarContextMenu();
    });

    document.addEventListener('scroll', () => {
      this.hideSidebarContextMenu();
    }, true);

    window.addEventListener('resize', () => {
      this.hideSidebarContextMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      this.hideSidebarContextMenu();
      if (this.renameSidebarItemModal?.open) {
        this.renameSidebarItemModal.close();
      }
    });

    renameForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const nextName = renameInput.value.trim();
      if (!nextName) return;

      await this.renameSidebarContextTarget(nextName);
      this.renameSidebarItemModal.close();
    });

    cancelRenameButton.addEventListener('click', () => {
      this.renameSidebarItemModal.close();
    });

    this.renameSidebarItemModal.addEventListener('close', () => {
      renameForm.reset();
      renameTitle.textContent = 'Rename Item';
      this.renameSidebarItemTarget = null;
    });
  }

  openSidebarContextMenu(event, target) {
    if (!this.sidebarContextMenu) return;

    event.preventDefault();
    this.sidebarContextTarget = target;

    const editButton = document.getElementById('sidebar-context-edit');
    const clearSplitButton = document.getElementById('sidebar-context-clear-split');
    const deleteButton = document.getElementById('sidebar-context-delete');
    if (editButton) {
      editButton.textContent = target.type === 'segment' ? 'Edit Segment Name' : 'Edit Sub-Segment Name';
    }
    if (clearSplitButton) {
      clearSplitButton.hidden = target.type !== 'segment';
    }
    if (deleteButton) {
      deleteButton.textContent = target.type === 'segment' ? 'Delete Segment' : 'Delete Sub-Segment';
    }

    this.sidebarContextMenu.hidden = false;

    const menuRect = this.sidebarContextMenu.getBoundingClientRect();
    const left = Math.min(event.clientX, window.innerWidth - menuRect.width - 12);
    const top = Math.min(event.clientY, window.innerHeight - menuRect.height - 12);

    this.sidebarContextMenu.style.left = `${Math.max(8, left)}px`;
    this.sidebarContextMenu.style.top = `${Math.max(8, top)}px`;
  }

  hideSidebarContextMenu() {
    if (!this.sidebarContextMenu) return;
    this.sidebarContextMenu.hidden = true;
    this.sidebarContextTarget = null;
  }

  getSegmentById(segmentId) {
    return this.routeData.segments.find((segment) => Number(segment.id) === Number(segmentId)) || null;
  }

  getSubSegmentTarget(target) {
    const segment = this.getSegmentById(target.segmentId);
    if (!segment || !Array.isArray(segment.subSegments)) {
      return { segment: null, subSegment: null };
    }

    return {
      segment,
      subSegment: segment.subSegments[target.subSegmentIndex] || null
    };
  }

  getSidebarContextTargetName(target) {
    if (target.type === 'segment') {
      return this.getSegmentById(target.segmentId)?.name || '';
    }

    const { subSegment } = this.getSubSegmentTarget(target);
    return subSegment?.description || '';
  }

  showRenameSidebarItemModal(target) {
    if (!this.renameSidebarItemModal) return;

    const renameInput = document.getElementById('rename-sidebar-item-input');
    const renameTitle = document.getElementById('rename-sidebar-item-title');
    if (!renameInput || !renameTitle) return;

    this.renameSidebarItemTarget = target;
    renameTitle.textContent = target.type === 'segment' ? 'Rename Segment' : 'Rename Sub-Segment';
    renameInput.value = this.getSidebarContextTargetName(target);
    this.renameSidebarItemModal.showModal();
    renameInput.focus();
    renameInput.select();
  }

  async renameSidebarContextTarget(nextName) {
    const target = this.renameSidebarItemTarget;
    if (!target) return;

    if (target.type === 'segment') {
      const segment = this.getSegmentById(target.segmentId);
      if (!segment) return;
      segment.name = nextName;
      if (Number(this.routeData.currentSegmentId) === Number(segment.id)) {
        this.routeData.currentSegmentName = nextName;
      }
    } else {
      const { subSegment } = this.getSubSegmentTarget(target);
      if (!subSegment) return;
      subSegment.description = nextName;
    }

    await this.handleRouteStructureChanged();
  }

  async deleteSidebarContextTarget(target) {
    const currentName = this.getSidebarContextTargetName(target);
    if (!currentName) return;

    if (target.type === 'segment') {
      if (!confirm(`Delete segment "${currentName}"? This also deletes all sub-segments and cannot be undone.`)) {
        return;
      }

      const deletedIndex = this.routeData.segments.findIndex((segment) => Number(segment.id) === Number(target.segmentId));
      if (deletedIndex < 0) return;

      this.routeData.segments = this.routeData.segments.filter((segment) => Number(segment.id) !== Number(target.segmentId));
      this.reindexSegmentIds();

      const fallbackIndex = Math.min(deletedIndex, this.routeData.segments.length - 1);
      const fallbackSegment = fallbackIndex >= 0 ? this.routeData.segments[fallbackIndex] : null;
      this.routeData.currentSegmentId = fallbackSegment ? Number(fallbackSegment.id) : null;
      this.routeData.currentSegmentName = fallbackSegment ? fallbackSegment.name : '';
    } else {
      if (!confirm(`Delete sub-segment "${currentName}"? This cannot be undone.`)) {
        return;
      }

      const { segment } = this.getSubSegmentTarget(target);
      if (!segment) return;

      segment.subSegments.splice(target.subSegmentIndex, 1);
    }

    await this.handleRouteStructureChanged();
  }

  async clearSegmentSplitFromContextTarget(target) {
    const segment = this.getSegmentById(target.segmentId);
    if (!segment) return;

    if (!confirm(`Clear split data for segment "${segment.name}"? This removes its saved time and gold split.`)) {
      return;
    }

    setSegmentPbSplitTime(segment, '');
    setSegmentPbSegmentDuration(segment, '');
    setSegmentGoldSplit(segment, '');

    if (Object.prototype.hasOwnProperty.call(segment, 'segmentDuration')) {
      segment.segmentDuration = '';
    }

    const numericSegmentId = Number(segment.id);
    this.sessionGoldSplits.delete(numericSegmentId);
    this.sessionSetSegments.delete(numericSegmentId);
    this.sessionBestBySegment.delete(numericSegmentId);
    this.saveRunSessionToStorage();

    this.runComplete = null;
    this.updateSegmentDurations();
    this.rerenderRouteUI();
    this.persistRouteDataToStorage();
    await this.saveRouteDataToFile({ force: true });
  }

  populateStartRouteSelectorFromMainSelector() {
    const mainSelector = document.getElementById('route-selector');
    if(!this.startRouteSelector || !mainSelector) return;

    this.startRouteSelector.innerHTML = '';

    Array.from(mainSelector.options)
      .filter((option) => option.value !== '__create_new__')
      .forEach((option) => {
        const startOption = document.createElement('option');
        startOption.value = option.value;
        startOption.textContent = option.textContent;
        this.startRouteSelector.appendChild(startOption);
      });

    if (this.currentRouteFilename) {
      this.startRouteSelector.value = this.currentRouteFilename
    }
  }

  async populateRouteSelectorFromServer() {
    const routeSelector = document.getElementById('route-selector');
    if (!routeSelector) return;

    try {
      const response = await fetch('/api/list-routes');
      if (!response.ok) throw new Error('Failed to fetch route list');
      const { routes } = await response.json();

      // Clear existing route options (keep the create-new sentinel if present)
      Array.from(routeSelector.options)
        .filter(o => o.value !== '__create_new__')
        .forEach(o => o.remove());

      const createOption = routeSelector.querySelector('option[value="__create_new__"]');

      routes.forEach(({ filename, name }) => {
        const option = document.createElement('option');
        option.value = filename;
        option.textContent = name;
        routeSelector.insertBefore(option, createOption);
      });

      // Default selection to first route
      if (routes.length > 0) {
        this.currentRouteFilename = routes[0].filename;
        routeSelector.value = this.currentRouteFilename;
      }
    } catch (error) {
      console.error('Failed to populate route selector:', error);
    }
  }

  initRouteSelector() {
    const routeSelector = document.getElementById('route-selector');
    if (!routeSelector) return;

    routeSelector.addEventListener('change', async (event) => {
      const selectedFile = event.target.value;

      if (selectedFile === '__create_new__') {
        // Revert dropdown to current route while modal is open
        routeSelector.value = this.currentRouteFilename;
        this.showCreateRouteModal();
        return;
      }

      if (!this.confirmRouteSwitchIfRunActive()) {
        routeSelector.value = this.currentRouteFilename;
        return;
      }

      await this.switchRoute(selectedFile);
    });
  }

  showCreateRouteModal(options = {}) {
    const modal = document.getElementById('create-route-modal');
    const form = document.getElementById('create-route-form');
    const input = document.getElementById('new-route-name');
    const errorEl = document.getElementById('create-route-error');
    const cancelBtn = document.getElementById('create-route-cancel');
    if (!modal || !form || !input || !errorEl || !cancelBtn) return;

    input.value = '';
    errorEl.hidden = true;
    modal.showModal();
    input.focus();

    const handleSubmit = async (event) => {
      event.preventDefault();
      const routeName = input.value.trim();
      if (!routeName) return;

      const filename = `${toKebabCase(routeName)}.json`;

      // Check for duplicate in current dropdown options
      const routeSelector = document.getElementById('route-selector');
      const existingValues = Array.from(routeSelector.options).map(o => o.value);
      if (existingValues.includes(filename)) {
        errorEl.textContent = 'A route with that name already exists.';
        errorEl.hidden = false;
        return;
      }

      try {
        const response = await fetch('/api/create-route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, name: routeName })
        });

        const result = await response.json();
        if (!response.ok) {
          errorEl.textContent = result.message || 'Failed to create route.';
          errorEl.hidden = false;
          return;
        }

        // Add new option to dropdown (before the "Create New Route" option)
        const createOption = routeSelector.querySelector('option[value="__create_new__"]');
        const newOption = document.createElement('option');
        newOption.value = filename;
        newOption.textContent = routeName;
        routeSelector.insertBefore(newOption, createOption);

        modal.close();
        form.removeEventListener('submit', handleSubmit);
        cancelBtn.removeEventListener('click', handleCancel);

        // Switch to new route and open editor
        routeSelector.value = filename;
        await this.switchRoute(filename);

        if (typeof options.onRouteCreated === 'function') {
          options.onRouteCreated(filename);
        }

        const editorPanel = document.querySelector('.sidebar__editor-panel');
        if (editorPanel) editorPanel.open = true;

      } catch (error) {
        errorEl.textContent = 'An unexpected error occurred.';
        errorEl.hidden = false;
      }
    };

    const handleCancel = () => {
      modal.close();
      form.removeEventListener('submit', handleSubmit);
      cancelBtn.removeEventListener('click', handleCancel);
    };

    form.addEventListener('submit', handleSubmit);
    cancelBtn.addEventListener('click', handleCancel);
  }

  async switchRoute(filename) {
    try {
      // Load the new route data
      await this.loadRouteData(filename);
      this.ensureRouteStatsStructure();
      this.updateSegmentDurations();

      const routeSelector = document.getElementById('route-selector');
      if (routeSelector) {
        routeSelector.value = filename;
      }

      if (this.startRouteSelector) {
        this.startRouteSelector.value = filename;
      }
      
      // Clear session state when switching routes
      this.sessionGoldSplits.clear();
      this.sessionSetSegments.clear();
      this.sessionBestBySegment.clear();
      this.runPaceState = 'neutral';
      this.lastCompletedSegmentId = null;
      this.runComplete = null;
      this.hasRunStarted = false;
      this.clearRunStorage();

      // Reset to first segment and refresh UI
      this.resetRouteProgressToFirstSegment();
      this.populateRoute();
      this.populateSidebar();
      this.renderComparisonsPanel();
      this.refreshEditorSegmentOptions();
      this.initScrollObserver();

      await this.resetRouteProgressToFirstSegmentAndRender({ scroll: true, save: false });
      
      window.dispatchEvent(new CustomEvent('stopwatch:clear'));
    } catch (error) {
      console.error('Failed to switch route:', error);
    }
  }

  confirmRouteSwitchIfRunActive() {
    const hasActiveRunData = 
      this.hasRunStarted ||
      this.isStopwatchRunning ||
      this.runComplete ||
      this.sessionSetSegments.size > 0;

    if (!hasActiveRunData) {
      return true;
    }

    window.dispatchEvent(new CustomEvent('stopwatch:stop'));

    return confirm(
      'You have an active or unfinished run.  Switching routes will dicard the current run data.  Continue?'
    );
  }

  refreshEditorSegmentOptions() {
    const parentSelect = document.getElementById('subsegment-parent-id');
    const deleteSelect = document.getElementById('delete-segment-id');
    if (!parentSelect || !deleteSelect) return;

    parentSelect.innerHTML = '';
    deleteSelect.innerHTML = '';

    this.routeData.segments.forEach((segment) => {
      const parentOption = document.createElement('option');
      parentOption.value = String(segment.id);
      parentOption.textContent = `${segment.id}. ${segment.name}`;
      parentSelect.appendChild(parentOption);

      const deleteOption = document.createElement('option');
      deleteOption.value = String(segment.id);
      deleteOption.textContent = `${segment.id}. ${segment.name}`;
      deleteSelect.appendChild(deleteOption);
    });
  }

  reindexSegmentIds() {
    const idMap = new Map();

    this.routeData.segments.forEach((segment, index) => {
      const previousId = Number(segment.id);
      const nextId = index + 1;
      idMap.set(previousId, nextId);
      segment.id = nextId;
    });

    this.sessionGoldSplits = new Set(
      Array.from(this.sessionGoldSplits)
        .map((segmentId) => idMap.get(Number(segmentId)))
        .filter(Number.isInteger)
    );

    this.sessionSetSegments = new Set(
      Array.from(this.sessionSetSegments)
        .map((segmentId) => idMap.get(Number(segmentId)))
        .filter(Number.isInteger)
    );

    this.expandedSidebarSegmentIds = new Set(
      Array.from(this.expandedSidebarSegmentIds)
        .map((segmentId) => idMap.get(Number(segmentId)))
        .filter(Number.isInteger)
    );

    const remappedBestBySegment = new Map();
    this.sessionBestBySegment.forEach((value, segmentId) => {
      const nextId = idMap.get(Number(segmentId));
      if (Number.isInteger(nextId)) {
        remappedBestBySegment.set(nextId, value);
      }
    });
    this.sessionBestBySegment = remappedBestBySegment;
  }

  getNextSegmentId() {
    if (!this.routeData.segments.length) return 1;
    return Math.max(...this.routeData.segments.map((segment) => Number(segment.id) || 0)) + 1;
  }

  captureSessionBestSnapshot() {
    this.sessionBestBySegment.clear();

    if (!this.routeData || !Array.isArray(this.routeData.segments)) return;

    this.routeData.segments.forEach((segment) => {
      this.sessionBestBySegment.set(Number(segment.id), getSegmentGoldSplit(segment));
    });

    this.saveRunSessionToStorage();
  }

  saveRunSessionToStorage() {
    saveRunSessionToStorageHelper(
      {
        hasRunStarted: this.hasRunStarted,
        currentRouteFilename: this.currentRouteFilename,
        sessionSetSegments: this.sessionSetSegments,
        sessionGoldSplits: this.sessionGoldSplits,
        sessionBestBySegment: this.sessionBestBySegment
      },
      this.runSessionStorageKey,
      this.storageProvider
    );
  }

  restoreRunSessionFromStorage() {
    const session = restoreRunSessionFromStorageHelper(this.runSessionStorageKey, this.storageProvider);
    if (!session) return;

    this.hasRunStarted = session.hasRunStarted;
    this.sessionSetSegments = session.sessionSetSegments;
    this.sessionGoldSplits = session.sessionGoldSplits;
    this.sessionBestBySegment = session.sessionBestBySegment;
  }

  getComparisonBestDuration(segment) {
    if (!segment) return '';

    const segmentId = Number(segment.id);
    if (this.sessionBestBySegment.has(segmentId)) {
      return this.sessionBestBySegment.get(segmentId) || '';
    }

    return getSegmentGoldSplit(segment);
  }

  updateSegmentDurations() {
    if (!this.routeData || !Array.isArray(this.routeData.segments)) return;

    this.ensureRouteStatsStructure();

    this.routeData.segments.forEach((segment, index) => {
      const currentSeconds = timeToSeconds(getSegmentPbSplitTime(segment));

      if (currentSeconds === null) {
        setSegmentPbSegmentDuration(segment, '');
        return;
      }

      const previousSeconds = index === 0
        ? 0
        : timeToSeconds(getSegmentPbSplitTime(this.routeData.segments[index - 1]));

      if (previousSeconds === null || currentSeconds < previousSeconds) {
        setSegmentPbSegmentDuration(segment, '');
        return;
      }

      const segmentDuration = secondsToTime(currentSeconds - previousSeconds);
      setSegmentPbSegmentDuration(segment, segmentDuration);
    });

    this.updateRouteRunStats();
  }

  updateRouteRunStats() {
    if (!this.routeData || !Array.isArray(this.routeData.segments)) return;

    const lastSegment = this.routeData.segments[this.routeData.segments.length - 1];
    const lastSegmentTime = lastSegment ? getSegmentPbSplitTime(lastSegment) : null;
    
    if (isBetterTime(lastSegmentTime, this.routeData.personalBest)) {
      this.routeData.personalBest = lastSegmentTime;
    }

    const sumOfBestSeconds = this.routeData.segments.reduce((total, segment) => {
      const goldSplitSeconds = timeToSeconds(getSegmentGoldSplit(segment));
      return total + (goldSplitSeconds === null ? 0 : goldSplitSeconds);
    }, 0);

    this.routeData.sumOfBest = secondsToTime(sumOfBestSeconds);
  }

  ensureRouteStatsStructure() {
    if (!this.routeData || !Array.isArray(this.routeData.segments)) return;

    if (typeof this.routeData.personalBest !== 'string') {
      this.routeData.personalBest = '';
    }

    if (typeof this.routeData.sumOfBest !== 'string') {
      this.routeData.sumOfBest = '00:00:00';
    }

    if (!Number.isInteger(this.routeData.currentSegmentId)) {
      this.routeData.currentSegmentId = null;
    }

    if (typeof this.routeData.currentSegmentName !== 'string') {
      this.routeData.currentSegmentName = '';
    }

    this.routeData.segments.forEach((segment) => {
      normalizeSegmentTimingFields(segment);

      if (Object.prototype.hasOwnProperty.call(segment, 'isCurrent')) {
        delete segment.isCurrent;
      }
    });
  }

  getCurrentSegmentPbSplitTime() {
    const currentSegment = this.getCurrentSegmentData();

    if (!currentSegment) {
      return '';
    }

    return getSegmentPbSplitTime(currentSegment);
  }

  populateRoute() {
    if (!this.routeData || !this.routeContainer) return;

    // Clear existing content
    this.routeContainer.innerHTML = '';

    // Create segments
    this.routeData.segments.forEach(segment => {
      const segmentElement = this.createSegment(segment);
      this.routeContainer.appendChild(segmentElement);
    });

    this.disableSubsegmentTimingControls();
  }

  populateSidebar() {
    if (!this.routeData || !this.sidebarList) return;

    this.sidebarList.innerHTML = '';

    this.routeData.segments.forEach(segment => {
      const segmentWasSet = this.sessionSetSegments.has(Number(segment.id));
      const comparisonBestDuration = this.getComparisonBestDuration(segment);
      const sidebarDelta = segmentWasSet
        ? formatDurationDelta(getSegmentPbSegmentDuration(segment), comparisonBestDuration)
        : { text: '--:--:--', state: 'neutral' };
      const isGoldSplit = segmentWasSet && this.sessionGoldSplits.has(Number(segment.id));

      const items = createSidebarSegmentItem({
        segment,
        segmentWasSet,
        sidebarDelta,
        isExpanded: this.isSidebarSegmentExpanded(segment.id),
        isGoldSplit,
        onSegmentClick: async () => {
          this.suppressObserverUntil = Date.now() + 1500;
          await this.setActiveSidebarButton(`segment-${segment.id}`);
          const target = document.getElementById(`segment-${segment.id}`);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        },
        onSegmentDoubleClick: () => this.toggleSidebarSegmentExpansion(segment.id),
        onSegmentContextMenu: (event) => {
          this.openSidebarContextMenu(event, {
            type: 'segment',
            segmentId: Number(segment.id)
          });
        },
        onSubsegmentClick: async (subSegmentIndex) => {
          this.suppressObserverUntil = Date.now() + 1500;
          await this.setActiveSidebarButton(`segment-${segment.id}`);
          const target = document.getElementById(`segment-${segment.id}-subsegment-${subSegmentIndex}`);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        },
        onSubsegmentContextMenu: (event, subSegmentIndex) => {
          this.openSidebarContextMenu(event, {
            type: 'subsegment',
            segmentId: Number(segment.id),
            subSegmentIndex
          });
        }
      });

      items.forEach((item) => this.sidebarList.appendChild(item));
    });

    if (Number.isInteger(this.routeData.currentSegmentId)) {
      this.setActiveSidebarButton(`segment-${this.routeData.currentSegmentId}`, false);
    }
  }

  async setActiveSidebarButton(segmentId, persistProgress = true) {
    document.querySelectorAll('.sidebar__btn').forEach((btn) => {
      btn.classList.toggle('sidebar__btn--active', btn.dataset.segmentId === segmentId);
    });

    this.renderComparisonsPanel();

    if (!persistProgress) return;
    await this.updateCurrentSegmentProgress(segmentId);
  }

  async updateCurrentSegmentProgress(segmentId) {
    if (!this.routeData || !Array.isArray(this.routeData.segments)) return;

    const segmentIdNumber = Number(String(segmentId).replace('segment-', ''));
    if (!Number.isInteger(segmentIdNumber) || segmentIdNumber < 1) return;

    const segment = this.routeData.segments.find((item) => Number(item.id) === segmentIdNumber);
    if (!segment) return;

    const currentId = this.routeData.currentSegmentId;
    const currentName = this.routeData.currentSegmentName;
    if (currentId === segmentIdNumber && currentName === segment.name) return;

    this.routeData.currentSegmentId = segmentIdNumber;
    this.routeData.currentSegmentName = segment.name;

    this.renderComparisonsPanel();

    await this.handleRouteDataChanged();
  }

  initScrollObserver() {
    if (this.observer) this.observer.disconnect();

    const options = {
      root: this.routeContainer,
      rootMargin: '0px 0px -80% 0px',
      threshold: 0
    };

    this.observer = new IntersectionObserver((entries) => {
      if (Date.now() < this.suppressObserverUntil) return;

      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        this.setActiveSidebarButton(entry.target.id).catch((error) => {
          console.error('Failed to persist current segment from observer:', error);
        });
      });
    }, options);

    document.querySelectorAll('.segment').forEach(el => this.observer.observe(el));
  }

  createSegment(segmentData) {
    const segmentDiv = createRouteSegmentElement(segmentData);
    this.addSegmentEventListeners(segmentDiv, segmentData);
    return segmentDiv;
  }

  createSubSegment(subSegmentData, segmentId, subSegmentIndex) {
    const subSegmentDiv = createRouteSubSegmentElement(subSegmentData, segmentId, subSegmentIndex);
    this.addSubSegmentEventListeners(subSegmentDiv, subSegmentData);
    return subSegmentDiv;
  }

  addSegmentEventListeners(element, data) {
    const setButton = element.querySelector('.segment__title--set');
    const timeDisplay = element.querySelector('.segment__title--time');
    if (!setButton || !timeDisplay) return;

    // Set button click handler for segment
    setButton.addEventListener('click', async (e) => {
      if (this.sessionBestBySegment.size === 0) {
        this.captureSessionBestSnapshot();
      }

      this.ensureRunSnapshotCaptured();

      const currentTime = this.getCurrentStopwatchTime();

      setSegmentPbSplitTime(data, currentTime);

      this.updateRunPaceStateFromCompletedSegment(data);

      this.sessionSetSegments.add(Number(data.id));
      this.saveRunSessionToStorage();
      timeDisplay.textContent = currentTime;

      await this.handleRouteDataChanged();

      this.updateSessionGoldSplitState(data);
      this.populateSidebar();
      this.renderComparisonsPanel();

      this.updateMainTimerColor();
      await this.advanceToNextSegment(data.id);
    });
  }

  addSubSegmentEventListeners(element, data) {
  const setButton = element.querySelector('.sub-segment__set');

  if (setButton) {
    setButton.hidden = true;
    setButton.disabled = true;
  }
}

  getCurrentStopwatchTime() {
    const stopwatchElement = document.querySelector('.timer__stopwatch');
    return stopwatchElement ? stopwatchElement.textContent : '00:00:00';
  }

  async advanceToNextSegment(currentSegmentId) {
    const segments = this.routeData.segments;
    const currentIndex = segments.findIndex((s) => Number(s.id) === Number(currentSegmentId));
    const isLastSegment = currentIndex === segments.length - 1;

    if (isLastSegment) {
      const finalTime = getSegmentPbSplitTime(segments[currentIndex]) || '--:--:--';
      const baselinePersonalBest = this.personalBestAtRunStart || this.routeData.personalBest;
      const isNewPB = isBetterTime(finalTime, baselinePersonalBest);

      // Do not write to the official route JSON here.
      // Finishing a run should only show the Run Complete card.
      // The file should update only after the user confirms:
      // - Save New PB
      // - Save Gold Splits
      // - Delete Run Data
      this.runComplete = {
        finalTime,
        isNewPB,
        previousPB: baselinePersonalBest || '--:--:--'
      };

      window.dispatchEvent(new CustomEvent('run:complete', { detail: { finalTime, isNewPB } }));
      this.renderComparisonsPanel();

      this.hasRunStarted = false;

      // Do not clear run storage here.
      // The Run Complete card still needs active run/session data so the user can
      // choose either "Save New PB", "Save Gold Splits", or "Delete Run Data".

      return;
    }

    const nextSegment = segments[currentIndex + 1];
    const nextSegmentDomId = `segment-${nextSegment.id}`;

    this.suppressObserverUntil = Date.now() + 1500;
    await this.setActiveSidebarButton(nextSegmentDomId);

    const target = document.getElementById(nextSegmentDomId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  initStopwatchSync() {
    this.liveStopwatchTime = this.getCurrentStopwatchTime();
    this.updateMainTimerColor();

    window.addEventListener('stopwatch:update', (event) => {
      const detail = event.detail || {};
      if (typeof detail.time === 'string') {
        this.liveStopwatchTime = detail.time;
      }

      this.isStopwatchRunning = detail.runState === 'running';
      if (this.isStopwatchRunning && !this.hasRunStarted) {
        this.resetRouteProgressToFirstSegment();
        this.populateSidebar();
        this.renderComparisonsPanel();

        this.captureSessionBestSnapshot();
        this.ensureRunSnapshotCaptured();
        this.hasRunStarted = true;
        this.saveRunSessionToStorage();
      }

      this.updateMainTimerColor();
      this.renderComparisonsPanel();
    });
  }

  getCurrentSegmentDuration(currentSegment) {
    if (!currentSegment) {
      return { duration: '--:--:--', isLive: false };
    }

    const segmentWasSet = this.sessionSetSegments.has(Number(currentSegment.id));
    const savedDuration = segmentWasSet
      ? (getSegmentPbSegmentDuration(currentSegment) || '--:--:--')
      : '--:--:--';

    if (!this.hasRunStarted && !this.isStopwatchRunning) {
      return { duration: '--:--:--', isLive: false };
    }

    if (!this.isStopwatchRunning) {
      return { duration: savedDuration, isLive: false };
    }

    const segmentIndex = this.routeData.segments.findIndex(
      (segment) => Number(segment.id) === Number(currentSegment.id)
    );

    if (segmentIndex < 0) {
      return { duration: savedDuration, isLive: false };
    }

    const previousSegmentTime = segmentIndex === 0
      ? '00:00:00'
      : getSegmentPbSplitTime(this.routeData.segments[segmentIndex - 1]);

    const previousSeconds = timeToSeconds(previousSegmentTime);
    const liveSeconds = timeToSeconds(this.liveStopwatchTime);

    if (previousSeconds === null || liveSeconds === null || liveSeconds < previousSeconds) {
      return { duration: savedDuration, isLive: false };
    }

    return { duration: secondsToTime(liveSeconds - previousSeconds), isLive: true };
  }

  getCurrentSegmentData() {
    if (!this.routeData || !Array.isArray(this.routeData.segments)) return null;
    if (!Number.isInteger(this.routeData.currentSegmentId)) return null;

    return this.routeData.segments.find(
      (segment) => Number(segment.id) === this.routeData.currentSegmentId
    ) || null;
  }

  getBaselineSegmentById(segmentId) {
    const baselineRouteData = this.runDataSnapshot || this.restoreBaselineRouteFromStorage();

    if (!baselineRouteData || !Array.isArray(baselineRouteData.segments)) {
      return null;
    }

    return baselineRouteData.segments.find(
      (segment) => Number(segment.id) === Number(segmentId)
    ) || null;
  }

  updateRunPaceStateFromCompletedSegment(segment) {
    if (!segment) {
      this.runPaceState = 'neutral';
      this.lastCompletedSegmentId = null;
      return;
    }

    const baselineSegment = this.getBaselineSegmentById(segment.id);

    if (!baselineSegment) {
      this.runPaceState = 'neutral';
      this.lastCompletedSegmentId = Number(segment.id);
      return;
    }

    const actualSplit = getSegmentPbSplitTime(segment);
    const baselineSplit = getSegmentPbSplitTime(baselineSegment);

    this.runPaceState = this.getMainTimerComparisonState(actualSplit, baselineSplit);
    this.lastCompletedSegmentId = Number(segment.id);
  }

  getMainTimerComparisonState(currentRunTime, personalBest) {
    const currentSeconds = timeToSeconds(currentRunTime);
    const bestSeconds = timeToSeconds(personalBest);

    if (currentSeconds === null || bestSeconds === null) {
      return 'neutral';
    }

    if (currentSeconds < bestSeconds) {
      return 'ahead';
    }

    if (currentSeconds > bestSeconds) {
      return 'behind';
    }

    return 'neutral';
  }

  updateMainTimerColor() {
    const timerElement = document.querySelector('.timer__stopwatch');
    if (!timerElement || !this.routeData) return;

    if (!this.hasRunStarted && !this.isStopwatchRunning) {
      timerElement.classList.remove('timer__stopwatch--ahead', 'timer__stopwatch--behind');
      timerElement.classList.add('timer__stopwatch--neutral');
      return;
    }

    let comparisonState = this.runPaceState || 'neutral';

    // If we are already behind at the last completed split,
    // stay red until the next completed split changes the pace state.
    if (this.runPaceState !== 'behind') {
      const currentSegment = this.getCurrentSegmentData();
      const baselineSegment = currentSegment
        ? this.getBaselineSegmentById(currentSegment.id)
        : null;

      const currentTargetSplit = baselineSegment
        ? getSegmentPbSplitTime(baselineSegment)
        : '';

      const currentRunTime = this.liveStopwatchTime || this.getCurrentStopwatchTime();

      if (currentTargetSplit) {
        comparisonState = this.getMainTimerComparisonState(currentRunTime, currentTargetSplit);
      }
    }

    timerElement.classList.toggle('timer__stopwatch--ahead', comparisonState === 'ahead');
    timerElement.classList.toggle('timer__stopwatch--behind', comparisonState === 'behind');
    timerElement.classList.toggle(
      'timer__stopwatch--neutral',
      comparisonState === 'neutral' || comparisonState === 'even'
    );
  }

  renderComparisonsPanel() {
    if (!this.comparisonsContainer) return;

    if (this.runComplete) {
      const { finalTime, isNewPB, previousPB } = this.runComplete;
      const previousPersonalBest = previousPB || '--:--:--';
      const runDelta = formatDurationDelta(finalTime, previousPersonalBest);

      this.comparisonsContainer.innerHTML = createRunCompleteComparisonsHtml({
        finalTime,
        isNewPB,
        previousPersonalBest,
        runDelta,
        sumOfBest: this.routeData.sumOfBest || '--:--:--'
      });

      const saveGoldButton = this.comparisonsContainer.querySelector('.comparisons__end-run-btn');
      if (saveGoldButton) {
        saveGoldButton.addEventListener('click', async () => {
          await this.saveRunCompleteGold();
        });
      }

      const deleteRunButton = this.comparisonsContainer.querySelector('.comparisons__delete-run-btn');
      if (deleteRunButton) {
        deleteRunButton.addEventListener('click', async () => {
          await this.deleteCompletedRunData();
        });
      }

      return;
    }

    const currentSegment = this.getCurrentSegmentData();
    const segmentLabel = currentSegment
      ? `${currentSegment.id}. ${currentSegment.name}`
      : 'No segment selected';

    const durationMeta = this.getCurrentSegmentDuration(currentSegment);
    const currentDuration = durationMeta.duration;
    const segmentStatus = (!this.hasRunStarted && !this.isStopwatchRunning)
      ? { state: 'idle', text: 'IDLE' }
      : (durationMeta.isLive
        ? { state: 'live', text: 'LIVE' }
        : { state: 'saved', text: 'SAVED' });

    const bestDuration = currentSegment
      ? (this.getComparisonBestDuration(currentSegment) || '--:--:--')
      : '--:--:--';

    const delta = formatDurationDelta(currentDuration, bestDuration);
    const currentRunTime = this.liveStopwatchTime || this.getCurrentStopwatchTime();
    const personalBest = this.routeData && typeof this.routeData.personalBest === 'string'
      ? (this.routeData.personalBest || '--:--:--')
      : '--:--:--';
    const runDelta = this.hasRunStarted
      ? formatDurationDelta(currentRunTime, personalBest)
      : { text: '--:--:--', state: 'neutral' };
    const isGoldSplit = Boolean(
      currentSegment &&
      this.sessionGoldSplits.has(currentSegment.id)
    );

    this.comparisonsContainer.innerHTML = createComparisonsHtml({
      segmentLabel,
      currentDuration,
      segmentStatus,
      bestDuration,
      delta,
      currentRunTime,
      personalBest,
      runDelta,
      sumOfBest: this.routeData.sumOfBest || '--:--:--',
      isGoldSplit,
      isStopwatchRunning: this.isStopwatchRunning,
      hasRunStarted: this.hasRunStarted
    });

    if (this.hasRunStarted) {
      const resetRunButton = this.comparisonsContainer.querySelector('.comparisons__reset-run-btn');
      if (resetRunButton) {
        resetRunButton.addEventListener('click', async () => {
          await this.resetRun();
        });
      }
    }
  }
}

// Initialize route loader when DOM is ready
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('DOMContentLoaded', () => {
    const routeLoader = new RouteLoader();
    routeLoader.init();
  });
}

export { RouteLoader };