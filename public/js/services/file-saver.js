// FileSaver - Handles file saving and data persistence

class FileSaver {
  constructor() {
    this.isAutosaveEnabled = true;
    this.isServerOnline = false;
    this.saveEndpoint = '/api/save-route';
    this.healthEndpoint = '/api/health';
  }

  updateAutosaveButtonState() {
    const button = document.getElementById('enable-autosave');
    if (!button) return;

    button.disabled = false;

    if (!this.isServerOnline) {
      button.textContent = 'Autosave: Off (Server Down)';
      return;
    }

    button.textContent = this.isAutosaveEnabled ? 'Autosave: On' : 'Autosave: Off';
  }

  async isServerAvailable() {
    try {
      const response = await fetch(this.healthEndpoint, { cache: 'no-store' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async enableAutosave() {
    try {
      const available = await this.isServerAvailable();
      this.isServerOnline = available;

      if (!available) {
        throw new Error('Server is not reachable. Start server.js and open http://localhost:3000');
      }

      this.isAutosaveEnabled = true;
      this.updateAutosaveButtonState();
    } catch (error) {
      console.error('❌ Failed to enable autosave:', error);
      this.isAutosaveEnabled = false;
      this.updateAutosaveButtonState();
    }
  }

  async toggleAutosave() {
    if (this.isAutosaveEnabled) {
      this.isAutosaveEnabled = false;
      this.updateAutosaveButtonState();
      return;
    }

    await this.enableAutosave();
  }

  async saveRouteData(routeData, routeFilename = 'act-1-100-percent.json', options = {}) {
    if (!this.isAutosaveEnabled && options.force !== true) {
      return;
    }

    try {
      const response = await fetch(this.saveEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: routeData, filename: routeFilename })
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`Save failed with status ${response.status}: ${responseText}`);
      }

      this.isServerOnline = true;
      this.updateAutosaveButtonState();
    } catch (error) {
      console.error('❌ Autosave failed while writing route data:', error);
      this.isServerOnline = false;
      this.isAutosaveEnabled = false;
      this.updateAutosaveButtonState();
    }
  }
}

// Initialize FileSaver when DOM is ready
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('DOMContentLoaded', () => {
    const fileSaver = new FileSaver();
    if (typeof window !== 'undefined') {
      window.fileSaver = fileSaver;
    }

    // Add event listener for enable autosave button
    const enableButton = document.getElementById('enable-autosave');
    if (enableButton) {
      enableButton.addEventListener('click', async () => {
        await fileSaver.toggleAutosave();
      });
    }

    fileSaver.enableAutosave();
  });
}
