import { atom } from "jotai";

// Must match the number of entries in INTEGRATIONS
// (src/components/landing-page/integration-cycle.tsx).
export const INTEGRATION_CYCLE_LENGTH = 5;
export const INTEGRATION_CYCLE_MS = 4000;

/**
 * Index shared by every landing-page element that cycles through the
 * integrations. The ticker lives on the atom so all consumers advance on the
 * same beat, and it runs only while something is subscribed.
 */
export const integrationIndexAtom = atom(0);

integrationIndexAtom.onMount = (setIndex) => {
  let id: ReturnType<typeof setInterval> | undefined;

  function stop() {
    if (id !== undefined) clearInterval(id);
    id = undefined;
  }

  function start() {
    stop();
    id = setInterval(
      () => setIndex((i) => (i + 1) % INTEGRATION_CYCLE_LENGTH),
      INTEGRATION_CYCLE_MS,
    );
  }

  // Hidden tabs freeze requestAnimationFrame, so the slide can't run. Hold the
  // index still while we're away rather than letting transitions queue up and
  // resolve in a rush on return.
  function onVisibilityChange() {
    if (document.hidden) stop();
    else start();
  }

  if (!document.hidden) start();
  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    stop();
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
};
