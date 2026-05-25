    const timer = document.querySelector('.timer__stopwatch');
    const startBtn = document.querySelector('.timer__start');
    const stopBtn = document.querySelector('.timer__stop');
    const resetBtn = document.querySelector('.timer__reset');
    const timerSet = document.querySelector('.timer__set');
    const timerInput = document.querySelector('.timer__set--input');

    let elapsedMs = 0;
    let startTime = null;
    let stopwatchId = null;
    let runState = 'stopped';

    const emitStopwatchUpdate = () => {
      window.dispatchEvent(new CustomEvent('stopwatch:update', {
        detail: {
          time: timer.textContent,
          runState
        }
      }));
    };

    const getElapsedSeconds = () => {
      const total = startTime !== null ? elapsedMs + (Date.now() - startTime) : elapsedMs;
      return Math.floor(total / 1000);
    };

    const updateTimerDisplay = () => {
      const totalSeconds = getElapsedSeconds();
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      timer.textContent = 
        `${String(hours).padStart(2, "0")}:` +
        `${String(minutes).padStart(2, "0")}:` +
        `${String(seconds).padStart(2, "0")}`;

      emitStopwatchUpdate();
    }
    
    const startTimer = () => {
      if (stopwatchId !== null) return;
      runState = 'running';
      startTime = Date.now();

      updateTimerDisplay();
      stopwatchId = setInterval(updateTimerDisplay, 1000);
    }

    const stopTimer = () => {
      if (startTime !== null) {
        elapsedMs += Date.now() - startTime;
        startTime = null;
      }
      clearInterval(stopwatchId);
      stopwatchId = null;
      runState = 'stopped';
      emitStopwatchUpdate();
    }

    const clearTimer = () => {
      stopTimer();
      elapsedMs = 0;
      updateTimerDisplay();
    }
    
    const resetTimer = () => {
      clearTimer();
    }

    const setTimerWithInput = (timerValue) => {
      const timeParts = timerValue.split('.');
      
      const hours = Number(timeParts[0]) || 0;
      const minutes = Number(timeParts[1]) || 0;
      const seconds = Number(timeParts[2]) || 0;
      
      elapsedMs = (hours * 3600 + minutes * 60 + seconds) * 1000;

      updateTimerDisplay();
      timerInput.value = '';
    }

    const submitTimeInput = (e) => {
      e.preventDefault();
      const value = timerInput.value;
      
      if (!value) return;
      
      stopTimer();
      setTimerWithInput(value);
    }

    const manageKeypress = (e) => {
      const tag = document.activeElement.tagName;

      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      
      if (e.key === ' ') {
        e.preventDefault();
        timerInput.value = '';

        if (runState === 'stopped') {
          startTimer();
        } else if (runState === 'running') {
          stopTimer();
        }
      }
      
      if (e.key === 'r' || e.key === 'R') {
        timerInput.value = '';
        resetTimer();
      }
    }

    const handleInputFilter = (e) => {
      const allowedKeys = /[0-9.]/;
      const browserControlKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Control', 'Alt', 'Shift', 'F5', "I", "-", "="];
      
      if (!browserControlKeys.includes(e.key) && !allowedKeys.test(e.key)) {
        e.preventDefault();
      }
    }

    window.addEventListener('run:complete', () => {
      stopTimer();
    });

    window.addEventListener('stopwatch:clear', () => {
      clearTimer();
    });

    window.addEventListener('stopwatch:start', () => {
      startTimer();
    });

    window.addEventListener('stopwatch:stop', () => {
      stopTimer();
    });

    startBtn.addEventListener('click', startTimer);
    stopBtn.addEventListener('click', stopTimer);
    resetBtn.addEventListener('click', resetTimer);
    timerSet.addEventListener('submit', (e) => submitTimeInput(e));
    window.addEventListener('keydown', manageKeypress);
    timerInput.addEventListener('keydown', handleInputFilter);
    document.addEventListener('DOMContentLoaded', () => {
      updateTimerDisplay();
      emitStopwatchUpdate();
    });