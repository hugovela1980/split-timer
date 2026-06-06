import { tester } from './test-runner/tester.js';
import { RouteEditorController } from '../public/js/controllers/route-editor-controller.js';

function createFakeElement({
    value = '',
    checked = false,
    hidden = false,
    queryResults = {}
} = {}) {
    const listeners = new Map();

    return {
        value,
        checked,
        hidden,
        innerHTML: '',
        children: [],
        options: [],
        selectedIndex: 0,
        style: {},

        addEventListener(type, handler) {
            listeners.set(type, handler);
        },

        dispatchEvent(event) {
            const handler = listeners.get(event.type);
            if (handler) return handler(event);
            return undefined;
        },

        appendChild(child) {
            this.children.push(child);
            this.options.push(child);
        },

        contains(target) {
            return target === this;
        },

        querySelector(selector) {
            return queryResults[selector] || null;
        }
    };
}

function createFakeDocument(elements = {}) {
    const listeners = new Map();

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
        },

        addEventListener(type, handler) {
            listeners.set(type, handler);
        },

        dispatchEvent(event) {
            const handler = listeners.get(event.type);
            if (handler) return handler(event);
            return undefined;
        }
    };
}

tester.describe('RouteEditorController', () => {
    tester.it('submitting Add Segment calls onAddSegment with the next ID and trimmed name', async () => {
        const addSegmentForm = createFakeElement();
        const addSegmentInput = createFakeElement({ value: '  New Segment  ' });
        const onAddSegment = tester.fn(async () => { });

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

    tester.it('submitting Delete Segment calls onDeleteSegment only after confirmation', async () => {
        const deleteSegmentForm = createFakeElement();

        const deleteSegmentSelect = createFakeElement({ value: '3' });
        deleteSegmentSelect.selectedIndex = 0;
        deleteSegmentSelect.options = [
            {
                textContent: '3. Segment Three'
            }
        ];

        const confirmProvider = tester.fn(() => true);
        const onDeleteSegment = tester.fn(async () => { });

        const documentProvider = createFakeDocument({
            'delete-segment-form': deleteSegmentForm,
            'delete-segment-id': deleteSegmentSelect
        });

        const routeEditorController = new RouteEditorController({
            documentProvider,
            confirmProvider,
            onDeleteSegment
        });

        routeEditorController.initEditorControls();

        await deleteSegmentForm.dispatchEvent({
            type: 'submit',
            preventDefault: tester.fn()
        });

        tester.expect(confirmProvider).toHaveBeenCalledTimes(1);
        tester.expect(confirmProvider).toHaveBeenCalledWith(
            'Delete segment "3. Segment Three"? This cannot be undone.'
        );

        tester.expect(onDeleteSegment).toHaveBeenCalledTimes(1);
        tester.expect(onDeleteSegment).toHaveBeenCalledWith({
            segmentId: 3
        });
    });

    tester.it('does not delete a segment when confirmation is canceled', async () => {
        const deleteSegmentForm = createFakeElement();

        const deleteSegmentSelect = createFakeElement({ value: '3' });
        deleteSegmentSelect.selectedIndex = 0;
        deleteSegmentSelect.options = [
            {
                textContent: '3. Segment Three'
            }
        ];

        const confirmProvider = tester.fn(() => false);
        const onDeleteSegment = tester.fn(async () => { });

        const documentProvider = createFakeDocument({
            'delete-segment-form': deleteSegmentForm,
            'delete-segment-id': deleteSegmentSelect
        });

        const routeEditorController = new RouteEditorController({
            documentProvider,
            confirmProvider,
            onDeleteSegment
        });

        routeEditorController.initEditorControls();

        await deleteSegmentForm.dispatchEvent({
            type: 'submit',
            preventDefault: tester.fn()
        });

        tester.expect(confirmProvider).toHaveBeenCalledTimes(1);
        tester.expect(onDeleteSegment).toHaveBeenCalledTimes(0);
    });

    tester.it('refreshing editor segment options populates parent and delete dropdowns', () => {
        const parentSelect = createFakeElement();
        const deleteSelect = createFakeElement();

        const documentProvider = createFakeDocument({
            'subsegment-parent-id': parentSelect,
            'delete-segment-id': deleteSelect
        });

        const routeEditorController = new RouteEditorController({
            documentProvider,
            getSegments: () => [
                { id: 1, name: 'Segment One' },
                { id: 2, name: 'Segment Two' }
            ]
        });

        routeEditorController.refreshEditorSegmentOptions();

        tester.expect(parentSelect.children.length).toBe(2);
        tester.expect(deleteSelect.children.length).toBe(2);

        tester.expect(parentSelect.children[0].value).toBe('1');
        tester.expect(parentSelect.children[0].textContent).toBe('1. Segment One');

        tester.expect(parentSelect.children[1].value).toBe('2');
        tester.expect(parentSelect.children[1].textContent).toBe('2. Segment Two');

        tester.expect(deleteSelect.children[0].value).toBe('1');
        tester.expect(deleteSelect.children[0].textContent).toBe('1. Segment One');

        tester.expect(deleteSelect.children[1].value).toBe('2');
        tester.expect(deleteSelect.children[1].textContent).toBe('2. Segment Two');
    });

    tester.it('opens the sidebar context menu with the selected target', () => {
        const editButton = createFakeElement();
        const clearSplitButton = createFakeElement({ hidden: true });
        const deleteButton = createFakeElement();

        const sidebarContextMenu = createFakeElement({
            hidden: true,
            queryResults: {
                '[data-context-action="rename"]': editButton,
                '[data-context-action="clear-split"]': clearSplitButton,
                '[data-context-action="delete"]': deleteButton
            }
        });

        const setSidebarContextTarget = tester.fn();

        const routeEditorController = new RouteEditorController({
            sidebarContextMenu,
            setSidebarContextTarget
        });

        const event = {
            preventDefault: tester.fn(),
            pageX: 120,
            pageY: 240
        };

        const target = {
            type: 'segment',
            segmentId: 2
        };

        routeEditorController.openSidebarContextMenu(event, target);

        tester.expect(event.preventDefault).toHaveBeenCalledTimes(1);
        tester.expect(setSidebarContextTarget).toHaveBeenCalledWith(target);

        tester.expect(sidebarContextMenu.style.left).toBe('120px');
        tester.expect(sidebarContextMenu.style.top).toBe('240px');
        tester.expect(sidebarContextMenu.hidden).toBe(false);

        tester.expect(editButton.textContent).toBe('Edit Segment Name');
        tester.expect(clearSplitButton.hidden).toBe(false);
        tester.expect(deleteButton.textContent).toBe('Delete Segment');
    });

    tester.it('closes the sidebar context menu', () => {
        const sidebarContextMenu = createFakeElement({ hidden: false });

        const routeEditorController = new RouteEditorController({
            sidebarContextMenu
        });

        routeEditorController.closeSidebarContextMenu();

        tester.expect(sidebarContextMenu.hidden).toBe(true);
    });

    tester.it('routes sidebar context menu actions to callbacks with the current target', async () => {
        const sidebarContextMenu = createFakeElement();
        const documentProvider = createFakeDocument();

        const currentTarget = {
            type: 'segment',
            segmentId: 2
        };

        const getSidebarContextTarget = tester.fn(() => currentTarget);
        const onRenameContextTarget = tester.fn(async () => { });
        const onDeleteContextTarget = tester.fn(async () => { });
        const onClearSplitContextTarget = tester.fn(async () => { });

        const routeEditorController = new RouteEditorController({
            documentProvider,
            sidebarContextMenu,
            getSidebarContextTarget,
            onRenameContextTarget,
            onDeleteContextTarget,
            onClearSplitContextTarget
        });

        routeEditorController.initSidebarContextMenu();

        function createContextMenuClickEvent(action) {
            return {
                type: 'click',
                stopPropagation: tester.fn(),
                target: {
                    closest(selector) {
                        return selector === '[data-context-action]'
                            ? { dataset: { contextAction: action } }
                            : null;
                    }
                }
            };
        }

        await sidebarContextMenu.dispatchEvent(createContextMenuClickEvent('rename'));
        await sidebarContextMenu.dispatchEvent(createContextMenuClickEvent('delete'));
        await sidebarContextMenu.dispatchEvent(createContextMenuClickEvent('clear-split'));

        tester.expect(onRenameContextTarget).toHaveBeenCalledWith(currentTarget);
        tester.expect(onDeleteContextTarget).toHaveBeenCalledWith(currentTarget);
        tester.expect(onClearSplitContextTarget).toHaveBeenCalledWith(currentTarget);
    });
});