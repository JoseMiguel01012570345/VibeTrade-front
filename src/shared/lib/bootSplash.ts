const t0 = typeof performance !== "undefined" ? performance.now() : 0;
const MIN_MS = 320;
const FADE_MS = 360;

/** Idempotent: desvanece y quita el splash estático de index.html. */
export function dismissBootSplash(immediate = false) {
  const splash = document.getElementById("boot-splash");
  if (!splash || splash.dataset.ceDismissed === "1") return;
  splash.dataset.ceDismissed = "1";

  const elapsed =
    typeof performance !== "undefined" ? performance.now() - t0 : MIN_MS;
  const wait = immediate ? 0 : Math.max(0, MIN_MS - elapsed);

  setTimeout(() => {
    splash.setAttribute("aria-busy", "false");
    splash.classList.add("boot-splash--exit");

    const remove = () => splash.remove();
    splash.addEventListener("transitionend", remove, { once: true });
    setTimeout(remove, FADE_MS + 80);
  }, wait);
}

export function scheduleBootSplashRemoval() {
  requestAnimationFrame(() => requestAnimationFrame(() => dismissBootSplash()));
}
