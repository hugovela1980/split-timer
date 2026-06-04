import './test-runner.test.js';
import './timing-helpers.test.js';
import './route-data-service.test.js';
import './route-selector-service.test.js';
import './route-storage-service.test.js';
import './run-save-service.test.js';
import './start-screen-controller.test.js';
import './split-timer-controller-timing.test.js';
import './split-timer-controller-schema-normalization.test.js';
import './run-save-behavior.test.js';
import './route-file-write-behavior.test.js';

import { tester } from './test-runner/tester.js';

await tester.run();