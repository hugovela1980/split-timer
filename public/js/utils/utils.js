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
