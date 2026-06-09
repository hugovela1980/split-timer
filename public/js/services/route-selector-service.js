export class RouteSelectorService {
    constructor({
        fetchProvider = globalThis.fetch.bind(globalThis),
        documentProvider = globalThis.document
    } = {}) {
        this.fetchProvider = fetchProvider;
        this.documentProvider = documentProvider;
    }

    async populateRouteSelectorFromServer({
        routeSelector,
        currentRouteFilename = ''
    } = {}) {
        if (!routeSelector) {
            return currentRouteFilename;
        }

        const response = await this.fetchProvider('/api/list-routes');

        if (!response.ok) {
            throw new Error('Failed to fetch route list');
        }

        const { routes } = await response.json();

        Array.from(routeSelector.options)
            .filter((option) => option.value !== '__create_new__')
            .forEach((option) => option.remove());

        const createOption = routeSelector.querySelector('option[value="__create_new__"]');

        routes.forEach(({ filename, name }) => {
            const option = this.documentProvider.createElement('option');

            option.value = filename;
            option.textContent = name;

            routeSelector.insertBefore(option, createOption);
        });

        if (routes.length > 0) {
            routeSelector.value = routes[0].filename;
            return routes[0].filename;
        }

        return currentRouteFilename;
    }

    populateStartRouteSelectorFromMainSelector({
        mainSelector,
        startRouteSelector,
        currentRouteFilename = ''
    } = {}) {
        if (!startRouteSelector || !mainSelector) return;

        startRouteSelector.innerHTML = '';

        Array.from(mainSelector.options)
            .filter((option) => option.value !== '__create_new__')
            .forEach((option) => {
                const startOption = this.documentProvider.createElement('option');

                startOption.value = option.value;
                startOption.textContent = option.textContent;

                startRouteSelector.appendChild(startOption);
            });

        if (currentRouteFilename) {
            startRouteSelector.value = currentRouteFilename;
        }
    }
}