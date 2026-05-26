import { tester } from './test-runner/tester.js';

tester.describe('tester sanity check', () => {
  tester.it('passes when values are strictly equal', () => {
    tester.expect(5).toBe(5);
  });

  tester.it('passes when objects are deeply equal', () => {
    tester.expect({ name: 'Segment 1', time: '00:00:05' }).toEqual({
      name: 'Segment 1',
      time: '00:00:05'
    });
  });

  tester.it('passes truthy and falsy checks', () => {
    tester.expect('hello').toBeTruthy();
    tester.expect('').toBeFalsy();
  });
});