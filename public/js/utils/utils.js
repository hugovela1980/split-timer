// Shared pure helper functions for stopwatch route logic

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function timeToSeconds(timeString) {
  if (!timeString || typeof timeString !== 'string') return null;

  const parts = timeString.split(':');
  if (parts.length !== 3) return null;

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  const seconds = Number(parts[2]);

  if ([hours, minutes, seconds].some(Number.isNaN)) return null;
  if (minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59 || hours < 0) return null;

  return (hours * 3600) + (minutes * 60) + seconds;
}

export function timeToMilliseconds(timeValue) {
  if (timeValue === null || timeValue === undefined || timeValue === '') {
    return null;
  }

  if (typeof timeValue === 'number') {
    return timeValue * 1000;
  }

  const seconds = timeToSeconds(timeValue);

  if (Number.isNaN(seconds)) {
    return null;
  }

  return seconds * 1000;
}

export function isBetterTime(candidateTime, referenceTime) {
  const candidateSeconds = timeToSeconds(candidateTime);
  if (candidateSeconds === null) return false;

  const referenceSeconds = timeToSeconds(referenceTime);
  return referenceSeconds === null || candidateSeconds < referenceSeconds;
}

export function secondsToTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function toKebabCase(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/[,]+/g, ' ')
    .replace(/[^a-z0-9\s\-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function formatDurationDelta(currentDuration, bestDuration) {
  const currentSeconds = timeToSeconds(currentDuration);
  const bestSeconds = timeToSeconds(bestDuration);

  if (currentSeconds === null || bestSeconds === null) {
    return { text: '--:--:--', state: 'neutral' };
  }

  const difference = currentSeconds - bestSeconds;
  if (difference === 0) {
    return { text: '+00:00:00', state: 'even' };
  }

  const sign = difference > 0 ? '+' : '-';
  return {
    text: `${sign}${secondsToTime(Math.abs(difference))}`,
    state: difference > 0 ? 'behind' : 'ahead'
  };
}

export function getSegmentPbSplitTime(segment) {
  return segment?.pbSplitTime || segment?.time || '';
}

export function setSegmentPbSplitTime(segment, value) {
  if (!segment) return;

  segment.pbSplitTime = value;
  segment.time = value; // backwards compatibility
}

export function getSegmentPbSegmentDuration(segment) {
  return segment?.pbSegmentDuration || segment?.duration || '';
}

export function setSegmentPbSegmentDuration(segment, value) {
  if (!segment) return;

  segment.pbSegmentDuration = value;
  segment.duration = value; // backwards compatibility
}

export function getSegmentGoldSplit(segment) {
  return segment?.goldSplit || segment?.bestTime || '';
}

export function setSegmentGoldSplit(segment, value) {
  if (!segment) return;

  segment.goldSplit = value;
  segment.bestTime = value; // backwards compatibility
}

export function normalizeSegmentTimingFields(segment) {
  if (!segment) return;

  const pbSplitTime = getSegmentPbSplitTime(segment);
  const pbSegmentDuration = getSegmentPbSegmentDuration(segment);
  const goldSplit = getSegmentGoldSplit(segment);

  setSegmentPbSplitTime(segment, pbSplitTime);
  setSegmentPbSegmentDuration(segment, pbSegmentDuration);
  setSegmentGoldSplit(segment, goldSplit);

  if (segment.pbSplitMs === undefined) {
    segment.pbSplitMs = timeToMilliseconds(pbSplitTime);
  }

  if (segment.pbSegmentMs === undefined) {
    segment.pbSegmentMs = timeToMilliseconds(pbSegmentDuration);
  }

  if (segment.goldSegmentMs === undefined) {
    segment.goldSegmentMs = timeToMilliseconds(goldSplit);
  }
}

export function normalizeSubSegmentTimingFields(subSegment) {
  if (!subSegment) return;

  if (subSegment.setTimeMs === undefined) {
    subSegment.setTimeMs = timeToMilliseconds(subSegment.time);
  }
}

export function normalizeRouteTimingFields(routeData) {
  if (!routeData) return;

  if (routeData.schemaVersion === undefined) {
    routeData.schemaVersion = 2;
  }

  if (routeData.personalBestMs === undefined) {
    routeData.personalBestMs = timeToMilliseconds(routeData.personalBest);
  }

  if (routeData.sumOfBestMs === undefined) {
    routeData.sumOfBestMs = timeToMilliseconds(routeData.sumOfBest);
  }

  if (!Array.isArray(routeData.segments)) return;

  routeData.segments.forEach((segment) => {
    normalizeSegmentTimingFields(segment);

    if (Array.isArray(segment.subSegments)) {
      segment.subSegments.forEach((subSegment) => {
        normalizeSubSegmentTimingFields(subSegment);
      });
    }
  });
}