import { tester } from './test-runner/tester.js';
import { RouteEditorController } from '../public/js/controllers/route-editor-controller.js';

function createFakeElement({ value = '', checked = false } = {}) {
  const listeners = new Map();

  return {
    value,
    checked,
    innerHTML: '',
    children: [],
    options: [],
    selectedIndex: 0,

    addEventListener(type, handler) {
      listeners.set(type, handler);
    },

    dispatchEvent(event) {
      const handler = listeners.get(event.type);
      if (handler) handler(event);
    },

    appendChild(child) {
      this.children.push(child);
      this.options.push(child);
    }
  };
}

function createFakeDocument(elements = {}) {
  return {
    getElementById(id) {
      return elements[id] || null;
    },

    createElement(tagName) {
      return {
        tagName,
        value: '',
        textContent: ''
      };
    }
  };
}

tester.describe('RouteEditorController', () => {
  tester.it('submitting Add Segment calls onAddSegment with the next ID and trimmed name', async () => {
    const addSegmentForm = createFakeElement();
    const addSegmentInput = createFakeElement({ value: '  New Segment  ' });
    const onAddSegment = tester.fn(async () => {});

    const documentProvider = createFakeDocument({
      'add-segment-form': addSegmentForm,
      'new-segment-name': addSegmentInput
    });

    const routeEditorController = new RouteEditorController({
      documentProvider,
      getNextSegmentId: () => 7,
      onAddSegment
    });

    routeEditorController.initEditorControls();

    await addSegmentForm.dispatchEvent({
      type: 'submit',
      preventDefault: tester.fn()
    });

    tester.expect(onAddSegment).toHaveBeenCalledTimes(1);
    tester.expect(onAddSegment).toHaveBeenCalledWith({
      id: 7,
      name: 'New Segment'
    });
    tester.expect(addSegmentInput.value).toBe('');
  });

    tester.it('submitting Add Subsegment calls onAddSubsegment with parent ID, description, and allowSetTime', async () => {
        const addSubsegmentForm = createFakeElement();
        const addSubsegmentParent = createFakeElement({ value: '2' });
        const addSubsegmentInput = createFakeElement({ value: '  New Subsegment  ' });
        const addSubsegmentAllowSetTime = createFakeElement({ checked: true });

        const onAddSubsegment = tester.fn(async () => { });

        const documentProvider = createFakeDocument({
            'add-subsegment-form': addSubsegmentForm,
            'subsegment-parent-id': addSubsegmentParent,
            'new-subsegment-description': addSubsegmentInput,
            'new-subsegment-allow-set-time': addSubsegmentAllowSetTime
        });

        const routeEditorController = new RouteEditorController({
            documentProvider,
            onAddSubsegment
        });

        routeEditorController.initEditorControls();

        await addSubsegmentForm.dispatchEvent({
            type: 'submit',
            preventDefault: tester.fn()
        });

        tester.expect(onAddSubsegment).toHaveBeenCalledTimes(1);
        tester.expect(onAddSubsegment).toHaveBeenCalledWith({
            parentId: 2,
            description: 'New Subsegment',
            allowSetTime: true
        });

        tester.expect(addSubsegmentInput.value).toBe('');
        tester.expect(addSubsegmentAllowSetTime.checked).toBe(false);
    });
});