// UI helper functions for building route and sub-segment DOM
import { escapeHtml, getSegmentPbSplitTime } from '../utils/utils.js';

export function createRouteSegmentElement(segmentData) {
  const segmentDiv = document.createElement('div');
  segmentDiv.className = 'segment';
  segmentDiv.id = `segment-${segmentData.id}`;

  const titleDiv = document.createElement('div');
  titleDiv.className = 'segment__title';

  const nameH2 = document.createElement('h2');
  nameH2.className = 'segment__title--name';
  nameH2.textContent = segmentData.name;

  const titleInfoDiv = document.createElement('div');
  titleInfoDiv.className = 'segment__title--info';

  const timeP = document.createElement('p');
  timeP.className = 'segment__title--time';
  timeP.textContent = getSegmentPbSplitTime(segmentData) || '';

  const setButton = document.createElement('button');
  setButton.className = 'segment__title--set btn-blue';
  setButton.textContent = 'Set Time';

  titleInfoDiv.appendChild(timeP);
  titleInfoDiv.appendChild(setButton);
  titleDiv.appendChild(nameH2);
  titleDiv.appendChild(titleInfoDiv);

  const subSegmentsDiv = document.createElement('div');
  subSegmentsDiv.className = 'sub-segments';

  segmentData.subSegments.forEach((subSegment, subSegmentIndex) => {
    const subSegmentElement = createRouteSubSegmentElement(subSegment, segmentData.id, subSegmentIndex);
    subSegmentsDiv.appendChild(subSegmentElement);
  });

  segmentDiv.appendChild(titleDiv);
  segmentDiv.appendChild(subSegmentsDiv);

  return segmentDiv;
}

export function createRouteSubSegmentElement(subSegmentData, segmentId, subSegmentIndex) {
  const subSegmentDiv = document.createElement('div');
  subSegmentDiv.className = 'sub-segment';
  subSegmentDiv.id = `segment-${segmentId}-subsegment-${subSegmentIndex}`;

  const taskDiv = document.createElement('div');
  taskDiv.className = 'sub-segment__task';

  const descriptionP = document.createElement('p');
  descriptionP.className = 'sub-segment__description';
  descriptionP.textContent = subSegmentData.description;

  taskDiv.appendChild(descriptionP);

  const timeDiv = document.createElement('div');
  timeDiv.className = 'sub-segment__time';

  const timeP = document.createElement('p');
  timeP.className = 'sub-segment__time-value';
  timeP.textContent = subSegmentData.time || '';

  const setButton = document.createElement('button');
  setButton.className = 'sub-segment__set btn-blue';
  setButton.textContent = 'Set Time';

  timeDiv.appendChild(timeP);
  if (subSegmentData.allowSetTime === true) {
    timeDiv.appendChild(setButton);
  }

  subSegmentDiv.appendChild(taskDiv);
  subSegmentDiv.appendChild(timeDiv);

  return subSegmentDiv;
}

export function createSidebarSubsegmentItem({ segmentId, subSegment, subSegmentIndex, onClick, onContextMenu }) {
  const subSegmentItem = document.createElement('li');
  subSegmentItem.className = 'sidebar__item sidebar__item--subsegment';

  const subSegmentRow = document.createElement('div');
  subSegmentRow.className = 'sidebar__row';

  const subSegmentButton = document.createElement('button');
  subSegmentButton.className = 'sidebar__btn sidebar__btn--subsegment';
  subSegmentButton.textContent = subSegment.description;
  subSegmentButton.dataset.segmentId = `segment-${segmentId}`;

  const subSegmentTime = document.createElement('span');
  subSegmentTime.className = 'sidebar__split-time sidebar__split-time--subsegment';
  subSegmentTime.textContent = subSegment.time || '--:--:--';

  const subSegmentPlaceholder = document.createElement('span');
  subSegmentPlaceholder.className = 'sidebar__time sidebar__time--subsegment';
  subSegmentPlaceholder.textContent = ' ';

  subSegmentButton.addEventListener('click', onClick);
  subSegmentRow.addEventListener('contextmenu', onContextMenu);

  subSegmentRow.appendChild(subSegmentButton);
  subSegmentRow.appendChild(subSegmentTime);
  subSegmentRow.appendChild(subSegmentPlaceholder);
  subSegmentItem.appendChild(subSegmentRow);

  return subSegmentItem;
}

export function createSidebarSegmentItem({
  segment,
  segmentWasSet,
  sidebarDelta,
  isExpanded,
  isGoldSplit,
  onSegmentClick,
  onSegmentDoubleClick,
  onSegmentContextMenu,
  onSubsegmentClick,
  onSubsegmentContextMenu
}) {
  const li = document.createElement('li');
  li.className = 'sidebar__item';

  const row = document.createElement('div');
  row.className = 'sidebar__row';

  const btn = document.createElement('button');
  btn.className = 'sidebar__btn';
  btn.textContent = segment.name;
  btn.dataset.segmentId = `segment-${segment.id}`;

  const splitTime = document.createElement('span');
  splitTime.className = 'sidebar__split-time';
  splitTime.textContent = segmentWasSet ? ((getSegmentPbSplitTime(segment)) || '--:--:--') : '--:--:--';

  const time = document.createElement('span');
  time.className = 'sidebar__time';
  time.textContent = sidebarDelta.text;

  if (segmentWasSet) {
    time.classList.add(`sidebar__time--${sidebarDelta.state}`);
  }

  if (segmentWasSet && isGoldSplit) {
    time.classList.add('sidebar__time--gold');
  }

  btn.addEventListener('click', onSegmentClick);
  btn.addEventListener('dblclick', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onSegmentDoubleClick();
  });
  btn.classList.toggle('sidebar__btn--expanded', isExpanded);

  row.addEventListener('contextmenu', onSegmentContextMenu);

  row.appendChild(btn);
  row.appendChild(splitTime);
  row.appendChild(time);
  li.appendChild(row);

  const items = [li];

  if (isExpanded && Array.isArray(segment.subSegments)) {
    segment.subSegments.forEach((subSegment, subSegmentIndex) => {
      items.push(createSidebarSubsegmentItem({
        segmentId: segment.id,
        subSegment,
        subSegmentIndex,
        onClick: () => onSubsegmentClick(subSegmentIndex),
        onContextMenu: (event) => onSubsegmentContextMenu(event, subSegmentIndex)
      }));
    });
  }

  return items;
}

