// FileSaver - Handles route file saving through the local Node server

class FileSaver {
  constructor() {
    this.isServerOnline = false;
    this.saveEndpoint = '/api/save-route';
    this.healthEndpoint = '/api/health';
  }

  async isServerAvailable() {
    try {
      const response = await fetch(this.healthEndpoint, { cache: 'no-store' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async checkServerStatus() {
    this.isServerOnline = await this.isServerAvailable();

    if (!this.isServerOnline) {
      console.warn('⚠️ File saving is unavailable. Start server.js and open http://localhost:3000');
    }

    return this.isServerOnline;
  }

  async saveRouteData(routeData, routeFilename = 'act-1-100-percent.json') {
    const serverAvailable = this.isServerOnline || await this.checkServerStatus();

    if (!serverAvailable) {
      console.error('❌ Save failed: local server is not available.');
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
    } catch (error) {
      console.error('❌ Failed while writing route data:', error);
      this.isServerOnline = false;
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

    fileSaver.checkServerStatus();
  });
}