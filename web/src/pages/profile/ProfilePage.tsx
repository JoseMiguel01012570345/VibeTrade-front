import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Camera,
  CreditCard,
  ExternalLink,
  Image,
  Mail,
  Phone,
  Save,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { useAppStore } from "../../app/store/useAppStore";
import { ProfileStoresSection } from "./ProfileStoresSection";

const REEL_TITLES: Record<string, string> = {
  r1: "Cosecha: Malanga premium",
  r2: "Flete 5 Ton - disponibilidad hoy",
  r3: "Cadena fría: exportación hortícola",
  r4: "Granos a granel — origen Rosario",
  r5: "Semi-remolque disponible Bs.As. → NEA",
};

export function ProfilePage() {
  const { userId } = useParams();
  const nav = useNavigate();
  const me = useAppStore((s) => s.me);
  const saved = useAppStore((s) => s.savedReels);

  const isMe = userId === "me" || userId === me.id;
  const [tab, setTab] = useState<"account" | "reels" | "stores">("account");

  useEffect(() => {
    if (me.role !== "seller" && tab === "stores") setTab("account");
  }, [me.role, tab]);

  const savedIds = useMemo(
    () => Object.keys(saved).filter((id) => saved[id]),
    [saved],
  );

  return (
    <div className="container vt-page">
      <div className="flex flex-col gap-3.5">
        <div className="vt-card vt-card-pad flex items-center gap-3">
          <div className="grid h-[52px] w-[52px] place-items-center rounded-[18px] bg-gradient-to-br from-[var(--primary)] to-violet-600 text-lg font-black text-white">
            {(isMe ? me.name : (userId ?? "U")).slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-black tracking-[-0.03em]">
              {isMe ? me.name : `Usuario ${userId}`}
            </div>
            <div className="vt-muted">{isMe ? me.phone : "+—"}</div>
          </div>
          <button className="vt-btn" onClick={() => nav(-1)}>
            Volver
          </button>
        </div>

        <div className="flex gap-2.5">
          <button
            className={cn(
              "flex-1 cursor-pointer rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 font-black",
              tab === "account" &&
                "border-[color-mix(in_oklab,var(--primary)_30%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))]",
            )}
            onClick={() => setTab("account")}
          >
            Cuenta
          </button>
          <button
            className={cn(
              "flex-1 cursor-pointer rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 font-black",
              tab === "reels" &&
                "border-[color-mix(in_oklab,var(--primary)_30%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))]",
            )}
            onClick={() => setTab("reels")}
          >
            Mis Reels
          </button>
          {isMe && me.role === "seller" ? (
            <button
              className={cn(
                "flex-1 cursor-pointer rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 font-black",
                tab === "stores" &&
                  "border-[color-mix(in_oklab,var(--primary)_30%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))]",
              )}
              onClick={() => setTab("stores")}
            >
              Tiendas
            </button>
          ) : null}
        </div>

        {tab === "account" && (
          <div className="vt-card vt-card-pad">
            <div className="vt-h2">Configuración del usuario</div>
            <div className="vt-divider my-3" />

            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-2">
                <span className="inline-flex items-center gap-2 text-xs font-black text-[var(--muted)]">
                  <Mail size={14} /> Email (obligatorio)
                </span>
                <input
                  className="vt-input"
                  defaultValue="demo@vibetrade.app"
                  disabled={!isMe}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="inline-flex items-center gap-2 text-xs font-black text-[var(--muted)]">
                  <Phone size={14} /> Teléfono (obligatorio)
                </span>
                <input className="vt-input" defaultValue={me.phone} disabled />
              </label>

              <div className="flex flex-col gap-2">
                <div className="inline-flex items-center gap-2 text-xs font-black text-[var(--muted)]">
                  <ExternalLink size={14} /> Multi-cuenta (Instagram / Telegram
                  / X)
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <button className="vt-btn" disabled={!isMe}>
                    <Camera size={16} /> Conectar Instagram
                  </button>
                  <button className="vt-btn" disabled={!isMe}>
                    Conectar Telegram
                  </button>
                  <button className="vt-btn" disabled={!isMe}>
                    Conectar X
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="inline-flex items-center gap-2 text-xs font-black text-[var(--muted)]">
                  <Image size={14} /> Imagen de perfil
                </div>
                <button className="vt-btn" disabled={!isMe}>
                  Subir imagen
                </button>
              </div>

              {isMe && (
                <div className="flex flex-col gap-2">
                  <div className="inline-flex items-center gap-2 text-xs font-black text-[var(--muted)]">
                    <CreditCard size={14} /> Configurar tarjetas de pago (solo
                    propietario)
                  </div>
                  <div className="vt-muted">
                    Elegí una pasarela y añadí credenciales necesarias por
                    pasarela (demo).
                  </div>
                  <button className="vt-btn">Configurar</button>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "stores" && isMe && me.role === "seller" ? (
          <ProfileStoresSection ownerUserId={me.id} />
        ) : null}

        {tab === "reels" && (
          <div className="vt-card vt-card-pad">
            <div className="vt-h2">Guardados</div>
            <div className="vt-muted mt-1.5">
              Reels guardados desde la barra lateral de la experiencia
              inmersiva.
            </div>
            <div className="vt-divider my-3" />
            {savedIds.length === 0 ? (
              <div className="vt-muted">Aún no guardaste Reels.</div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {savedIds.map((id) => (
                  <div
                    key={id}
                    className="flex items-center gap-2.5 rounded-[14px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_45%,var(--surface))] px-3 py-2.5"
                  >
                    <Save size={16} />
                    <div>
                      <div className="font-black tracking-[-0.02em]">
                        {REEL_TITLES[id] ?? id}
                      </div>
                      <div className="vt-muted">ID: {id}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
