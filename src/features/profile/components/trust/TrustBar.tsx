import { useEffect, useMemo, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { cn } from "@shared/lib/cn";
import { trustBarValueToPct } from "@features/profile/logic/trustScoreUtils";
import { ProfileButton } from "../ProfileButton";
import { ProfileModal } from "../ProfileModal";
import { profileSectionMutedClass } from "@features/profile/logic/profileTabStyles";

function useFluidPct(target: number) {
  const [v, setV] = useState(target);
  const vRef = useRef(target);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (raf.current) cancelAnimationFrame(raf.current);

    const step = () => {
      const cur = vRef.current;
      const delta = target - cur;
      const next = cur + delta * 0.18;
      vRef.current = next;
      setV(next);
      if (Math.abs(delta) > 0.08) raf.current = requestAnimationFrame(step);
      else {
        vRef.current = target;
        setV(target);
        raf.current = null;
      }
    };

    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target]);

  return v;
}

export function TrustBar() {
  const me = useAppStore((s) => s.me);
  const threshold = useAppStore((s) => s.trustThreshold);
  const [modal, setModal] = useState<null | "below" | "above">(null);
  const prevState = useRef<"below" | "above">(
    me.trustScore < threshold ? "below" : "above",
  );

  useEffect(() => {
    const state = me.trustScore < threshold ? "below" : "above";
    if (state !== prevState.current) {
      setModal(state);
      prevState.current = state;
    }
  }, [me.trustScore, threshold]);

  const pctTarget = useMemo(() => trustBarValueToPct(me.trustScore), [me.trustScore]);
  const pct = useFluidPct(pctTarget);
  const thresholdPct = useMemo(() => trustBarValueToPct(threshold), [threshold]);
  const locked = me.trustScore < threshold;
  const moving = Math.abs(pctTarget - pct) > 0.2;
  const displayPct = Math.round(pct);

  return (
    <>
      <section
        className={cn("vt-profile-trust", locked && "vt-profile-trust--locked")}
        aria-label="Barra de confianza"
      >
        <div className="vt-profile-trust__head">
          <div className="vt-profile-trust__label">
            <ShieldCheck size={14} strokeWidth={2.25} aria-hidden />
            Confianza
          </div>
          <span
            className={cn(
              "vt-profile-trust__status",
              locked
                ? "vt-profile-trust__status--locked"
                : "vt-profile-trust__status--active",
            )}
          >
            {locked ? "Bloqueada" : "Activa"}
          </span>
        </div>

        <div className="vt-profile-trust__meter">
          <div className="vt-profile-trust__track" role="img" aria-label="Progreso de confianza">
            <div
              className="vt-profile-trust__fill"
              style={{ width: `calc(${pct}% - 4px)` }}
              data-moving={moving ? "1" : "0"}
            />
            <div
              className="vt-profile-trust__threshold"
              style={{ left: `${thresholdPct}%` }}
              title="Umbral de confianza: si bajás de este nivel se bloquean las interacciones y solo podrás pagar tu mensualidad."
              aria-label="Umbral de confianza"
              role="img"
            />
          </div>
          <span className="vt-profile-trust__pct" aria-label="Porcentaje de confianza">
            {displayPct}%
          </span>
        </div>

        <p className="vt-profile-trust__hint">
          Puntaje <strong>{me.trustScore}</strong> · Umbral <strong>{threshold}</strong>
          {locked
            ? " · Interacciones bloqueadas (solo mensualidad)."
            : " · Interacciones habilitadas."}
        </p>
      </section>

      <ProfileModal
        show={modal !== null}
        onClose={() => setModal(null)}
        title={modal === "below" ? "Bajaste del umbral" : "Volviste al umbral"}
        size="md"
        footer={
          <ProfileButton variant="primary" onClick={() => setModal(null)}>
            Entendido
          </ProfileButton>
        }
      >
        <p className={profileSectionMutedClass}>
          {modal === "below"
            ? "Tu puntaje quedó por debajo del umbral. Se deshabilitan interacciones en la plataforma, excepto el pago de tu mensualidad."
            : "Tu puntaje volvió a estar por encima del umbral. Las interacciones quedan habilitadas."}
        </p>
      </ProfileModal>
    </>
  );
}
