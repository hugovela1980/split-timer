import { tester } from './test-runner/tester.js';
import { StartScreenController } from '../public/js/controllers/start-screen-controller.js';

class FakeCustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
}

function createButton() {
  return {
    addEventListener: tester.fn((eventName, handler) => {
      if (eventName === 'click') {
        this.clickHandler = handler;
      }
    })
  };
}

function createStartRouteButton() {
  const button = {};

  button.addEventListener = tester.fn((eventName, handler) => {
    if (eventName === 'click') {
      button.clickHandler = handler;
    }
  });

  return button;
}

function createStartRouteSelector(value = '') {
  const selector = {
    value,
    focus: tester.fn()
  };

  selector.addEventListener = tester.fn((eventName, handler) => {
    if (eventName === 'keydown') {
      selector.keydownHandler = handler;
    }
  });

  return selector;
}

tester.describe('StartScreenController', () => {
  tester.it('opens the selected route when route switching is allowed', async () => {
    const startRouteButton = createStartRouteButton();
    const startRouteSelector = createStartRouteSelector('act-1-100-percent.json');
    const startScreen = { hidden: false };
    const appShell = { hidden: true };

    const populateStartRouteSelector = tester.fn();
    const confirmRouteSwitch = tester.fn(() => true);
    const switchRoute = tester.fn(async () => {});
    const dispatchEvent = tester.fn();

    const controller = new StartScreenController({
      startRouteButton,
      startRouteSelector,
      startScreen,
      appShell,
      populateStartRouteSelector,
      confirmRouteSwitch,
      switchRoute,
      dispatchEvent,
      CustomEventClass: FakeCustomEvent
    });

    controller.init();

    await startRouteButton.clickHandler();

    tester.expect(populateStartRouteSelector).toHaveBeenCalledTimes(1);
    tester.expect(startRouteSelector.focus).toHaveBeenCalledTimes(1);
    tester.expect(confirmRouteSwitch).toHaveBeenCalledTimes(1);
    tester.expect(switchRoute).toHaveBeenCalledWith('act-1-100-percent.json');
    tester.expect(startScreen.hidden).toBe(true);
    tester.expect(appShell.hidden).toBe(false);
    tester.expect(dispatchEvent).toHaveBeenCalledTimes(1);
  });

  tester.it('does not switch routes when route switching is canceled', async () => {
    const startRouteButton = createStartRouteButton();
    const startRouteSelector = createStartRouteSelector('act-2-100-percent.json');
    const startScreen = { hidden: false };
    const appShell = { hidden: true };

    const confirmRouteSwitch = tester.fn(() => false);
    const switchRoute = tester.fn(async () => {});
    const dispatchEvent = tester.fn();

    const controller = new StartScreenController({
      startRouteButton,
      startRouteSelector,
      startScreen,
      appShell,
      confirmRouteSwitch,
      switchRoute,
      dispatchEvent,
      CustomEventClass: FakeCustomEvent
    });

    controller.init();

    await startRouteButton.clickHandler();

    tester.expect(confirmRouteSwitch).toHaveBeenCalledTimes(1);
    tester.expect(switchRoute).toHaveBeenCalledTimes(0);
    tester.expect(startScreen.hidden).toBe(false);
    tester.expect(appShell.hidden).toBe(true);
    tester.expect(dispatchEvent).toHaveBeenCalledTimes(0);
  });

  tester.it('opens the selected route when Enter is pressed in the route selector', async () => {
    const startRouteButton = createStartRouteButton();
    const startRouteSelector = createStartRouteSelector('act-2-100-percent.json');
    const startScreen = { hidden: false };
    const appShell = { hidden: true };

    const preventDefault = tester.fn();
    const confirmRouteSwitch = tester.fn(() => true);
    const switchRoute = tester.fn(async () => {});
    const dispatchEvent = tester.fn();

    const controller = new StartScreenController({
      startRouteButton,
      startRouteSelector,
      startScreen,
      appShell,
      confirmRouteSwitch,
      switchRoute,
      dispatchEvent,
      CustomEventClass: FakeCustomEvent
    });

    controller.init();

    await startRouteSelector.keydownHandler({
      key: 'Enter',
      preventDefault
    });

    tester.expect(preventDefault).toHaveBeenCalledTimes(1);
    tester.expect(confirmRouteSwitch).toHaveBeenCalledTimes(1);
    tester.expect(switchRoute).toHaveBeenCalledWith('act-2-100-percent.json');
    tester.expect(startScreen.hidden).toBe(true);
    tester.expect(appShell.hidden).toBe(false);
    tester.expect(dispatchEvent).toHaveBeenCalledTimes(1);
  });

  tester.it('shows the main app after creating a route from the start screen', () => {
    const startRouteButton = createStartRouteButton();
    const startRouteSelector = createStartRouteSelector('act-1-100-percent.json');
    const startCreateRouteButton = createStartRouteButton();
    const startScreen = { hidden: false };
    const appShell = { hidden: true };

    let onRouteCreated;

    const showCreateRouteModal = tester.fn((options) => {
      onRouteCreated = options.onRouteCreated;
    });

    const controller = new StartScreenController({
      startRouteButton,
      startRouteSelector,
      startCreateRouteButton,
      startScreen,
      appShell,
      showCreateRouteModal,
      CustomEventClass: FakeCustomEvent
    });

    controller.init();

    startCreateRouteButton.clickHandler();
    onRouteCreated();

    tester.expect(showCreateRouteModal).toHaveBeenCalledTimes(1);
    tester.expect(startScreen.hidden).toBe(true);
    tester.expect(appShell.hidden).toBe(false);
  });
});