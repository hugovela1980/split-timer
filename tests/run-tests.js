import './test-runner.test.js';
import './timing-helpers.test.js';
import './route-data-service.test.js';
import './route-loader-timing.test.js';
import './route-loader-schema-normalization.test.js';
import './run-save-behavior.test.js';
import './route-file-write-behavior.test.js';

import { tester } from './test-runner/tester.js';

await tester.run();