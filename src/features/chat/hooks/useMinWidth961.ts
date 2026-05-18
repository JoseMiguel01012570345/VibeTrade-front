import { useEffect, useState } from "react";

export function useMinWidth961() {
  const [wide, setWide] = useState(() => {
    if (typeof globalThis === "undefined" || !("matchMedia" in globalThis)) {
      return true;
    }
    return globalThis.matchMedia("(min-width: 961px)").matches;
  });
  useEffect(() => {
    const mq = globalThis.matchMedia("(min-width: 961px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return wide;
}
