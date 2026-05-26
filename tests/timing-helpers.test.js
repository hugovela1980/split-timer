import { tester } from './test-runner/tester.js';
import {
  getSegmentPbSplitTime,
  setSegmentPbSplitTime,
  getSegmentPbSegmentDuration,
  setSegmentPbSegmentDuration,
  getSegmentGoldSplit,
  setSegmentGoldSplit,
  normalizeSegmentTimingFields
} from '../public/js/utils/utils.js';

tester.describe('timing field compatibility helpers', () => {
  tester.it('reads pbSplitTime before falling back to time', () => {
    const segment = {
      time: '00:00:05',
      pbSplitTime: '00:00:04'
    };

    tester.expect(getSegmentPbSplitTime(segment)).toBe('00:00:04');
  });

  tester.it('falls back to time when pbSplitTime is missing', () => {
    const segment = {
      time: '00:00:05'
    };

    tester.expect(getSegmentPbSplitTime(segment)).toBe('00:00:05');
  });

  tester.it('sets pbSplitTime and legacy time together', () => {
    const segment = {};

    setSegmentPbSplitTime(segment, '00:00:07');

    tester.expect(segment.pbSplitTime).toBe('00:00:07');
    tester.expect(segment.time).toBe('00:00:07');
  });

  tester.it('sets pbSegmentDuration and legacy duration together', () => {
    const segment = {};

    setSegmentPbSegmentDuration(segment, '00:00:03');

    tester.expect(segment.pbSegmentDuration).toBe('00:00:03');
    tester.expect(segment.duration).toBe('00:00:03');
  });

  tester.it('sets goldSplit and legacy bestTime together', () => {
    const segment = {};

    setSegmentGoldSplit(segment, '00:00:04');

    tester.expect(segment.goldSplit).toBe('00:00:04');
    tester.expect(segment.bestTime).toBe('00:00:04');
  });

  tester.it('normalizes missing new fields from legacy fields', () => {
    const segment = {
      time: '00:00:05',
      duration: '00:00:05',
      bestTime: '00:00:04'
    };

    normalizeSegmentTimingFields(segment);

    tester.expect(segment.pbSplitTime).toBe('00:00:05');
    tester.expect(segment.pbSegmentDuration).toBe('00:00:05');
    tester.expect(segment.goldSplit).toBe('00:00:04');
  });

  tester.it('does not overwrite existing new fields during normalization', () => {
    const segment = {
      time: '00:00:05',
      duration: '00:00:05',
      bestTime: '00:00:04',
      pbSplitTime: '00:00:06',
      pbSegmentDuration: '00:00:06',
      goldSplit: '00:00:03'
    };

    normalizeSegmentTimingFields(segment);

    tester.expect(segment.pbSplitTime).toBe('00:00:06');
    tester.expect(segment.pbSegmentDuration).toBe('00:00:06');
    tester.expect(segment.goldSplit).toBe('00:00:03');
  });
});