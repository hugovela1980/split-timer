export function createTimerColorPaceRoute() {
    return {
        name: 'Test Timer Color Pace',
        personalBest: '00:00:15',
        sumOfBest: '00:00:15',
        segments: [
            {
                id: 1,
                name: 'Segment 1',
                time: '00:00:05',
                duration: '00:00:05',
                bestTime: '00:00:05',
                allowSetTime: true,
                completed: false,
                subSegments: [],
                pbSplitTime: '00:00:05',
                pbSegmentDuration: '00:00:05',
                goldSplit: '00:00:05'
            },
            {
                id: 2,
                name: 'Segment 2',
                time: '00:00:10',
                duration: '00:00:05',
                bestTime: '00:00:05',
                allowSetTime: true,
                completed: false,
                subSegments: [],
                pbSplitTime: '00:00:10',
                pbSegmentDuration: '00:00:05',
                goldSplit: '00:00:05'
            },
            {
                id: 3,
                name: 'Segment 3',
                time: '00:00:15',
                duration: '00:00:05',
                bestTime: '00:00:05',
                allowSetTime: true,
                completed: false,
                subSegments: [],
                pbSplitTime: '00:00:15',
                pbSegmentDuration: '00:00:05',
                goldSplit: '00:00:05'
            }
        ],
        currentSegmentId: 1,
        currentSegmentName: 'Segment 1'
    };
}

export function createCompletedPbRunRoute() {
    return {
        name: 'Test Timer Color Pace',
        personalBest: '00:00:15',
        sumOfBest: '00:00:15',
        segments: [
            {
                id: 1,
                name: 'Segment 1',
                time: '00:00:03',
                duration: '00:00:03',
                bestTime: '00:00:03',
                allowSetTime: true,
                completed: false,
                subSegments: [],
                pbSplitTime: '00:00:03',
                pbSegmentDuration: '00:00:03',
                goldSplit: '00:00:03'
            },
            {
                id: 2,
                name: 'Segment 2',
                time: '00:00:09',
                duration: '00:00:06',
                bestTime: '00:00:05',
                allowSetTime: true,
                completed: false,
                subSegments: [],
                pbSplitTime: '00:00:09',
                pbSegmentDuration: '00:00:06',
                goldSplit: '00:00:05'
            },
            {
                id: 3,
                name: 'Segment 3',
                time: '00:00:14',
                duration: '00:00:05',
                bestTime: '00:00:05',
                allowSetTime: true,
                completed: false,
                subSegments: [],
                pbSplitTime: '00:00:14',
                pbSegmentDuration: '00:00:05',
                goldSplit: '00:00:05'
            }
        ],
        currentSegmentId: 1,
        currentSegmentName: 'Segment 1'
    };
}

export function createCompletedNonPbRunWithGoldRoute() {
    return {
        name: 'Test Timer Color Pace',
        personalBest: '00:00:15',
        sumOfBest: '00:00:15',
        segments: [
            {
                id: 1,
                name: 'Segment 1',
                time: '00:00:06',
                duration: '00:00:06',
                bestTime: '00:00:05',
                allowSetTime: true,
                completed: false,
                subSegments: [],
                pbSplitTime: '00:00:06',
                pbSegmentDuration: '00:00:06',
                goldSplit: '00:00:05'
            },
            {
                id: 2,
                name: 'Segment 2',
                time: '00:00:10',
                duration: '00:00:04',
                bestTime: '00:00:04',
                allowSetTime: true,
                completed: false,
                subSegments: [],
                pbSplitTime: '00:00:10',
                pbSegmentDuration: '00:00:04',
                goldSplit: '00:00:04'
            },
            {
                id: 3,
                name: 'Segment 3',
                time: '00:00:18',
                duration: '00:00:08',
                bestTime: '00:00:05',
                allowSetTime: true,
                completed: false,
                subSegments: [],
                pbSplitTime: '00:00:18',
                pbSegmentDuration: '00:00:08',
                goldSplit: '00:00:05'
            }
        ],
        currentSegmentId: 1,
        currentSegmentName: 'Segment 1'
    };
}

export function cloneFixture(value) {
    return structuredClone(value);
}