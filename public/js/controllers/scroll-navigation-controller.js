export class ScrollNavigationController {
  constructor({
    routeContainer = null,
    documentProvider = globalThis.document,
    IntersectionObserverClass = globalThis.IntersectionObserver,
    getSuppressObserverUntil = () => 0,
    onVisibleSegmentChange = async () => {},
    onError = (error) => console.error(error)
  } = {}) {
    this.routeContainer = routeContainer;
    this.documentProvider = documentProvider;
    this.IntersectionObserverClass = IntersectionObserverClass;
    this.getSuppressObserverUntil = getSuppressObserverUntil;
    this.onVisibleSegmentChange = onVisibleSegmentChange;
    this.onError = onError;
    this.observer = null;
  }

  setRouteContainer(routeContainer) {
    this.routeContainer = routeContainer;
  }

  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  observeSegments() {
    this.disconnect();

    if (!this.routeContainer || !this.IntersectionObserverClass) {
      return;
    }

    const options = {
      root: this.routeContainer,
      rootMargin: '0px 0px -80% 0px',
      threshold: 0
    };

    this.observer = new this.IntersectionObserverClass((entries) => {
      if (Date.now() < this.getSuppressObserverUntil()) return;

      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        this.onVisibleSegmentChange(entry.target.id).catch((error) => {
          this.onError(error);
        });
      });
    }, options);

    this.documentProvider
      .querySelectorAll('.segment')
      .forEach((element) => this.observer.observe(element));
  }
}