import { tester } from './test-runner/tester.js';
import {
  getSegmentPbSplitTime,
  setSegmentPbSplitTime,
  getSegmentPbSegmentDuration,
  setSegmentPbSegmentDuration,
  getSegmentGoldSplit,
  setSegmentGoldSplit,
  normalizeSegmentTimingFields,
  normalizeRouteTimingFields
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

  tester.it('normalizes legacy timing strings into canonical millisecond fields', () => {
    const segment = {
      pbSplitTime: '00:10:00',
      pbSegmentDuration: '00:02:00',
      goldSplit: '00:01:50'
    };

    normalizeSegmentTimingFields(segment);

    tester.expect(segment.pbSplitMs).toBe(600000);
    tester.expect(segment.pbSegmentMs).toBe(120000);
    tester.expect(segment.goldSegmentMs).toBe(110000);
  });

  tester.it('does not overwrite existing canonical millisecond fields during normalization', () => {
    const segment = {
      pbSplitTime: '00:10:00',
      pbSegmentDuration: '00:02:00',
      goldSplit: '00:01:50',
      pbSplitMs: 123,
      pbSegmentMs: 456,
      goldSegmentMs: 789
    };

    normalizeSegmentTimingFields(segment);

    tester.expect(segment.pbSplitMs).toBe(123);
    tester.expect(segment.pbSegmentMs).toBe(456);
    tester.expect(segment.goldSegmentMs).toBe(789);
  });

  tester.it('normalizes route-level timing strings into canonical millisecond fields', () => {
    const routeData = {
      personalBest: '00:10:00',
      sumOfBest: '00:09:30',
      segments: []
    };

    normalizeRouteTimingFields(routeData);

    tester.expect(routeData.personalBestMs).toBe(600000);
    tester.expect(routeData.sumOfBestMs).toBe(570000);
  });

  tester.it('does not overwrite existing route-level millisecond fields during normalization', () => {
    const routeData = {
      personalBest: '00:10:00',
      sumOfBest: '00:09:30',
      personalBestMs: 123,
      sumOfBestMs: 456,
      segments: []
    };

    normalizeRouteTimingFields(routeData);

    tester.expect(routeData.personalBestMs).toBe(123);
    tester.expect(routeData.sumOfBestMs).toBe(456);
  });

  tester.it('normalizes subsegment time into canonical setTimeMs field', () => {
    const routeData = {
      segments: [
        {
          id: 1,
          name: 'Get Silk Spear',
          subSegments: [
            {
              description: 'Enter room',
              time: '00:01:15',
              allowSetTime: true
            }
          ]
        }
      ]
    };

    normalizeRouteTimingFields(routeData);

    const subSegment = routeData.segments[0].subSegments[0];

    tester.expect(subSegment.setTimeMs).toBe(75000);
  });

  tester.it('does not overwrite existing subsegment setTimeMs during normalization', () => {
    const routeData = {
      segments: [
        {
          id: 1,
          name: 'Get Silk Spear',
          subSegments: [
            {
              description: 'Enter room',
              time: '00:01:15',
              allowSetTime: true,
              setTimeMs: 123
            }
          ]
        }
      ]
    };

    normalizeRouteTimingFields(routeData);

    const subSegment = routeData.segments[0].subSegments[0];

    tester.expect(subSegment.setTimeMs).toBe(123);
  });


  tester.it('adds schemaVersion when route data is missing one', () => {
    const routeData = {
      name: 'Act 1 100%',
      segments: []
    };

    normalizeRouteTimingFields(routeData);

    tester.expect(routeData.schemaVersion).toBe(2);
  });

  tester.it('does not overwrite an existing schemaVersion during normalization', () => {
    const routeData = {
      schemaVersion: 1,
      name: 'Legacy Route',
      segments: []
    };

    normalizeRouteTimingFields(routeData);

    tester.expect(routeData.schemaVersion).toBe(1);
  });
});