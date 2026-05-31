import { normalizeRouteTimingFields } from '../utils/utils.js';

export class RouteDataService {
  constructor({ fetchProvider = globalThis.fetch } = {}) {
    this.fetchProvider = fetchProvider;
  }

  async loadRouteData(filename = 'act-1-100-percent.json') {
    const response = await this.fetchProvider(`./data/routes/${filename}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const routeData = data.route || data;

    if (!routeData || !Array.isArray(routeData.segments)) {
      throw new Error(`Invalid ${filename} format: missing route segments`);
    }

    normalizeRouteTimingFields(routeData);

    return routeData;
  }
}