import { tester } from './test-runner/tester.js';
import { RouteSelectorService } from '../public/js/services/route-selector-service.js';

function createOption({ value = '', textContent = '' } = {}) {
    return {
        value,
        textContent,
        remove() {
            this.removed = true;
        }
    };
}

function createSelectElement(options = []) {
    const select = {
        value: '',
        options,
        insertedOptions: [],
        appendedOptions: [],
        innerHTML: '',

        querySelector(selector) {
            if (selector === 'option[value="__create_new__"]') {
                return this.options.find((option) => option.value === '__create_new__') || null;
            }

            return null;
        },

        insertBefore(option, beforeOption) {
            this.insertedOptions.push({ option, beforeOption });

            const index = this.options.indexOf(beforeOption);

            if (index >= 0) {
                this.options.splice(index, 0, option);
            } else {
                this.options.push(option);
            }
        },

        appendChild(option) {
            this.appendedOptions.push(option);
            this.options.push(option);
        }
    };

    select.options.filter(Boolean).forEach((option) => {
        option.remove = function remove() {
            const index = select.options.indexOf(option);

            if (index >= 0) {
                select.options.splice(index, 1);
            }
        };
    });

    return select;
}

function createDocumentProvider() {
    return {
        createElement(tagName) {
            return {
                tagName,
                value: '',
                textContent: ''
            };
        }
    };
}

tester.describe('RouteSelectorService', () => {
    tester.it('populates the main route selector from the server route list', async () => {
        const createNewOption = createOption({
            value: '__create_new__',
            textContent: 'Create New Route'
        });

        const routeSelector = createSelectElement([
            createOption({ value: 'old-route.json', textContent: 'Old Route' }),
            createNewOption
        ]);

        const fetchMock = tester.fn(async () => ({
            ok: true,
            json: async () => ({
                routes: [
                    { filename: 'act-1-100-percent.json', name: 'Act 1 100%' },
                    { filename: 'act-2-100-percent.json', name: 'Act 2 100%' }
                ]
            })
        }));

        const service = new RouteSelectorService({
            fetchProvider: fetchMock,
            documentProvider: createDocumentProvider()
        });

        const selectedFilename = await service.populateRouteSelectorFromServer({
            routeSelector,
            currentRouteFilename: ''
        });

        tester.expect(fetchMock).toHaveBeenCalledWith('/api/list-routes');
        tester.expect(selectedFilename).toBe('act-1-100-percent.json');
        tester.expect(routeSelector.value).toBe('act-1-100-percent.json');

        const optionValues = routeSelector.options.map((option) => option.value);

        tester.expect(optionValues.includes('old-route.json')).toBe(false);
        tester.expect(optionValues.includes('act-1-100-percent.json')).toBe(true);
        tester.expect(optionValues.includes('act-2-100-percent.json')).toBe(true);
        tester.expect(optionValues.includes('__create_new__')).toBe(true);
    });

    tester.it('copies main route options into the start route selector', () => {
        const mainSelector = createSelectElement([
            createOption({ value: 'act-1-100-percent.json', textContent: 'Act 1 100%' }),
            createOption({ value: 'act-2-100-percent.json', textContent: 'Act 2 100%' }),
            createOption({ value: '__create_new__', textContent: 'Create New Route' })
        ]);

        const startRouteSelector = createSelectElement([]);

        const service = new RouteSelectorService({
            documentProvider: createDocumentProvider()
        });

        service.populateStartRouteSelectorFromMainSelector({
            mainSelector,
            startRouteSelector,
            currentRouteFilename: 'act-2-100-percent.json'
        });

        tester.expect(startRouteSelector.options.length).toBe(2);
        tester.expect(startRouteSelector.options[0].value).toBe('act-1-100-percent.json');
        tester.expect(startRouteSelector.options[1].value).toBe('act-2-100-percent.json');
        tester.expect(startRouteSelector.value).toBe('act-2-100-percent.json');
    });
});