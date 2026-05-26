const testSuites = [];
let currentSuite = null;

function formatValue(value) {
  return typeof value === 'string'
    ? `"${value}"`
    : JSON.stringify(value, null, 2);
}

function deepEqual(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function createAssertionError(message) {
  return new Error(message);
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw createAssertionError(
          `Expected ${formatValue(actual)} to be ${formatValue(expected)}`
        );
      }
    },

    toEqual(expected) {
      if (!deepEqual(actual, expected)) {
        throw createAssertionError(
          `Expected ${formatValue(actual)} to equal ${formatValue(expected)}`
        );
      }
    },

    toBeTruthy() {
      if (!actual) {
        throw createAssertionError(
          `Expected ${formatValue(actual)} to be truthy`
        );
      }
    },

    toBeFalsy() {
      if (actual) {
        throw createAssertionError(
          `Expected ${formatValue(actual)} to be falsy`
        );
      }
    },

    toHaveBeenCalled() {
          if (!actual || !Array.isArray(actual.calls)) {
              throw createAssertionError('Expected value to be a mock function.');
          }

          if (actual.calls.length === 0) {
              throw createAssertionError('Expected mock function to have been called.');
          }
      },

      toHaveBeenCalledTimes(expectedCallCount) {
          if (!actual || !Array.isArray(actual.calls)) {
              throw createAssertionError('Expected value to be a mock function.');
          }

          if (actual.calls.length !== expectedCallCount) {
              throw createAssertionError(
                  `Expected mock function to have been called ${expectedCallCount} times, but it was called ${actual.calls.length} times.`
              );
          }
      }
  };
}

function describe(name, callback) {
  const suite = {
    name,
    tests: [],
    beforeEachCallbacks: []
  };

  testSuites.push(suite);

  const previousSuite = currentSuite;
  currentSuite = suite;

  callback();

  currentSuite = previousSuite;
}

function beforeEach(callback) {
  if (!currentSuite) {
    throw new Error('tester.beforeEach() must be inside tester.describe().');
  }

  currentSuite.beforeEachCallbacks.push(callback);
}

function it(name, callback) {
  if (!currentSuite) {
    throw new Error(`Test "${name}" must be inside tester.describe().`);
  }

  currentSuite.tests.push({
    name,
    callback
  });
}

const test = it;

function fn(implementation = () => undefined) {
    const mockFunction = (...args) => {
        mockFunction.calls.push(args);
        return implementation(...args);
    };

    mockFunction.calls = [];

    mockFunction.mockClear = () => {
        mockFunction.calls = [];
    };

    return mockFunction;
}

async function run() {
  let total = 0;
  let passed = 0;
  let failed = 0;

  console.log('\nRunning tests...\n');

  for (const suite of testSuites) {
    console.log(`\n${suite.name}`);

    for (const testCase of suite.tests) {
      total += 1;

        try {
            for (const beforeEachCallback of suite.beforeEachCallbacks) {
                await beforeEachCallback();
            }

            await testCase.callback();
            passed += 1;
            console.log(`  ✓ ${testCase.name}`);
        } catch (error) {
        failed += 1;
        console.log(`  ✗ ${testCase.name}`);
        console.log(`    ${error.message}`);
      }
    }
  }

  console.log('\nTest Summary');
  console.log(`  Total:  ${total}`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }

  return {
    total,
    passed,
    failed
  };
}

export const tester = {
  describe,
  it,
  test,
  beforeEach,
  expect,
  fn,
  run
};