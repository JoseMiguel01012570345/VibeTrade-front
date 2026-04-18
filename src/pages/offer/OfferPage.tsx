import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "../../lib/cn";
import { ProtectedMediaImg } from "../../components/media/ProtectedMediaImg";
import { ImageLightbox } from "../chat/components/media/ImageLightbox";
import { useAppStore } from "../../app/store/useAppStore";
import { useMarketStore } from "../../app/store/useMarketStore";
import { RouteOfferPreview } from "./RouteOfferPreview";
import { OfferSaveButton } from "./OfferSaveButton";
import { OfferCommentsSection } from "./OfferCommentsSection";
import {
  confirmedStopIdsForCarrier,
  tramoNotifyLineFromOffer,
} from "../chat/domain/routeSheetOfferGuards";
import { userActsAsCarrierOnTransportOffer } from "../../utils/user/transportEligibility";
import {
  isToolPlaceholderUrl,
  TOOL_PLACEHOLDER_SRC,
} from "../../utils/market/toolPlaceholder";
import { trackRecommendationInteraction } from "../../utils/recommendations/recommendationsApi";
import {
  joinOfferChannel,
  leaveOfferChannel,
} from "../../utils/chat/chatRealtime";
import { offerFromStoreCatalogs } from "../../utils/market/offerFromCatalog";

function Trust({ score, helper }: { score: number; helper: string }) {
  return (
    <span
      className="rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_50%,var(--surface))] px-2.5 py-1.5 text-xs text-[var(--muted)]"
      title={helper}
    >
      Confianza: <b>{score}</b>
    </span>
  );
}

