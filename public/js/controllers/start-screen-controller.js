export class StartScreenController {
    constructor({
        startRouteButton,
        startRouteSelector,
        startScreen,
        appShell,
        startCreateRouteButton = null,
        populateStartRouteSelector = () => { },
        confirmRouteSwitch = () => true,
        switchRoute = async () => { },
        showCreateRouteModal = () => { },
        dispatchEvent = (event) => window.dispatchEvent(event),
        CustomEventClass = globalThis.CustomEvent
    } = {}) {
        this.startRouteButton = startRouteButton;
        this.startRouteSelector = startRouteSelector;
        this.startScreen = startScreen;
        this.appShell = appShell;
        this.startCreateRouteButton = startCreateRouteButton;
        this.populateStartRouteSelector = populateStartRouteSelector;
        this.confirmRouteSwitch = confirmRouteSwitch;
        this.switchRoute = switchRoute;
        this.showCreateRouteModal = showCreateRouteModal;
        this.dispatchEvent = dispatchEvent;
        this.CustomEventClass = CustomEventClass;
    }

    init() {
        if (
            !this.startRouteButton ||
            !this.startRouteSelector ||
            !this.startScreen ||
            !this.appShell
        ) {
            return;
        }

        this.populateStartRouteSelector();

        if (typeof this.startRouteSelector.focus === 'function') {
            this.startRouteSelector.focus();
        }

        const openSelectedRoute = async () => {
            const selectedRoute = this.startRouteSelector.value;

            if (!selectedRoute) return;
            if (!this.confirmRouteSwitch()) return;

            await this.switchRoute(selectedRoute);
            this.showMainApp();

            this.dispatchEvent(new this.CustomEventClass('stopwatch:clear'));
        };

        this.startRouteButton.addEventListener('click', openSelectedRoute);

        this.startRouteSelector.addEventListener('keydown', async (event) => {
            if (event.key !== 'Enter') return;

            event.preventDefault();
            await openSelectedRoute();
        });

        if (this.startCreateRouteButton) {
            this.startCreateRouteButton.addEventListener('click', () => {
                this.showCreateRouteModal({
                    onRouteCreated: () => {
                        this.showMainApp();
                    }
                });
            });
        }
    }

    showMainApp() {
        if (this.startScreen) {
            this.startScreen.hidden = true;
        }

        if (this.appShell) {
            this.appShell.hidden = false;
        }
    }
}