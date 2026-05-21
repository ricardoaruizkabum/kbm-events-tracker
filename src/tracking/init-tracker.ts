import { tracker } from "./tracker";

let initialized = false;

function trackElement(el: HTMLElement, app: string) {
  const raw = el.dataset.eventObject;
  const extra = raw ? JSON.parse(raw) : {};
  tracker.track({
    app,
    name: el.dataset.eventName!,
    data: { ...extra },
  });
}

export function initAutoTracking({ app }: { app: string }) {
  if (initialized) return;
  initialized = true;

  document.addEventListener(
    "click",
    (e) => {
      const el = (e.target as HTMLElement).closest("[data-event-click]");
      if (!el) return;

      const htmlEl = el as HTMLElement;
      trackElement(htmlEl, app);
    },
    true,
  );

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const htmlEl = entry.target as HTMLElement;
        trackElement(htmlEl, app);
      }
    }
  });

  const observeAll = () => {
    document.querySelectorAll<HTMLElement>("[data-event-view]").forEach((el) => {
      observer.observe(el);
    });
  };

  observeAll();

  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches("[data-event-view]")) observer.observe(node);
        node.querySelectorAll<HTMLElement>("[data-event-view]").forEach((el) => {
          observer.observe(el);
        });
      });
    }
  }).observe(document.body, { childList: true, subtree: true });
}
