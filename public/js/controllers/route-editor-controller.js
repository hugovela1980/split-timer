export class RouteEditorController {
    constructor({
        documentProvider = globalThis.document,
        confirmProvider = globalThis.confirm,
        getSegments = () => [],
        getNextSegmentId = () => 1,
        onAddSegment = async () => { },
        onAddSubsegment = async () => { },
        onDeleteSegment = async () => { }
    } = {}) {
        this.documentProvider = documentProvider;
        this.confirmProvider = confirmProvider;
        this.getSegments = getSegments;
        this.getNextSegmentId = getNextSegmentId;
        this.onAddSegment = onAddSegment;
        this.onAddSubsegment = onAddSubsegment;
        this.onDeleteSegment = onDeleteSegment;
    }

    initEditorControls() {
        const addSegmentForm = this.documentProvider.getElementById('add-segment-form');
        const addSegmentInput = this.documentProvider.getElementById('new-segment-name');

        const addSubsegmentForm = this.documentProvider.getElementById('add-subsegment-form');
        const addSubsegmentParent = this.documentProvider.getElementById('subsegment-parent-id');
        const addSubsegmentInput = this.documentProvider.getElementById('new-subsegment-description');
        const addSubsegmentAllowSetTime = this.documentProvider.getElementById('new-subsegment-allow-set-time');

        const deleteSegmentForm = this.documentProvider.getElementById('delete-segment-form');
        const deleteSegmentSelect = this.documentProvider.getElementById('delete-segment-id');

        if (addSegmentForm && addSegmentInput) {
            addSegmentForm.addEventListener('submit', async (event) => {
                event.preventDefault();

                const name = addSegmentInput.value.trim();

                if (!name) return;

                await this.onAddSegment({
                    id: this.getNextSegmentId(),
                    name
                });

                addSegmentInput.value = '';
            });
        }

        if (addSubsegmentForm && addSubsegmentParent && addSubsegmentInput) {
            addSubsegmentForm.addEventListener('submit', async (event) => {
                event.preventDefault();

                const parentId = Number(addSubsegmentParent.value);
                const description = addSubsegmentInput.value.trim();
                const allowSetTime = addSubsegmentAllowSetTime
                    ? addSubsegmentAllowSetTime.checked
                    : false;

                if (!parentId || !description) return;

                await this.onAddSubsegment({
                    parentId,
                    description,
                    allowSetTime
                });

                addSubsegmentInput.value = '';

                if (addSubsegmentAllowSetTime) {
                    addSubsegmentAllowSetTime.checked = false;
                }
            });
        }

        if (deleteSegmentForm && deleteSegmentSelect) {
            deleteSegmentForm.addEventListener('submit', async (event) => {
                event.preventDefault();

                const segmentId = Number(deleteSegmentSelect.value);

                if (!segmentId) return;

                const segmentName = deleteSegmentSelect.options[deleteSegmentSelect.selectedIndex]
                    ?.textContent;

                if (!this.confirmProvider(`Delete segment "${segmentName}"? This cannot be undone.`)) {
                    return;
                }

                await this.onDeleteSegment({ segmentId });
            });
        }
    }

    refreshEditorSegmentOptions() {
        const parentSelect = this.documentProvider.getElementById('subsegment-parent-id');
        const deleteSelect = this.documentProvider.getElementById('delete-segment-id');

        if (!parentSelect || !deleteSelect) return;

        parentSelect.innerHTML = '';
        deleteSelect.innerHTML = '';

        this.getSegments().forEach((segment) => {
            const parentOption = this.documentProvider.createElement('option');
            parentOption.value = String(segment.id);
            parentOption.textContent = `${segment.id}. ${segment.name}`;
            parentSelect.appendChild(parentOption);

            const deleteOption = this.documentProvider.createElement('option');
            deleteOption.value = String(segment.id);
            deleteOption.textContent = `${segment.id}. ${segment.name}`;
            deleteSelect.appendChild(deleteOption);
        });
    }
}