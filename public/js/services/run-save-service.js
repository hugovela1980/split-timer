import {
    isBetterTime,
    getSegmentPbSegmentDuration,
    getSegmentGoldSplit,
    setSegmentGoldSplit
} from '../utils/utils.js';

export class RunSaveService {
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
            } else {
                setSegmentGoldSplit(targetSegment, baselineGoldSplit);
            }
        });
    }
}