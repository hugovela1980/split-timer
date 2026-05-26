import { tester } from './test-runner/tester.js';

tester.describe('tester mock functions', () => {
    tester.it('tracks mock function calls', () => {
        const mockCallback = tester.fn();

        mockCallback('route-a.json');
        mockCallback('route-b.json');

        tester.expect(mockCallback).toHaveBeenCalled();
        tester.expect(mockCallback).toHaveBeenCalledTimes(2);
    });

    tester.it('can clear mock function calls', () => {
        const mockCallback = tester.fn();

        mockCallback('route-a.json');
        mockCallback.mockClear();

        tester.expect(mockCallback).toHaveBeenCalledTimes(0);
    });

    tester.it('checks whether a mock function was called with specific arguments', () => {
        const mockCallback = tester.fn();

        mockCallback('route-a.json', { force: true });
        mockCallback('route-b.json', { force: false });

        tester.expect(mockCallback).toHaveBeenCalledWith('route-a.json', { force: true });
        tester.expect(mockCallback).toHaveBeenCalledWith('route-b.json', { force: false });
    });
});