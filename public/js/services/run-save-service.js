import {
    deepClone,
    isBetterTime,
    timeToSeconds,
    timeToMilliseconds,
    secondsToTime,
    getSegmentPbSplitTime,
    getSegmentPbSegmentDuration,
    getSegmentGoldSplit,
    setSegmentGoldSplit
} from '../utils/utils.js';

export class RunSaveService {
    createRunCompleteState({
        finalTime = '--:--:--',
        isNewPB = false,
        previousPB = ''
    } = {}) {
        return {
            finalTime,
            isNewPB,
            previousPB: previousPB || '--:--:--'
        };
    }

    updatePersonalBestFromFinalSegment(routeData) {
        if (!routeData || !Array.isArray(routeData.segments)) {
            return;
        }

        const lastSegment = routeData.segments[routeData.segments.length - 1];
        const lastSegmentTime = lastSegment ? getSegmentPbSplitTime(lastSegment) : null;

        if (isBetterTime(lastSegmentTime, routeData.personalBest)) {
            routeData.personalBest = lastSegmentTime;
        }
    }

    createGoldSplitSaveRoute({
        activeRunRouteData,
        baselineRouteData,
        sessionSetSegments = new Set(),
        personalBestAtRunStart = ''
    } = {}) {
        if (
            !activeRunRouteData ||
            !baselineRouteData ||
            !Array.isArray(activeRunRouteData.segments) ||
            !Array.isArray(baselineRouteData.segments)
        ) {
            return null;
        }

        const mergedRouteData = deepClone(baselineRouteData);

        this.updateGoldSplitsFromCompletedRun({
            targetRouteData: mergedRouteData,
            activeRunRouteData,
            baselineRouteData,
            sessionSetSegments
        });

        mergedRouteData.personalBest =
            personalBestAtRunStart || mergedRouteData.personalBest || '';

        return mergedRouteData;
    }

    updateGoldSplitsFromCompletedRun({
        targetRouteData,
        activeRunRouteData,
        baselineRouteData,
        sessionSetSegments = new Set()
    } = {}) {
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

            if (!sessionSetSegments.has(segmentId)) {
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
                targetSegment.goldSegmentMs = timeToMilliseconds(activeDuration);
            } else {
                setSegmentGoldSplit(targetSegment, baselineGoldSplit);
                targetSegment.goldSegmentMs = timeToMilliseconds(baselineGoldSplit);
            }
        });
    }

    recalculateSumOfBest(routeData) {
        if (!routeData || !Array.isArray(routeData.segments)) {
            return;
        }

        const sumOfBestSeconds = routeData.segments.reduce((total, segment) => {
            const goldSplitSeconds = timeToSeconds(getSegmentGoldSplit(segment));

            return total + (goldSplitSeconds === null ? 0 : goldSplitSeconds);
        }, 0);

        routeData.sumOfBest = secondsToTime(sumOfBestSeconds);
        routeData.sumOfBestMs = sumOfBestSeconds * 1000;
    }

    syncCanonicalPbTimingFields(routeData) {
        if (!routeData || !Array.isArray(routeData.segments)) {
            return;
        }

        routeData.personalBestMs = timeToMilliseconds(routeData.personalBest);

        routeData.segments.forEach((segment) => {
            segment.pbSplitMs = timeToMilliseconds(getSegmentPbSplitTime(segment));
            segment.pbSegmentMs = timeToMilliseconds(getSegmentPbSegmentDuration(segment));
        });
    }
}