// Route Loader - Dynamically loads and populates route data from JSON
import { StartScreenController } from '../controllers/start-screen-controller.js';
import { ScrollNavigationController } from '../controllers/scroll-navigation-controller.js';
import { RunSidebarController } from '../controllers/run-sidebar-controller.js';
import { RouteEditorController } from '../controllers/route-editor-controller.js';
import { ComparisonPanelController } from '../controllers/comparison-panel-controller.js';
import { RouteSelectorService } from '../services/route-selector-service.js';
import { RouteDataService } from '../services/route-data-service.js';
import { RouteStorageService } from '../services/route-storage-service.js';
import { RunSaveService } from '../services/run-save-service.js';
import {
  deepClone,
  timeToSeconds,
  isBetterTime,
  secondsToTime,
  escapeHtml,
  toKebabCase,
  getSegmentGoldSplit,
  setSegmentGoldSplit,
  getSegmentPbSplitTime,
  setSegmentPbSplitTime,
  getSegmentPbSegmentDuration,
  setSegmentPbSegmentDuration,
  normalizeSegmentTimingFields,
} from '../utils/utils.js';
import {
  createRouteSegmentElement,
  createRouteSubSegmentElement,
} from '../ui/ui.js';

class SplitTimerController {
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
    this.lastCompletedRunReview = null;
    this.sidebarReviewTab = 'current-run';
    this.sessionGoldSplits = new Set();
    this.sessionSetSegments = new Set();
    this.sessionBestBySegment = new Map();
    this.runDataSnapshot = null;
    this.personalBestAtRunStart = '';
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
    this.startScreenController = options.startScreenController || null;
    this.scrollNavigationController = options.scrollNavigationController || null;
    this.runSidebarController = options.runSidebarController || null;
    this.routeEditorController = options.routeEditorController || null;
    this.comparisonPanelController = options.comparisonPanelController || null;
    this.storageProvider = options.storageProvider || (typeof globalThis !== 'undefined' && globalThis.localStorage ? globalThis.localStorage : null);
    this.routeStorageService = options.routeStorageService || new RouteStorageService({
      storageProvider: this.storageProvider,
      keys: {
        routeData: this.routeStorageKey,
        baselineRouteData: this.baselineRouteStorageKey,
        activeRunRouteData: this.activeRunRouteStorageKey,
        runSession: this.runSessionStorageKey
      }
    });
    this.routeDataService = options.routeDataService || new RouteDataService();
    this.routeSelectorService = options.routeSelectorService || new RouteSelectorService();
    this.runSaveService = options.runSaveService || new RunSaveService();
    this.routeFileSaver = options.routeFileSaver || null;
  }

  async init() {
    try {
      // 1. Load the initial route data from the JSON file.
      await this.populateRouteSelectorFromServer();
      await this.loadRouteData(this.currentRouteFilename);
      this.ensureRouteStatsStructure();
      this.updateSegmentDurations();
      this.resetRunSessionState();

      // 2. Cache DOM references needed by controllers and UI methods.
      this.startScreen = document.getElementById('start-screen');
      this.startRouteSelector = document.getElementById('start-route-selector');
      this.startCreateRouteButton = document.getElementById('start-create-route-btn');
      this.startRouteButton = document.getElementById('start-route-btn');
      this.appShell = document.getElementById('app-shell');
      this.routeContainer = document.querySelector('.route');
      this.comparisonsContainer = document.querySelector('.comparisons');
      this.sidebarList = document.querySelector('.sidebar__list');
      this.sidebarContextMenu = document.getElementById('sidebar-context-menu');
      this.renameSidebarItemModal = document.getElementById('rename-sidebar-item-modal');
      this.renameSidebarItemForm = document.getElementById('rename-sidebar-item-form');
      this.renameSidebarItemTitle = document.getElementById('rename-sidebar-item-title');
      this.renameSidebarItemInput = document.getElementById('rename-sidebar-item-input');
      this.renameSidebarItemCancelButton = document.getElementById('rename-sidebar-item-cancel');

      // 3. Initialize controllers that need DOM references.
      this.initRunSidebarController();
      this.initComparisonPanelController();
      this.initScrollNavigationController();
      this.initRouteEditorController();

      // 4. Register app event listeners and controller-driven UI behavior.
      this.initStopwatchSync();
      this.initEditorControls();
      this.initSidebarContextMenu();
      this.initRenameSidebarItemModal()
      this.initRouteSelector();
      this.initStartScreen();

      // 5. Prepare initial route state and render the app UI.
      this.resetRouteProgressToFirstSegment();
      this.populateRoute();
      this.populateSidebar();
      this.renderComparisonsPanel();
      this.refreshEditorSegmentOptions();

      // 6. Start observing rendered route segments.
      // This must happen after populateRoute(), because the .segment elements
      // need to exist before the observer can attach to them.
      this.initScrollObserver();

      // 7. Sync the UI to the first segment without scrolling or saving.
      await this.resetRouteProgressToFirstSegmentAndRender({
        scroll: false,
        save: false
      });

      // 8. Store clean in-browser state for session recovery/reset behavior.
      // On fresh app load, treat the JSON file as the clean source of truth.
      // Do not write the loaded route back to disk.
      this.persistRouteDataToStorage();
      this.saveBaselineRouteToStorage();
      this.saveActiveRunRouteToStorage();
    } catch (error) {
      console.error('Failed to initialize SplitTimerController:', error);
    }
  }

  disableSubsegmentTimingControls() {
    document.querySelectorAll('.sub-segment__set').forEach((button) => {
      button.hidden = true;
      button.disabled = true;
    });
  }

  initStartScreen() {
    this.startScreenController = this.startScreenController || new StartScreenController({
      startRouteButton: this.startRouteButton,
      startRouteSelector: this.startRouteSelector,
      startScreen: this.startScreen,
      appShell: this.appShell,
      startCreateRouteButton: this.startCreateRouteButton,
      populateStartRouteSelector: () => this.populateStartRouteSelectorFromMainSelector(),
      confirmRouteSwitch: () => this.confirmRouteSwitchIfRunActive(),
      switchRoute: (selectedRoute) => this.switchRoute(selectedRoute),
      showCreateRouteModal: (options) => this.showCreateRouteModal(options),
      dispatchEvent: (event) => window.dispatchEvent(event),
      CustomEventClass: CustomEvent
    });

    this.startScreenController.init();
  }

  initScrollNavigationController() {
    this.scrollNavigationController = this.scrollNavigationController || new ScrollNavigationController({
      routeContainer: this.routeContainer,
      getSuppressObserverUntil: () => this.suppressObserverUntil,
      onVisibleSegmentChange: (segmentId) => this.setActiveSidebarButton(segmentId, false),
      onError: (error) => {
        console.error('Failed to persist current segment from observer:', error);
      }
    });

    this.scrollNavigationController.setRouteContainer(this.routeContainer);
  }

  initRunSidebarController() {
    this.runSidebarController = this.runSidebarController || new RunSidebarController({
      sidebarList: this.sidebarList,
      getActiveTab: () => this.sidebarReviewTab,
      setActiveTab: (tab) => {
        this.sidebarReviewTab = tab;
      },
      getLastCompletedRunReview: () => this.lastCompletedRunReview,
      onTabChange: () => this.populateSidebar()
    });

    this.runSidebarController.setSidebarList(this.sidebarList);
  }

  initRouteEditorController() {
    this.routeEditorController = this.routeEditorController || new RouteEditorController({
      getSegments: () => this.routeData?.segments || [],
      getNextSegmentId: () => this.getNextSegmentId(),

      onAddSegment: async ({ id, name }) => {
        this.routeData.segments.push({
          id,
          name,
          time: '',
          duration: '',
          bestTime: '',
          allowSetTime: true,
          completed: false,
          subSegments: []
        });

        await this.handleRouteStructureChanged();
      },

      onAddSubsegment: async ({ parentId, description, allowSetTime }) => {
        const targetSegment = this.routeData.segments.find((segment) => (
          Number(segment.id) === Number(parentId)
        ));

        if (!targetSegment) return;

        targetSegment.subSegments.push({
          description,
          time: '',
          completed: false,
          allowSetTime
        });

        await this.handleRouteStructureChanged();
      },

      onDeleteSegment: async ({ segmentId }) => {
        this.routeData.segments = this.routeData.segments.filter((segment) => (
          Number(segment.id) !== Number(segmentId)
        ));

        this.reindexSegmentIds();

        const fallbackSegment = this.routeData.segments[0] || null;

        this.routeData.currentSegmentId = fallbackSegment
          ? Number(fallbackSegment.id)
          : null;

        this.routeData.currentSegmentName = fallbackSegment
          ? fallbackSegment.name
          : '';

        await this.handleRouteStructureChanged();
      },

      sidebarContextMenu: this.sidebarContextMenu,

      getSidebarContextTarget: () => this.sidebarContextTarget,

      setSidebarContextTarget: (target) => {
        this.sidebarContextTarget = target;
      },

      onRenameContextTarget: async (target) => {
        this.routeEditorController.openRenameSidebarItemModal(target);
      },

      onDeleteContextTarget: async (target) => {
        await this.deleteSidebarContextTarget(target);
      },

      onClearSplitContextTarget: async (target) => {
        if (!target || target.type !== 'segment') return;

        await this.clearSegmentSplitFromContextTarget(target);
      },

      renameSidebarItemModal: this.renameSidebarItemModal,
      renameSidebarItemForm: this.renameSidebarItemForm,
      renameSidebarItemTitle: this.renameSidebarItemTitle,
      renameSidebarItemInput: this.renameSidebarItemInput,
      renameSidebarItemCancelButton: this.renameSidebarItemCancelButton,

      getRenameSidebarItemTarget: () => this.renameSidebarItemTarget,

      setRenameSidebarItemTarget: (target) => {
        this.renameSidebarItemTarget = target;
      },

      onRenameSidebarItem: async ({ target, name }) => {
        await this.renameSidebarContextTarget(target, name);
      }
    });
  }

  initRenameSidebarItemModal() {
    this.routeEditorController.initRenameSidebarItemModal();
  }

  initComparisonPanelController() {
    this.comparisonPanelController = this.comparisonPanelController || new ComparisonPanelController({
      comparisonsContainer: this.comparisonsContainer
    });

    this.comparisonPanelController.setComparisonsContainer(this.comparisonsContainer);
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
      this.currentRouteFilename = filename;
      this.expandedSidebarSegmentIds = new Set();
      this.routeData = await this.routeDataService.loadRouteData(filename);
    } catch (error) {
      this.clearRunSnapshot();
      throw error;
    }
  }

  persistRouteDataToStorage() {
    this.routeStorageService.persistRouteData(this.routeData);
  }

  saveBaselineRouteToStorage() {
    this.routeStorageService.saveBaselineRoute(this.routeData);
  }

  restoreBaselineRouteFromStorage() {
    return this.routeStorageService.restoreBaselineRoute();
  }

  saveActiveRunRouteToStorage() {
    this.routeStorageService.saveActiveRunRoute(this.routeData);
  }

  restoreActiveRunRouteFromStorage() {
    return this.routeStorageService.restoreActiveRunRoute();
  }

  clearRunStorage() {
    this.routeStorageService.clearRunStorage();
  }

  clearAllRouteStorage() {
    this.routeStorageService.clearAllRouteStorage();
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

  hasSetSegmentsInRouteData(routeData) {
    if (!routeData || !Array.isArray(routeData.segments)) {
      return false;
    }

    return routeData.segments.some((segment) => (
      this.sessionSetSegments.has(Number(segment.id))
    ));
  }

  resetRouteProgressToFirstSegment() {
    const firstSegment = this.routeData && Array.isArray(this.routeData.segments)
      ? this.routeData.segments[0]
      : null;

    if (!firstSegment) return;

    this.routeData.currentSegmentId = Number(firstSegment.id);
    this.routeData.currentSegmentName = firstSegment.name;
  }

  scrollRouteToSegment(segmentId, options = {}) {
    const routeContainer = this.routeContainer || document.querySelector('.route');

    const segmentDomId = String(segmentId).startsWith('segment-')
      ? String(segmentId)
      : `segment-${segmentId}`;

    const target = document.getElementById(segmentDomId);

    if (!routeContainer || !target) return;

    this.suppressObserverUntil = Date.now() + 1500;

    const routeRect = routeContainer.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    const offset = options.block === 'center'
      ? (targetRect.height / 2) - (routeRect.height / 2)
      : 0;

    const nextScrollTop = Math.max(
      0,
      routeContainer.scrollTop +
      targetRect.top -
      routeRect.top +
      offset
    );

    routeContainer.scrollTo({
      top: nextScrollTop,
      behavior: options.behavior || 'smooth'
    });
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
      this.scrollRouteToSegment(segmentDomId);
    }
  }

  async resetRouteProgressToFirstSegmentAndRender({ scroll = true, save = false } = {}) {
    this.resetRouteProgressToFirstSegment();
    await this.syncUiToCurrentSegment({ scroll });

    if (save) {
      await this.saveCleanRouteState({ force: true });
    }
  }

  getRouteFileSaver() {
    if (this.routeFileSaver) {
      return this.routeFileSaver;
    }

    if (
      typeof window !== 'undefined' &&
      window.fileSaver &&
      typeof window.fileSaver.saveRouteData === 'function'
    ) {
      return window.fileSaver;
    }

    return null;
  }

  async saveRouteDataToFile(options = {}) {
    const routeFileSaver = this.getRouteFileSaver();

    if (routeFileSaver && typeof routeFileSaver.saveRouteData === 'function') {
      await routeFileSaver.saveRouteData(
        this.routeData,
        this.currentRouteFilename,
        options
      );
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

    this.captureLastCompletedRunReview({
      action: 'deleted-run-data'
    });

    this.sidebarReviewTab = 'last-run';

    this.resetRunSessionState();

    this.populateRoute();
    await this.resetRouteProgressToFirstSegmentAndRender({ scroll: true, save: false });

    window.dispatchEvent(new CustomEvent('stopwatch:clear'));
  }

  async restartRun() {
    this.restoreBaselineRouteState();
    this.resetRunSessionState();

    this.populateRoute();
    await this.resetRouteProgressToFirstSegmentAndRender({ scroll: true, save: false });

    window.dispatchEvent(new CustomEvent('stopwatch:clear'));
  }

  captureLastCompletedRunReview({ action = '' } = {}) {
    const activeRunRouteData = this.restoreActiveRunRouteFromStorage();

    const setSegmentIds = new Set(
      [...this.sessionSetSegments].map((segmentId) => Number(segmentId))
    );

    const recordedSegments = activeRunRouteData && Array.isArray(activeRunRouteData.segments)
      ? activeRunRouteData.segments.filter((segment) => (
        setSegmentIds.has(Number(segment.id))
      ))
      : [];

    const hasRecordedRunData = recordedSegments.length > 0;

    this.lastCompletedRunReview = {
      action,
      runComplete: this.runComplete ? deepClone(this.runComplete) : null,
      routeData: hasRecordedRunData
        ? {
          ...deepClone(activeRunRouteData),
          segments: deepClone(recordedSegments)
        }
        : null,
      hasRecordedRunData,
      capturedAt: new Date().toISOString()
    };

    this.sidebarReviewTab = 'last-run';
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
    this.runSaveService.updateGoldSplitsFromCompletedRun({
      targetRouteData,
      activeRunRouteData,
      baselineRouteData,
      sessionSetSegments: this.sessionSetSegments
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
    const currentRunTime = this.getCompletedRunFinalTime();
    const baselinePersonalBest = this.getBaselinePersonalBestForCompletedRun();
    const isNewPB = this.isNewPersonalBest(currentRunTime, baselinePersonalBest);

    this.runComplete = this.runSaveService.createRunCompleteState({
      finalTime: currentRunTime,
      isNewPB,
      previousPB: baselinePersonalBest
    });

    this.hasRunStarted = false;

    this.renderComparisonsPanel();
    this.saveRunSessionToStorage();
  }

  isNewPersonalBest(finalTime, previousPB) {
    const finalSeconds = timeToSeconds(finalTime);
    const previousSeconds = timeToSeconds(previousPB);

    if (finalSeconds === null) return false;

    return previousSeconds === null || finalSeconds < previousSeconds;
  }

  isValidCompletedRunTime(time) {
    const seconds = timeToSeconds(time);

    return seconds !== null && seconds > 0;
  }

  getCompletedRunFinalTime(segment = null) {
    const segmentSplitTime = segment ? getSegmentPbSplitTime(segment) : '';
    const liveStopwatchTime = this.liveStopwatchTime;

    if (this.isValidCompletedRunTime(segmentSplitTime)) {
      return segmentSplitTime;
    }

    if (this.isValidCompletedRunTime(liveStopwatchTime)) {
      return liveStopwatchTime;
    }

    if (typeof document !== 'undefined') {
      const currentStopwatchTime = this.getCurrentStopwatchTime();

      if (this.isValidCompletedRunTime(currentStopwatchTime)) {
        return currentStopwatchTime;
      }
    }

    return '--:--:--';
  }

  getBaselinePersonalBestForCompletedRun() {
    // If a run is/was in progress, trust the PB captured at run start.
    // An empty string is meaningful: it means this was a first run.
    if (this.runDataSnapshot || this.hasRunStarted) {
      return this.personalBestAtRunStart || '';
    }

    return this.routeData?.personalBest || '';
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

    this.captureLastCompletedRunReview({
      action: this.runComplete?.isNewPB ? 'saved-pb' : 'saved-gold-splits'
    });

    this.sidebarReviewTab = 'last-run';

    this.resetRunSessionState();

    this.populateRoute();
    await this.resetRouteProgressToFirstSegmentAndRender({ scroll: true, save: false });

    window.dispatchEvent(new CustomEvent('stopwatch:clear'));
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
    this.routeEditorController.initEditorControls();
  }

  initSidebarContextMenu() {
    this.routeEditorController.initSidebarContextMenu();
  }

  openSidebarContextMenu(event, target) {
    this.routeEditorController.openSidebarContextMenu(event, target);
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
    this.routeEditorController.openRenameSidebarItemModal(target);
  }

  async renameSidebarContextTarget(target, nextName) {
    if (!target || !nextName) return;

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
    if (!target || target.type !== 'segment') return;

    const segment = this.getSegmentById(target.segmentId);

    if (!segment) return;

    if (!confirm(`Clear gold split for segment "${segment.name}"?`)) {
      return;
    }

    const activeSegmentId = Number(this.routeData.currentSegmentId) || Number(segment.id);

    setSegmentGoldSplit(segment, '');
    segment.goldSegmentMs = null;

    const numericSegmentId = Number(segment.id);
    this.sessionGoldSplits.delete(numericSegmentId);
    this.sessionBestBySegment.delete(numericSegmentId);
    this.saveRunSessionToStorage();

    this.runComplete = null;
    this.updateRouteRunStats();

    this.suppressObserverUntil = Date.now() + 1500;

    this.rerenderRouteUI();

    await this.setActiveSidebarButton(`segment-${activeSegmentId}`, false);

    this.suppressObserverUntil = Date.now() + 1500;

    this.persistRouteDataToStorage();
    await this.saveRouteDataToFile({ force: true });
  }

  populateStartRouteSelectorFromMainSelector() {
    const routeSelector = document.getElementById('route-selector');

    this.routeSelectorService.populateStartRouteSelectorFromMainSelector({
      mainSelector: routeSelector,
      startRouteSelector: this.startRouteSelector,
      currentRouteFilename: this.currentRouteFilename
    });
  }

  async populateRouteSelectorFromServer() {
    try {
      const routeSelector = document.getElementById('route-selector');

      this.currentRouteFilename = await this.routeSelectorService.populateRouteSelectorFromServer({
        routeSelector,
        currentRouteFilename: this.currentRouteFilename
      });
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
      this.lastCompletedRunReview = null;
      this.sidebarReviewTab = 'current-run';
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
    this.routeEditorController.refreshEditorSegmentOptions();
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
    this.routeStorageService.saveRunSession({
      hasRunStarted: this.hasRunStarted,
      runComplete: this.runComplete,
      runPaceState: this.runPaceState,
      lastCompletedSegmentId: this.lastCompletedSegmentId,
      currentRouteFilename: this.currentRouteFilename,
      sessionGoldSplits: this.sessionGoldSplits,
      sessionSetSegments: this.sessionSetSegments,
      sessionBestBySegment: this.sessionBestBySegment,
      personalBestAtRunStart: this.personalBestAtRunStart
    });
  }

  restoreRunSessionFromStorage() {
    return this.routeStorageService.restoreRunSession();
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

    this.runSaveService.updatePersonalBestFromFinalSegment(this.routeData);
    this.runSaveService.syncCanonicalPbTimingFields(this.routeData);
    this.runSaveService.recalculateSumOfBest(this.routeData);
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

    this.runSidebarController.ensureReviewTabs();

    if (this.sidebarReviewTab === 'last-run') {
      this.runSidebarController.populateLastRunSidebar();
      return;
    }

    this.runSidebarController.populateCurrentRunSidebar({
      routeData: this.routeData,
      sessionSetSegments: this.sessionSetSegments,
      sessionGoldSplits: this.sessionGoldSplits,
      getComparisonBestDuration: (segment) => this.getComparisonBestDuration(segment),
      isSidebarSegmentExpanded: (segmentId) => this.isSidebarSegmentExpanded(segmentId),

      onSegmentClick: async (segment) => {
        this.suppressObserverUntil = Date.now() + 1500;
        await this.setActiveSidebarButton(`segment-${segment.id}`, false);
        this.scrollRouteToSegment(segment.id);
      },

      onSegmentDoubleClick: (segment) => {
        this.toggleSidebarSegmentExpansion(segment.id);
      },

      onSegmentContextMenu: (event, segment) => {
        this.openSidebarContextMenu(event, {
          type: 'segment',
          segmentId: Number(segment.id)
        });
      },

      onSubsegmentClick: async (segment, subSegmentIndex) => {
        this.suppressObserverUntil = Date.now() + 1500;
        await this.setActiveSidebarButton(`segment-${segment.id}`, false);
        this.scrollRouteToSegment(segment.id, { block: 'center' });
      },

      onSubsegmentContextMenu: (event, segment, subSegmentIndex) => {
        this.openSidebarContextMenu(event, {
          type: 'subsegment',
          segmentId: Number(segment.id),
          subSegmentIndex
        });
      },

      setActiveSidebarButton: (segmentId, persistProgress) => (
        this.setActiveSidebarButton(segmentId, persistProgress)
      )
    });
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
    if (this.runComplete) {
      this.renderComparisonsPanel();
      return;
    }

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
    this.scrollNavigationController.observeSegments();
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
      const finalTime = this.getCompletedRunFinalTime(segments[currentIndex]);
      const baselinePersonalBest = this.getBaselinePersonalBestForCompletedRun();
      const isNewPB = this.isNewPersonalBest(finalTime, baselinePersonalBest);

      // Do not write to the official route JSON here.
      // Finishing a run should only show the Run Complete card.
      // The file should update only after the user confirms:
      // - Save New PB
      // - Save Gold Splits
      // - Delete Run Data
      this.runComplete = this.runSaveService.createRunCompleteState({
        finalTime,
        isNewPB,
        previousPB: baselinePersonalBest
      });

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

    this.scrollRouteToSegment(nextSegment.id);
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
        this.sidebarReviewTab = 'current-run';

        this.resetRouteProgressToFirstSegment();
        this.populateSidebar();
        this.scrollRouteToSegment(this.routeData.currentSegmentId || 1);
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

    return {
      duration: secondsToTime(liveSeconds - previousSeconds),
      isLive: this.isStopwatchRunning,
      isPaused: this.hasRunStarted && !this.isStopwatchRunning
    };
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
      this.comparisonPanelController.renderRunComplete({
        runComplete: this.runComplete,
        routeData: this.routeData
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
    const durationMeta = this.getCurrentSegmentDuration(currentSegment);
    const currentDuration = durationMeta.duration;

    const comparisonBestDuration = currentSegment
      ? (this.getComparisonBestDuration(currentSegment) || '--:--:--')
      : '--:--:--';

    const currentRunTime = this.liveStopwatchTime || this.getCurrentStopwatchTime();

    const personalBest = this.routeData && typeof this.routeData.personalBest === 'string'
      ? (this.routeData.personalBest || '--:--:--')
      : '--:--:--';

    this.comparisonPanelController.renderCurrentComparison({
      currentSegment,
      currentDuration,
      durationMeta,
      hasRunStarted: this.hasRunStarted,
      isStopwatchRunning: this.isStopwatchRunning,
      comparisonBestDuration,
      currentRunTime,
      personalBest,
      sumOfBest: this.routeData.sumOfBest || '--:--:--',
      sessionGoldSplits: this.sessionGoldSplits
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
    const splitTimerController = new SplitTimerController();
    splitTimerController.init();
  });
}

export { SplitTimerController };