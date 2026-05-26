import './test-runner.test.js';
import './timing-helpers.test.js';
import './route-loader-timing.test.js';
import './run-save-behavior.test.js';
import { tester } from './test-runner/tester.js';

await tester.run();