export function createRunCompleteComparisonsHtml({ finalTime, isNewPB, previousPersonalBest, runDelta, sumOfBest }) {
  const primaryActionText = isNewPB ? 'Save New PB' : 'Save Gold Splits';

  return `
    <h3 class="comparisons__title">Run Complete</h3>
    <div class="comparisons__cards">
      <section class="comparisons__card comparisons__card--finish ${isNewPB ? 'comparisons__card--pb' : ''}">
        ${isNewPB ? '<p class="comparisons__pb-banner">New Personal Best!</p>' : ''}
        <div class="comparisons__row">
          <span class="comparisons__label">Final Time</span>
          <span class="comparisons__value ${isNewPB ? 'comparisons__value--gold' : ''}">${escapeHtml(finalTime)}</span>
        </div>
        <div class="comparisons__row">
          <span class="comparisons__label">Previous PB</span>
          <span class="comparisons__value">${escapeHtml(previousPersonalBest)}</span>
        </div>
        <div class="comparisons__row">
          <span class="comparisons__label">Vs PB</span>
          <span class="comparisons__value comparisons__delta comparisons__delta--${runDelta.state}">
            <span class="comparisons__delta-icon comparisons__delta-icon--${runDelta.state}" aria-hidden="true"></span>
            <span>${escapeHtml(runDelta.text)}</span>
          </span>
        </div>
        <div class="comparisons__row">
          <span class="comparisons__label">Sum of Best</span>
          <span class="comparisons__value">${escapeHtml(sumOfBest)}</span>
        </div>
        <div class="comparisons__actions">
          <button class="comparisons__end-run-btn btn-blue" type="button">${escapeHtml(primaryActionText)}</button>
          <button class="comparisons__delete-run-btn btn-red" type="button">Delete Run Data</button>
        </div>
      </section>
    </div>
  `;
}

export function createComparisonsHtml({
  segmentLabel,
  currentDuration,
  currentStatus,
  bestDuration,
  delta,
  currentRunTime,
  personalBest,
  runDelta,
  sumOfBest,
  isGoldSplit,
  isStopwatchRunning,
  hasRunStarted
}) {
  return `
    <h3 class="comparisons__title">Comparisons</h3>
    <div class="comparisons__cards">
      <section class="comparisons__card">
        <div class="comparisons__card-top">
          <h4 class="comparisons__card-title">Segment Comparison</h4>
          <div class="comparisons__status comparisons__status--${currentStatus.state}">${escapeHtml(currentStatus.text)}</div>
        </div>
        <div class="comparisons__row">
          <span class="comparisons__label">Current Segment</span>
          <span class="comparisons__value comparisons__value--segment">${escapeHtml(segmentLabel)}</span>
        </div>
        <div class="comparisons__row">
          <span class="comparisons__label">Current Split Time</span>
          <span class="comparisons__value">${escapeHtml(currentDuration)}</span>
        </div>
        <div class="comparisons__row">
          <span class="comparisons__label">Best Split Time</span>
          <span class="comparisons__value ${isGoldSplit ? 'comparisons__value--gold' : ''}">${escapeHtml(bestDuration)}</span>
        </div>
        <div class="comparisons__row">
          <span class="comparisons__label">Vs Best</span>
          <span class="comparisons__value comparisons__delta comparisons__delta--${delta.state}">
            <span class="comparisons__delta-icon comparisons__delta-icon--${delta.state}" aria-hidden="true"></span>
            <span>${escapeHtml(delta.text)}</span>
          </span>
        </div>
        ${isGoldSplit ? '<p class="comparisons__gold-note">Gold Split! New best split time.</p>' : ''}
      </section>

      <section class="comparisons__card">
        <div class="comparisons__card-top">
          <h4 class="comparisons__card-title">Run Comparison</h4>
          <div class="comparisons__status comparisons__status--${currentStatus.state}">${escapeHtml(currentStatus.text)}</div>
        </div>
        <div class="comparisons__row">
          <span class="comparisons__label">Current Run</span>
          <span class="comparisons__value">${escapeHtml(hasRunStarted ? currentRunTime : '--:--:--')}</span>
        </div>
        <div class="comparisons__row">
          <span class="comparisons__label">Personal Best</span>
          <span class="comparisons__value">${escapeHtml(personalBest)}</span>
        </div>
        <div class="comparisons__row">
          <span class="comparisons__label">Vs PB</span>
          <span class="comparisons__value comparisons__delta comparisons__delta--${runDelta.state}">
            <span class="comparisons__delta-icon comparisons__delta-icon--${runDelta.state}" aria-hidden="true"></span>
            <span>${escapeHtml(runDelta.text)}</span>
          </span>
        </div>
        <div class="comparisons__row">
          <span class="comparisons__label">Sum of Best</span>
          <span class="comparisons__value">${escapeHtml(sumOfBest)}</span>
        </div>
        ${hasRunStarted ? '<button class="comparisons__reset-run-btn btn-blue" type="button">Reset Run</button>' : ''}
      </section>
    </div>
  `;
}
