import {
    escapeHtml,
    formatDurationDelta,
    getSegmentGoldSplit,
    getSegmentPbSegmentDuration,
    getSegmentPbSplitTime
} from '../utils/utils.js';
import { createSidebarSegmentItem } from '../ui/ui.js';

export class RunSidebarController {
    constructor({
        sidebarList = null,
        documentProvider = globalThis.document,
        getActiveTab = () => 'current-run',
        setActiveTab = () => { },
        getLastCompletedRunReview = () => null,
        onTabChange = () => { }
    } = {}) {
        this.sidebarList = sidebarList;
        this.documentProvider = documentProvider;
        this.getActiveTab = getActiveTab;
        this.setActiveTab = setActiveTab;
        this.getLastCompletedRunReview = getLastCompletedRunReview;
        this.onTabChange = onTabChange;
    }

    setSidebarList(sidebarList) {
        this.sidebarList = sidebarList;
    }

    ensureReviewTabs() {
        if (!this.sidebarList || !this.sidebarList.parentElement) return;

        const sidebar = this.sidebarList.parentElement;
        let tabs = sidebar.querySelector('.sidebar-review-tabs');

        if (!tabs) {
            tabs = this.documentProvider.createElement('div');
            tabs.className = 'sidebar-review-tabs';

            tabs.innerHTML = `
        <button type="button" class="sidebar-review-tabs__button" data-sidebar-review-tab="current-run">
          Current Run
        </button>
        <button type="button" class="sidebar-review-tabs__button" data-sidebar-review-tab="last-run">
          Last Run
        </button>
      `;

            sidebar.insertBefore(tabs, this.sidebarList);

            tabs.addEventListener('click', (event) => {
                const button = event.target.closest('[data-sidebar-review-tab]');
                if (!button) return;

                this.setActiveTab(button.dataset.sidebarReviewTab);
                this.onTabChange();
            });
        }

        tabs.querySelectorAll('[data-sidebar-review-tab]').forEach((button) => {
            const isActive = button.dataset.sidebarReviewTab === this.getActiveTab();

            button.classList.toggle('sidebar-review-tabs__button--active', isActive);

            if (isActive) {
                button.setAttribute('aria-current', 'true');
            } else {
                button.removeAttribute('aria-current');
            }
        });
    }

    populateCurrentRunSidebar({
        routeData,
        sessionSetSegments = new Set(),
        sessionGoldSplits = new Set(),
        getComparisonBestDuration = () => '',
        isSidebarSegmentExpanded = () => false,
        onSegmentClick = async () => { },
        onSegmentDoubleClick = () => { },
        onSegmentContextMenu = () => { },
        onSubsegmentClick = async () => { },
        onSubsegmentContextMenu = () => { },
        setActiveSidebarButton = async () => { }
    } = {}) {
        if (!this.sidebarList || !routeData || !Array.isArray(routeData.segments)) return;

        this.sidebarList.innerHTML = '';

        routeData.segments.forEach((segment) => {
            const segmentWasSet = sessionSetSegments.has(Number(segment.id));
            const comparisonBestDuration = getComparisonBestDuration(segment);

            const sidebarDelta = segmentWasSet
                ? formatDurationDelta(getSegmentPbSegmentDuration(segment), comparisonBestDuration)
                : { text: '--:--:--', state: 'neutral' };

            const isGoldSplit = segmentWasSet && sessionGoldSplits.has(Number(segment.id));

            const items = createSidebarSegmentItem({
                segment,
                segmentWasSet,
                sidebarDelta,
                isExpanded: isSidebarSegmentExpanded(segment.id),
                isGoldSplit,
                onSegmentClick: () => onSegmentClick(segment),
                onSegmentDoubleClick: () => onSegmentDoubleClick(segment),
                onSegmentContextMenu: (event) => onSegmentContextMenu(event, segment),
                onSubsegmentClick: (subSegmentIndex) => onSubsegmentClick(segment, subSegmentIndex),
                onSubsegmentContextMenu: (event, subSegmentIndex) => (
                    onSubsegmentContextMenu(event, segment, subSegmentIndex)
                )
            });

            items.forEach((item) => this.sidebarList.appendChild(item));
        });

        if (Number.isInteger(routeData.currentSegmentId)) {
            setActiveSidebarButton(`segment-${routeData.currentSegmentId}`, false);
        }
    }

    populateLastRunSidebar() {
        if (!this.sidebarList) return;

        this.sidebarList.innerHTML = '';

        const lastCompletedRunReview = this.getLastCompletedRunReview();

        if (
            !lastCompletedRunReview ||
            !lastCompletedRunReview.routeData ||
            !Array.isArray(lastCompletedRunReview.routeData.segments)
        ) {
            const emptyItem = this.documentProvider.createElement('li');
            emptyItem.className = 'sidebar__item sidebar__item--empty';
            emptyItem.textContent = 'No recorded split data for the last run.';
            this.sidebarList.appendChild(emptyItem);
            return;
        }

        lastCompletedRunReview.routeData.segments.forEach((segment) => {
            const item = this.documentProvider.createElement('li');
            item.className = 'sidebar__item sidebar__item--review';

            const row = this.documentProvider.createElement('div');
            row.className = 'sidebar__row';

            const segmentName = this.documentProvider.createElement('span');
            segmentName.className = 'sidebar__btn sidebar__btn--review';
            segmentName.textContent = segment.name;

            const splitTime = this.documentProvider.createElement('span');
            splitTime.className = 'sidebar__split-time';
            splitTime.textContent = getSegmentPbSplitTime(segment) || '--:--:--';

            const segmentDuration = getSegmentPbSegmentDuration(segment);
            const comparisonBestDuration = getSegmentGoldSplit(segment);
            const sidebarDelta = segmentDuration && comparisonBestDuration
                ? formatDurationDelta(segmentDuration, comparisonBestDuration)
                : { text: '--:--:--', state: 'neutral' };

            const comparisonTime = this.documentProvider.createElement('span');
            comparisonTime.className = `sidebar__time sidebar__time--${sidebarDelta.state}`;
            comparisonTime.textContent = sidebarDelta.text;

            row.appendChild(segmentName);
            row.appendChild(splitTime);
            row.appendChild(comparisonTime);

            item.appendChild(row);
            this.sidebarList.appendChild(item);
        });

        if (lastCompletedRunReview.runComplete) {
            const summaryItem = this.documentProvider.createElement('li');
            summaryItem.className = 'sidebar__item sidebar__item--review-summary';

            const { finalTime, previousPB, isNewPB } = lastCompletedRunReview.runComplete;

            summaryItem.innerHTML = `
        <div class="sidebar__review-summary">
          <strong>Last Run Summary</strong>
          <div>Final Time: ${escapeHtml(finalTime || '--:--:--')}</div>
          <div>Previous PB: ${escapeHtml(previousPB || '--:--:--')}</div>
          <div>Result: ${isNewPB ? 'New PB' : 'Gold splits / review'}</div>
        </div>
      `;

            this.sidebarList.appendChild(summaryItem);
        }
    }
}