export function OfferPage() {
  const { offerId } = useParams();
  const location = useLocation();
  const nav = useNavigate();
  const me = useAppStore((s) => s.me);
  const isSessionActive = useAppStore((s) => s.isSessionActive);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const offer = useMarketStore((s) =>
    offerId ? s.offers[offerId] : undefined,
  );
  const stores = useMarketStore((s) => s.stores);
  const storeCatalogs = useMarketStore((s) => s.storeCatalogs);
  const routeOffer = useMarketStore((s) =>
    offerId ? s.routeOfferPublic[offerId] : undefined,
  );
  const threads = useMarketStore((s) => s.threads);
  const subscribeRouteOfferTramo = useMarketStore(
    (s) => s.subscribeRouteOfferTramo,
  );
  const validateRouteOfferTramo = useMarketStore(
    (s) => s.validateRouteOfferTramo,
  );
  const submitOfferQuestion = useMarketStore((s) => s.submitOfferQuestion);
  const ensureThreadForOffer = useMarketStore((s) => s.ensureThreadForOffer);
  const refreshOfferQaFromServer = useMarketStore(
    (s) => s.refreshOfferQaFromServer,
  );

  const offerFromCatalog = useMemo(
    () =>
      offerId ? offerFromStoreCatalogs(offerId, storeCatalogs) : undefined,
    [offerId, storeCatalogs],
  );
  const resolvedOffer = offer ?? offerFromCatalog;
  /** Sin esto, cada `refreshOfferQaFromServer` sustituye `offers[id]` y `resolvedOffer` cambia de referencia → efectos con `[resolvedOffer]` reejecutan en bucle. */
  const offerResolved = Boolean(resolvedOffer);

  useLayoutEffect(() => {
    if (!offerId || offer || !offerFromCatalog) return;
    useMarketStore.setState((s) => {
      if (s.offers[offerId]) return s;
      return {
        ...s,
        offers: { ...s.offers, [offerId]: offerFromCatalog },
      };
    });
  }, [offerId, offer, offerFromCatalog]);

  const openTramos = useMemo(
    () => routeOffer?.tramos.filter((t) => !t.assignment) ?? [],
    [routeOffer],
  );
  const [pickedStopId, setPickedStopId] = useState<string | null>(null);
  const [galleryLightboxUrl, setGalleryLightboxUrl] = useState<string | null>(
    null,
  );
  const chosenStopId = pickedStopId ?? openTramos[0]?.stopId ?? "";

  const pendingValidations = useMemo(
    () =>
      routeOffer?.tramos.filter((t) => t.assignment?.status === "pending") ??
      [],
    [routeOffer],
  );

  const carrierConfirmedOnRoute = useMemo(
    () =>
      !!routeOffer?.tramos.some(
        (t) =>
          t.assignment?.userId === me.id && t.assignment.status === "confirmed",
      ),
    [routeOffer, me.id],
  );

  const carrierPendingOnRoute = useMemo(
    () =>
      !!routeOffer?.tramos.some(
        (t) =>
          t.assignment?.userId === me.id && t.assignment.status === "pending",
      ),
    [routeOffer, me.id],
  );

  const threadForThisOffer = useMemo(
    () =>
      offerId
        ? Object.values(threads).find((t) => t.offerId === offerId)
        : undefined,
    [threads, offerId],
  );
  const carrierInChatThread = useMemo(
    () => !!threadForThisOffer?.chatCarriers?.some((c) => c.id === me.id),
    [threadForThisOffer, me.id],
  );
  const canOpenRouteChat = carrierConfirmedOnRoute || carrierInChatThread;

  const actingAsCarrierOnThisOffer =
    resolvedOffer &&
    userActsAsCarrierOnTransportOffer(
      me.id,
      stores,
      storeCatalogs,
      resolvedOffer,
      !!routeOffer,
    );

  const prevCarrierStopsOfferRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!routeOffer || !actingAsCarrierOnThisOffer) {
      prevCarrierStopsOfferRef.current = null;
      return;
    }
    const now = confirmedStopIdsForCarrier(routeOffer, me.id);
    const prev = prevCarrierStopsOfferRef.current;
    prevCarrierStopsOfferRef.current = now;
    if (prev === null) return;
    for (const sid of now) {
      if (!prev.has(sid)) {
        toast.success(
          `Te asignaron a ${tramoNotifyLineFromOffer(routeOffer, sid)}. Podés abrir el chat de la operación.`,
        );
      }
    }
  }, [routeOffer, me.id, actingAsCarrierOnThisOffer]);

  const galleryUrls = useMemo(() => {
    if (!resolvedOffer) return [];
    const main =
      resolvedOffer.imageUrl?.trim() ||
      (resolvedOffer.tags.includes("Servicio") ? TOOL_PLACEHOLDER_SRC : "");
    const rest = (resolvedOffer.imageUrls ?? [])
      .map((u) => String(u).trim())
      .filter(Boolean);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const u of [main, ...rest]) {
      if (!u || seen.has(u)) continue;
      seen.add(u);
      out.push(u);
    }
    return out;
  }, [resolvedOffer]);

  const heroImageSrc = useMemo(() => {
    if (!resolvedOffer) return "";
    return (
      galleryUrls[0] ||
      resolvedOffer.imageUrl?.trim() ||
      (resolvedOffer.tags.includes("Servicio") ? TOOL_PLACEHOLDER_SRC : "")
    );
  }, [resolvedOffer, galleryUrls]);

  useEffect(() => {
    if (!offerId || !resolvedOffer) return;
    void trackRecommendationInteraction(offerId, "click").catch(() => undefined);
  }, [offerId, offerResolved]);

  /** Evita repetir scrollIntoView cuando `resolvedOffer`/QA se actualiza (polling o SignalR): obligaba a bajar si el usuario intentaba subir. */
  const offerCommentsAnchorScrolledKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!offerId || !resolvedOffer) return;
    if (location.hash !== "#offer-comments") {
      offerCommentsAnchorScrolledKeyRef.current = null;
      return;
    }
    const el = document.getElementById("offer-comments");
    if (!el) return;

    const key = `${offerId}|${location.pathname}|#offer-comments`;
    if (offerCommentsAnchorScrolledKeyRef.current === key) return;
    offerCommentsAnchorScrolledKeyRef.current = key;

    const id = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(id);
  }, [offerId, offerResolved, location.hash, location.pathname]);

  useEffect(() => {
    if (!offerId || !resolvedOffer) return;
    void refreshOfferQaFromServer(offerId);
  }, [offerId, offerResolved, refreshOfferQaFromServer]);

  useEffect(() => {
    if (!offerId || !resolvedOffer) return;
    if (!isSessionActive || me.id === "guest") return;
    void joinOfferChannel(offerId);
    return () => {
      void leaveOfferChannel(offerId);
    };
  }, [offerId, offerResolved, isSessionActive, me.id]);

  useEffect(() => {
    if (!offerId || !resolvedOffer) return;
    const onVis = () => {
      if (document.visibilityState === "visible") {
        void refreshOfferQaFromServer(offerId);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [offerId, offerResolved, refreshOfferQaFromServer]);

  useEffect(() => {
    if (!offerId || !resolvedOffer) return;
    if (me.id !== "guest") return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshOfferQaFromServer(offerId);
      }
    }, 15000);
    return () => clearInterval(t);
  }, [offerId, offerResolved, me.id, refreshOfferQaFromServer]);

  if (!offerId || !resolvedOffer) {
    return (
      <div className="container vt-page">
        <div className="vt-card vt-card-pad">Oferta no encontrada.</div>
      </div>
    );
  }

  const store = stores[resolvedOffer.storeId];
  if (!store) {
    return (
      <div className="container vt-page">
        <div className="vt-card vt-card-pad">Oferta no encontrada.</div>
      </div>
    );
  }

  const heroIsToolPlaceholder = isToolPlaceholderUrl(heroImageSrc);

  const isOwnOffer =
    !!store?.ownerUserId && me.id !== "guest" && me.id === store.ownerUserId;

  return (
    <div className="container vt-page">
      <div className="flex flex-col gap-3.5">
        <div className="vt-card relative overflow-hidden">
          <div className="absolute left-3 right-3 top-3 z-[2] flex items-center justify-between gap-2">
            <button
              type="button"
              className="vt-btn border-[rgba(255,255,255,0.45)] bg-[rgba(255,255,255,0.72)] shadow-[0_10px_25px_rgba(2,6,23,0.18)] backdrop-blur-[10px] hover:bg-[rgba(255,255,255,0.86)]"
              onClick={() => nav(-1)}
            >
              <ArrowLeft size={16} />
            </button>
            <OfferSaveButton
              offerId={offerId}
              className="border-[rgba(255,255,255,0.45)] bg-[rgba(255,255,255,0.72)] shadow-[0_10px_25px_rgba(2,6,23,0.18)] backdrop-blur-[10px] hover:bg-[rgba(255,255,255,0.86)]"
            />
          </div>
          <div
            className={cn(
              "relative",
              heroIsToolPlaceholder && "bg-gray-200",
            )}
          >
            <ProtectedMediaImg
              src={heroImageSrc}
              alt={resolvedOffer.title}
              wrapperClassName="block h-[260px] w-full"
              className={cn(
                "block h-[260px] w-full",
                heroIsToolPlaceholder
                  ? "vt-img-tool-placeholder p-5 sm:p-7"
                  : "object-cover",
              )}
            />
            {heroImageSrc && !heroIsToolPlaceholder ? (
              <button
                type="button"
                className="absolute inset-0 z-[1] cursor-zoom-in bg-transparent"
                aria-label="Ver imagen a pantalla completa"
                title="Ver imagen a pantalla completa"
                onClick={() => setGalleryLightboxUrl(heroImageSrc)}
              />
            ) : null}
          </div>
          {galleryUrls.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto border-t border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_35%,var(--surface))] px-3 py-2.5">
              {galleryUrls.slice(1).map((src, i) => {
                const thumbIsTool = isToolPlaceholderUrl(src);
                return (
                  <div
                    key={`${src}-${i}`}
                    className={cn(
                      "relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg border border-[var(--border)]",
                      thumbIsTool && "bg-gray-200",
                    )}
                  >
                    <ProtectedMediaImg
                      src={src}
                      alt=""
                      wrapperClassName="h-[72px] w-[72px]"
                      className={cn(
                        "h-[72px] w-[72px]",
                        thumbIsTool
                          ? "vt-img-tool-placeholder p-1.5"
                          : "object-cover",
                      )}
                    />
                    {!thumbIsTool ? (
                      <button
                        type="button"
                        className="absolute inset-0 z-[1] cursor-zoom-in bg-transparent"
                        aria-label="Ver imagen a pantalla completa"
                        title="Ver imagen a pantalla completa"
                        onClick={() => setGalleryLightboxUrl(src)}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
          <div className="flex flex-col gap-3 p-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="text-[22px] font-black tracking-[-0.03em]">
                  {resolvedOffer.title}
                </div>
              </div>
              <div className="shrink-0 text-lg font-black">
                {resolvedOffer.price}
              </div>
            </div>

            {resolvedOffer.description?.trim() ? (
              <p className="text-[15px] leading-relaxed text-[var(--text)]">
                {resolvedOffer.description.trim()}
              </p>
            ) : null}

            <div className="vt-row flex-wrap justify-between">
              <Link
                to={`/store/${store.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_45%,var(--surface))] px-2.5 py-1.5 text-xs font-extrabold text-[var(--text)]"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]" />
                {store.name}
                {store.verified ? (
                  <span className="ml-2 rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--good)_12%,transparent)] px-2 py-1 text-[11px] font-black text-[color-mix(in_oklab,var(--good)_85%,var(--text))]">
                    Verificado
                  </span>
                ) : (
                  <span className="ml-2 rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bad)_10%,transparent)] px-2 py-1 text-[11px] font-black text-[color-mix(in_oklab,var(--bad)_80%,var(--text))]">
                    No verificado
                  </span>
                )}
              </Link>
              <Trust
                score={store.trustScore}
                helper="Indicador de confianza. A mayor número, mayor reputación."
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {resolvedOffer.tags.map((t) => (
                <span key={t} className="vt-pill">
                  {t}
                </span>
              ))}
            </div>

            {routeOffer ? (
              <>
                <RouteOfferPreview state={routeOffer} className="mt-1" />
                {actingAsCarrierOnThisOffer ? (
                  <div className="mt-3 rounded-[14px] border border-[color-mix(in_oklab,var(--primary)_28%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))] p-3.5">
                    <div className="text-sm font-black tracking-tight">
                      Suscribirme a un tramo
                    </div>
                    <p className="vt-muted mt-1.5 text-[13px] leading-snug">
                      Elegí un tramo libre y enviá la solicitud. Podés
                      suscribirte a <strong>más de un tramo</strong> en la misma
                      hoja; cada uno se valida por separado. El vendedor y el
                      comprador deben <strong>validar</strong> la suscripción
                      antes de que puedas entrar al chat operativo de la ruta.
                    </p>
                    {carrierPendingOnRoute ? (
                      <p className="mt-2 rounded-lg border border-[color-mix(in_oklab,#d97706_35%,var(--border))] bg-[color-mix(in_oklab,#d97706_8%,var(--surface))] px-2.5 py-2 text-[13px] font-semibold leading-snug text-[var(--text)]">
                        Tenés al menos una solicitud pendiente de validación.
                        Mientras tanto podés pedir otro tramo si sigue libre;
                        cuando te acepten en cualquiera de ellos podés habilitar
                        el chat (según reglas de la demo).
                      </p>
                    ) : null}
                    {carrierConfirmedOnRoute ? (
                      <p className="mt-2 rounded-lg border border-[color-mix(in_oklab,var(--good)_30%,var(--border))] bg-[color-mix(in_oklab,var(--good)_7%,var(--surface))] px-2.5 py-2 text-[13px] font-semibold leading-snug text-[var(--text)]">
                        Suscripción confirmada: ya podés abrir el chat de la
                        operación.
                      </p>
                    ) : null}
                    {openTramos.length === 0 ? (
                      <p className="mt-2 text-[13px] font-semibold text-[var(--text)]">
                        Todos los tramos tienen transportista asignado o
                        pendiente.
                      </p>
                    ) : (
                      <div className="mt-2 flex flex-col gap-2">
                        {openTramos.map((t) => (
                          <label
                            key={t.stopId}
                            className="flex cursor-pointer items-start gap-2 rounded-lg border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-2.5"
                          >
                            <input
                              type="radio"
                              name="tramo-pick"
                              className="mt-1"
                              checked={chosenStopId === t.stopId}
                              onChange={() => setPickedStopId(t.stopId)}
                            />
                            <span className="text-[13px] leading-snug">
                              <strong>Tramo {t.orden}</strong>: {t.origenLine} →{" "}
                              {t.destinoLine}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex flex-col gap-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="vt-btn vt-btn-primary"
                          disabled={!chosenStopId || openTramos.length === 0}
                          onClick={() => {
                            if (!offerId || !chosenStopId) return;
                            const ok = subscribeRouteOfferTramo(
                              offerId,
                              chosenStopId,
                              {
                                userId: me.id,
                                displayName: me.name,
                                phone: me.phone,
                                trustScore: me.trustScore,
                              },
                            );
                            if (ok) {
                              toast.success(
                                "Solicitud enviada. Pendiente de validación del vendedor o comprador.",
                              );
                              setPickedStopId(null);
                            } else {
                              toast.error("No se pudo suscribir a ese tramo.");
                            }
                          }}
                        >
                          Enviar solicitud de suscripción
                        </button>
                        <button
                          type="button"
                          className="vt-btn"
                          disabled={!canOpenRouteChat}
                          title={
                            canOpenRouteChat
                              ? "Abrir el chat de la operación"
                              : "Disponible con tramo validado o si ya figurás como integrante del hilo"
                          }
                          onClick={() => {
                            if (!canOpenRouteChat) {
                              toast.error(
                                "El chat se habilita con tramo validado o cuando ya sos integrante del hilo de esta oferta.",
                              );
                              return;
                            }
                            void trackRecommendationInteraction(
                              resolvedOffer.id,
                              "chat_start",
                            ).catch(() => undefined);
                            void (async () => {
                              const threadId = await ensureThreadForOffer(resolvedOffer.id, {
                                buyerId: me.id,
                              });
                              if (!threadId) {
                                toast.error(
                                  "Aún no hay conversación con un comprador. Se abrirá cuando alguien te escriba.",
                                );
                                return;
                              }
                              nav(`/chat/${threadId}`);
                            })();
                          }}
                        >
                          Ir al chat de la operación
                        </button>
                      </div>
                      {!canOpenRouteChat ? (
                        <p className="text-[12px] leading-snug text-[var(--muted)]">
                          El botón de chat permanece deshabilitado hasta que tu
                          tramo quede <strong>validado</strong> o hasta que
                          figures en el hilo como transportista.
                        </p>
                      ) : null}
                      {canOpenRouteChat &&
                      !carrierConfirmedOnRoute &&
                      carrierInChatThread ? (
                        <p className="text-[12px] leading-snug text-[var(--muted)]">
                          Abrís el chat como integrante del hilo aunque no
                          tengas un tramo confirmado en este momento (demo).
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {pendingValidations.length > 0 ? (
                  <div className="mt-3 rounded-[14px] border border-[color-mix(in_oklab,var(--border)_90%,transparent)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] p-3.5">
                    <div className="text-sm font-black">
                      Validación vendedor / comprador (demo)
                    </div>
                    <p className="vt-muted mt-1 text-[12px] leading-snug">
                      En producción solo el vendedor del chat y el comprador
                      podrían aceptar o rechazar. Aquí podés simular la decisión
                      para ver el flujo completo.
                    </p>
                    <ul className="m-0 mt-2 list-none space-y-2 p-0">
                      {pendingValidations.map((t) => (
                        <li
                          key={t.stopId}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-2.5 py-2"
                        >
                          <span className="text-[13px]">
                            Tramo {t.orden}: {t.assignment?.displayName}
                          </span>
                          <span className="flex gap-1.5">
                            <button
                              type="button"
                              className="vt-btn vt-btn-primary px-2.5 py-1.5 text-xs"
                              onClick={() => {
                                if (!offerId) return;
                                validateRouteOfferTramo(
                                  offerId,
                                  t.stopId,
                                  true,
                                );
                                toast.success("Suscripción validada.");
                              }}
                            >
                              Aceptar
                            </button>
                            <button
                              type="button"
                              className="vt-btn px-2.5 py-1.5 text-xs"
                              onClick={() => {
                                if (!offerId) return;
                                validateRouteOfferTramo(
                                  offerId,
                                  t.stopId,
                                  false,
                                );
                                toast("Solicitud rechazada");
                              }}
                            >
                              Rechazar
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : null}

            <div className="flex flex-wrap gap-2.5">
              <button
                className="vt-btn vt-btn-primary min-[420px]:flex-1"
                disabled={
                  (!!actingAsCarrierOnThisOffer && !!routeOffer) || isOwnOffer
                }
                title={
                  isOwnOffer
                    ? "No podés chatear con vos mismo en tu propia oferta."
                    : actingAsCarrierOnThisOffer && routeOffer
                      ? "Como transportista: suscribite a un tramo y esperá la validación para usar el chat de la ruta."
                      : undefined
                }
                onClick={() => {
                  if (!isSessionActive || me.id === "guest") {
                    openAuthModal();
                    return;
                  }
                  if (isOwnOffer) {
                    toast.error("No podés chatear con vos mismo.");
                    return;
                  }
                  if (actingAsCarrierOnThisOffer && routeOffer) {
                    toast.error(
                      "Usá la suscripción al tramo; el chat se habilita tras la validación.",
                    );
                    return;
                  }
                  void trackRecommendationInteraction(
                    resolvedOffer.id,
                    "chat_start",
                  ).catch(() => undefined);
                  void (async () => {
                    const threadId = await ensureThreadForOffer(resolvedOffer.id, {
                      buyerId: me.id,
                    });
                    if (!threadId) {
                      toast.error("No se pudo abrir el chat. Probá de nuevo.");
                      return;
                    }
                    nav(`/chat/${threadId}`);
                  })();
                }}
              >
                <ShoppingCart size={16} /> Comprar (Chat)
              </button>
            </div>
          </div>
        </div>

        <OfferCommentsSection
          offer={resolvedOffer}
          store={store}
          me={me}
          isSessionActive={isSessionActive}
          isOwnOffer={isOwnOffer}
          submitOfferQuestion={submitOfferQuestion}
        />
      </div>

      <ImageLightbox
        url={galleryLightboxUrl}
        onClose={() => setGalleryLightboxUrl(null)}
      />
    </div>
  );
}
