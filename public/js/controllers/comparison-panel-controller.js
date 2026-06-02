import {
    formatDurationDelta,
    getSegmentGoldSplit,
    getSegmentPbSplitTime
} from '../utils/utils.js';

import {
    createRunCompleteComparisonsHtml,
    createComparisonsHtml
} from '../ui/ui.js';

export class ComparisonPanelController {
    constructor({
        comparisonsContainer = null
    } = {}) {
        this.comparisonsContainer = comparisonsContainer;
    }

    setComparisonsContainer(comparisonsContainer) {
        this.comparisonsContainer = comparisonsContainer;
    }

    renderRunComplete({
        runComplete,
        routeData
    } = {}) {
        if (!this.comparisonsContainer || !runComplete) return;

        const { finalTime, isNewPB, previousPB } = runComplete;
        const previousPersonalBest = previousPB || '--:--:--';
        const runDelta = formatDurationDelta(finalTime, previousPersonalBest);

        this.comparisonsContainer.innerHTML = createRunCompleteComparisonsHtml({
            finalTime,
            isNewPB,
            previousPersonalBest,
            runDelta,
            sumOfBest: routeData?.sumOfBest || '--:--:--'
        });
    }

    renderCurrentComparison({
        currentSegment,
        currentDuration,
        durationMeta,
        hasRunStarted = false,
        isStopwatchRunning = false,
        comparisonBestDuration = '--:--:--',
        currentRunTime = '--:--:--',
        personalBest = '--:--:--',
        sumOfBest = '--:--:--',
        sessionGoldSplits = new Set()
    } = {}) {
        if (!this.comparisonsContainer) return;

        const segmentLabel = currentSegment
            ? `${currentSegment.id}. ${currentSegment.name}`
            : 'No segment selected';

        const currentStatus = (!hasRunStarted && !isStopwatchRunning)
            ? { state: 'idle', text: 'IDLE' }
            : (durationMeta?.isLive
                ? { state: 'live', text: 'LIVE' }
                : (durationMeta?.isPaused
                    ? { state: 'paused', text: 'PAUSED' }
                    : { state: 'saved', text: 'SAVED' }));

        const bestDuration = comparisonBestDuration || '--:--:--';
        const delta = formatDurationDelta(currentDuration, bestDuration);

        const runDelta = hasRunStarted
            ? formatDurationDelta(currentRunTime, personalBest)
            : { text: '--:--:--', state: 'neutral' };

        const isGoldSplit = Boolean(
            currentSegment && sessionGoldSplits.has(Number(currentSegment.id))
        );

        this.comparisonsContainer.innerHTML = createComparisonsHtml({
            segmentLabel,
            currentDuration,
            currentStatus,
            bestDuration,
            delta,
            currentRunTime,
            personalBest,
            runDelta,
            sumOfBest,
            isGoldSplit,
            isStopwatchRunning,
            hasRunStarted
        });
    }
}