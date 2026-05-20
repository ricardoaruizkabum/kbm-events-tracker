import { tracker } from "./tracker";

let initialized = false;

function trackElement(el: HTMLElement, app: string) {
  const raw = el.dataset.trackObject;
  const extra = raw ? JSON.parse(raw) : {};
  tracker.track({
    app,
    name: el.dataset.track!,
    data: { ...extra },
  });
}

export function initAutoTracking({ app }: { app: string }) {
  if (initialized) return;
  initialized = true;

  document.addEventListener(
    "click",
    (e) => {
      const el = (e.target as HTMLElement).closest("[data-track]");
      if (!el) return;

      const htmlEl = el as HTMLElement;
      trackElement(htmlEl, app);
      // const raw = htmlEl.dataset.trackObject;
      // const extra = raw ? JSON.parse(raw) : {};

      // tracker.track({
      //   app,
      //   name: htmlEl.dataset.track!,
      //   // data: { text: el.textContent, ...extra },
      //   data: { ...extra },
      // });
    },
    true,
  );

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        trackElement(entry.target as HTMLElement, app);
      }
    }
  });

  const observeAll = () => {
    document.querySelectorAll<HTMLElement>("[data-track]").forEach((el) => {
      observer.observe(el);
    });
  };

  observeAll();

  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches("[data-track]")) observer.observe(node);
        node.querySelectorAll<HTMLElement>("[data-track]").forEach((el) => {
          observer.observe(el);
        });
      });
    }
  }).observe(document.body, { childList: true, subtree: true });
}
