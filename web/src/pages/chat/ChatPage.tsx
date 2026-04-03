import {
  type ChangeEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { cn } from "../../lib/cn";
import {
  ArrowLeft,
  FileText,
  GitBranch,
  Image as ImageIcon,
  Mic,
  PanelRight,
  Paperclip,
  Send,
  ShieldCheck,
  Square,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAppStore } from "../../app/store/useAppStore";
import {
  threadHasAcceptedAgreement,
  useMarketStore,
} from "../../app/store/useMarketStore";
import { ImageLightbox, MessageBody, MsgMeta } from "./ChatMedia";
import {
  formatFileSize,
  inferDocKind,
  messageAuthorLabel,
  messagePreviewLine,
} from "./chatAttachments";
import { ChatRightRail } from "./ChatRightRail";
import type { RouteSheet } from "./routeSheetTypes";
import { RouteSheetFormModal } from "./RouteSheetFormModal";
import { TradeAgreementFormModal } from "./TradeAgreementFormModal";
import "./chat.css";

function formatVoiceDur(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function TrustChip({ score }: { score: number }) {
  return (
    <span
      className="ml-auto rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_50%,var(--surface))] px-2 py-1 text-xs font-black text-[var(--muted)]"
      data-chat-interactive
      title="Indicador de confianza. Helper: reputación basada en historial de acciones."
    >
      {score}
    </span>
  );
}

export function ChatPage() {
  const { threadId } = useParams();
  const nav = useNavigate();
  const me = useAppStore((s) => s.me);
  const setTrustScore = useAppStore((s) => s.setTrustScore);
  const pushNotification = useAppStore((s) => s.pushNotification);

  const ensureThreadForOffer = useMarketStore((s) => s.ensureThreadForOffer);
  const syncThreadBuyerQa = useMarketStore((s) => s.syncThreadBuyerQa);
  const emitTradeAgreement = useMarketStore((s) => s.emitTradeAgreement);
  const respondTradeAgreement = useMarketStore((s) => s.respondTradeAgreement);
  const createRouteSheet = useMarketStore((s) => s.createRouteSheet);
  const updateRouteSheet = useMarketStore((s) => s.updateRouteSheet);
  const toggleRouteStop = useMarketStore((s) => s.toggleRouteStop);
  const thread = useMarketStore((s) =>
    threadId ? s.threads[threadId] : undefined,
  );
  const sendText = useMarketStore((s) => s.sendText);
  const sendAudio = useMarketStore((s) => s.sendAudio);
  const sendDocsBundle = useMarketStore((s) => s.sendDocsBundle);
  const sendImages = useMarketStore((s) => s.sendImages);
  const markThreadPaymentCompleted = useMarketStore(
    (s) => s.markThreadPaymentCompleted,
  );

  const [draft, setDraft] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [showAgreementForm, setShowAgreementForm] = useState(false);
  const [showRouteSheetForm, setShowRouteSheetForm] = useState(false);
  const [routeSheetBeingEdited, setRouteSheetBeingEdited] =
    useState<RouteSheet | null>(null);
  const [railOpen, setRailOpen] = useState(false);
  const [participantsEpoch, setParticipantsEpoch] = useState(0);
  const [focusRouteId, setFocusRouteId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const draftInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef(0);
  const recordTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);

  type PendingImg = { id: string; url: string };
  type PendingDoc = {
    id: string;
    url: string;
    name: string;
    size: string;
    kind: "pdf" | "doc" | "other";
  };
  const [pendingImages, setPendingImages] = useState<PendingImg[]>([]);
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const [pendingAudio, setPendingAudio] = useState<{
    url: string;
    seconds: number;
  } | null>(null);

  const draftRef = useRef(draft);
  draftRef.current = draft;
  const pendingDocsRef = useRef(pendingDocs);
  pendingDocsRef.current = pendingDocs;
  const pendingImagesRef = useRef(pendingImages);
  pendingImagesRef.current = pendingImages;
  const pendingAudioRef = useRef(pendingAudio);
  pendingAudioRef.current = pendingAudio;

  function revokeBlob(url: string) {
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
  }

  function newPendingId() {
    return `p_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  }

  const onPickDocument = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.currentTarget.value = "";
    if (!files.length) return;
    const added: PendingDoc[] = files.map((file) => ({
      id: newPendingId(),
      url: URL.createObjectURL(file),
      name: file.name,
      size: formatFileSize(file.size),
      kind: inferDocKind(file.name),
    }));
    setPendingDocs((prev) => [...prev, ...added]);
    queueMicrotask(() => draftInputRef.current?.focus());
  }, []);

  const onPickImages = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.currentTarget.value = "";
    if (!files.length) return;
    const added: PendingImg[] = files.map((file) => ({
      id: newPendingId(),
      url: URL.createObjectURL(file),
    }));
    setPendingImages((prev) => [...prev, ...added]);
    queueMicrotask(() => draftInputRef.current?.focus());
  }, []);

  const removePendingImage = useCallback((id: string) => {
    setPendingImages((prev) => {
      const img = prev.find((x) => x.id === id);
      if (img) revokeBlob(img.url);
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const removePendingDoc = useCallback((id: string) => {
    setPendingDocs((prev) => {
      const row = prev.find((x) => x.id === id);
      if (row) revokeBlob(row.url);
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const removePendingAudio = useCallback(() => {
    setPendingAudio((prev) => {
      if (prev) revokeBlob(prev.url);
      return null;
    });
  }, []);

  useEffect(() => {
    if (threadId === "demo") {
      const real = ensureThreadForOffer("o1", { buyerId: me.id });
      nav(`/chat/${real}`, { replace: true });
    }
  }, [ensureThreadForOffer, me.id, nav, threadId]);

  useEffect(() => {
    if (!threadId || threadId === "demo") return;
    syncThreadBuyerQa(threadId, me.id);
  }, [me.id, syncThreadBuyerQa, threadId]);

  useEffect(() => {
    if (thread?.chatActionsLocked) setSelected({});
  }, [thread?.chatActionsLocked]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [thread?.messages?.length]);

  useEffect(() => {
    return () => {
      if (recordTickRef.current) clearInterval(recordTickRef.current);
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== "inactive") {
        mr.stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((id) => selected[id]),
    [selected],
  );

  const selectedOrdered = useMemo(() => {
    if (!thread) return [];
    const order = new Map(thread.messages.map((m, i) => [m.id, i]));
    return [...selectedIds].sort(
      (a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0),
    );
  }, [selectedIds, thread]);

  useEffect(() => {
    if (selectedIds.length > 0) draftInputRef.current?.focus();
  }, [selectedIds.length]);

  const blockTextWithVoiceAndFiles =
    pendingAudio !== null &&
    (pendingDocs.length > 0 || pendingImages.length > 0);

  useEffect(() => {
    if (blockTextWithVoiceAndFiles) setDraft("");
  }, [blockTextWithVoiceAndFiles]);

  if (!threadId || threadId === "demo") return null;
  if (!thread) {
    return (
      <div className="container vt-page">
        <div className="vt-card vt-card-pad">Chat no encontrado.</div>
      </div>
    );
  }

  const store = thread.store;
  const chatActionsLocked = thread.chatActionsLocked === true;

  function toggleSelectRow(e: MouseEvent, id: string) {
    if (chatActionsLocked) return;
    if ((e.target as HTMLElement).closest("[data-chat-interactive]")) return;
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }

  function submitComposer() {
    if (!threadId || !thread || recording || thread.chatActionsLocked) return;
    const replyIds = selectedIds;
    const hasDocsOrImages =
      pendingDocs.length > 0 || pendingImages.length > 0;
    const hasVoice = pendingAudio !== null;
    /** No caption when voice is bundled with files (product rule). */
    const noTextWithVoiceAndFiles =
      hasVoice && hasDocsOrImages;
    const caption = noTextWithVoiceAndFiles ? "" : draft.trim();
    const cap = caption || undefined;
    if (!hasDocsOrImages && !caption && !hasVoice) return;

    let first = true;
    let voiceEmbeddedInDocs = false;
    let voiceEmbeddedInImages = false;

    if (pendingDocs.length > 0) {
      sendDocsBundle(
        thread.id,
        {
          documents: pendingDocs.map((d) => ({
            name: d.name,
            size: d.size,
            kind: d.kind,
            url: d.url,
          })),
          embeddedAudio: pendingAudio ?? undefined,
        },
        { replyToIds: replyIds, caption: first ? cap : undefined },
      );
      voiceEmbeddedInDocs = pendingAudio !== null;
      first = false;
    }

    if (pendingImages.length > 0) {
      sendImages(
        thread.id,
        pendingImages.map((p) => ({ url: p.url })),
        {
          replyToIds: replyIds,
          caption: first ? cap : undefined,
          embeddedAudio:
            pendingAudio && !voiceEmbeddedInDocs ? pendingAudio : undefined,
        },
      );
      voiceEmbeddedInImages =
        pendingAudio !== null && !voiceEmbeddedInDocs;
      first = false;
    }

    if (!pendingDocs.length && !pendingImages.length && caption) {
      sendText(thread.id, caption, replyIds);
    }

    if (hasVoice && !voiceEmbeddedInDocs && !voiceEmbeddedInImages) {
      sendAudio(thread.id, {
        url: pendingAudio!.url,
        seconds: pendingAudio!.seconds,
      });
    }

    setPendingDocs([]);
    setPendingImages([]);
    setPendingAudio(null);
    setDraft("");
    setSelected({});
    toast.success("Enviado");
  }

  const hasComposeToSend =
    pendingDocs.length > 0 ||
    pendingImages.length > 0 ||
    draft.trim().length > 0 ||
    pendingAudio !== null;

  const canSend =
    !recording && hasComposeToSend && !chatActionsLocked;

  function stopVoiceRecording() {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
  }

  async function startVoiceRecording() {
    if (chatActionsLocked) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordChunksRef.current.push(ev.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recordChunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });
        const url = URL.createObjectURL(blob);
        const seconds = Math.max(
          1,
          Math.round((Date.now() - recordStartRef.current) / 1000),
        );
        if (threadId) {
          const hasOtherStuff =
            pendingDocsRef.current.length > 0 ||
            pendingImagesRef.current.length > 0 ||
            draftRef.current.trim().length > 0 ||
            pendingAudioRef.current !== null;
          if (!hasOtherStuff) {
            sendAudio(threadId, { url, seconds });
            setSelected({});
            toast.success("Nota de voz enviada");
          } else {
            setPendingAudio((prev) => {
              if (prev) revokeBlob(prev.url);
              return { url, seconds };
            });
            toast.success("Nota de voz añadida al envío");
          }
        }
        setRecording(false);
        setRecordSecs(0);
        if (recordTickRef.current) {
          clearInterval(recordTickRef.current);
          recordTickRef.current = null;
        }
        mediaRecorderRef.current = null;
      };
      recordStartRef.current = Date.now();
      mr.start(250);
      setRecording(true);
      setRecordSecs(0);
      recordTickRef.current = setInterval(() => {
        setRecordSecs(Math.floor((Date.now() - recordStartRef.current) / 1000));
      }, 400);
    } catch {
      toast.error("No se pudo acceder al micrófono");
    }
  }

  function toggleVoiceRecording() {
    if (!recording && chatActionsLocked) return;
    if (recording) {
      stopVoiceRecording();
    } else {
      void startVoiceRecording();
    }
  }

  return (
    <div className="container vt-page vt-chat-page">
      <div
        className={cn(
          "grid min-h-0 flex-1 grid-cols-1 items-stretch gap-5",
          "max-[960px]:grid-rows-[minmax(0,1fr)_auto] max-[960px]:gap-x-4 max-[960px]:row-gap-0",
          "min-[961px]:grid-cols-[minmax(0,1fr)_minmax(340px,480px)]",
        )}
      >
        <div className="flex min-h-0 min-w-0 flex-col px-1 min-[961px]:pl-2 min-[961px]:pr-1">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3.5">
        <div className="vt-card shrink-0 px-[22px] py-[18px]">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              className="vt-btn"
              onClick={() => nav("/chat")}
              aria-label="Volver a la lista de chats"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="font-black tracking-[-0.03em]">{store.name}</div>
                {thread.purchaseMode && (
                  <span className="rounded-full border border-[color-mix(in_oklab,var(--accent,#16a34a)_35%,transparent)] bg-[color-mix(in_oklab,var(--accent,#16a34a)_18%,transparent)] px-2.5 py-1 text-xs font-bold tracking-wide text-[var(--accent-foreground,#14532d)]">
                    Modo compra
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-2">
                <span className="vt-pill">
                  <ShieldCheck size={14} />{" "}
                  {store.verified ? "Credenciales validadas" : "No verificado"}
                </span>
                <span
                  className="vt-pill"
                  title="Disponibilidad de transporte indicada por el perfil del negocio."
                >
                  Transporte:{" "}
                  {store.transportIncluded ? "incluido" : "NO incluido"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="vt-btn"
                onClick={() => {
                  setRailOpen(true);
                  setParticipantsEpoch((n) => n + 1);
                }}
                title="Ver quién participa en este chat"
              >
                <Users size={16} /> Integrantes
              </button>
              <button
                type="button"
                className="vt-btn vt-chat-rail-toggle"
                onClick={() => setRailOpen((o) => !o)}
                title="Contratos y hojas de ruta"
              >
                <PanelRight size={16} /> Panel
              </button>
              <button
                type="button"
                className="vt-btn"
                disabled={chatActionsLocked}
                title={
                  chatActionsLocked
                    ? "No disponible hasta registrar el pago"
                    : "Emitir acuerdo como negocio"
                }
                onClick={() => setShowAgreementForm(true)}
              >
                <FileText size={16} /> Emitir acuerdo
              </button>
            </div>
          </div>
        </div>

        {chatActionsLocked ? (
          <div
            className="mx-1 mt-2.5 rounded-xl border border-[color-mix(in_oklab,#d97706_35%,var(--border))] bg-[color-mix(in_oklab,#d97706_12%,var(--surface))] p-3 text-sm leading-snug text-[var(--text)]"
            role="status"
          >
            Chat restringido: saliste con un acuerdo <strong>aceptado</strong> y el
            pago aún no registrado. Solo podés usar <strong>Pago</strong> para
            continuar; no podés enviar mensajes ni crear acuerdos u hojas de ruta
            hasta entonces.
          </div>
        ) : null}

        <div
          ref={listRef}
          className="vt-card flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-[color-mix(in_oklab,var(--bg)_60%,var(--surface))] to-[var(--surface)] px-6 py-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {thread.messages.map((m) => {
            const mine = m.from === "me";
            const system = m.from === "system";
            const agreementDoc =
              m.type === "agreement"
                ? thread.contracts?.find((c) => c.id === m.agreementId)
                : undefined;
            const isSelected = !!selected[m.id];
            const phone = mine ? me.phone : "+54 11 0000-0000";
            const trust = mine ? me.trustScore : store.trustScore;
            const pendingRead = mine && "read" in m && m.read === false;

            return (
              <div
                key={m.id}
                className={cn(
                  "grid items-end gap-2.5",
                  system
                    ? "grid-cols-1"
                    : mine
                      ? "grid-cols-[minmax(0,1fr)_36px]"
                      : "grid-cols-[36px_minmax(0,1fr)]",
                )}
                onClick={(e) => {
                  if (chatActionsLocked || system || m.type === "agreement")
                    return;
                  toggleSelectRow(e, m.id);
                }}
              >
                {!system && (
                  <Link
                    to={`/profile/${mine ? me.id : store.id}`}
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/35 bg-gradient-to-br from-[var(--primary)] to-[#7c3aed] font-black text-white",
                      mine ? "col-start-2 justify-self-end" : "col-start-1",
                    )}
                    title="Ver perfil"
                    data-chat-interactive
                    onClick={(e) => e.stopPropagation()}
                  >
                    {mine ? me.name.slice(0, 1) : store.name.slice(0, 1)}
                  </Link>
                )}

                <div
                  className={cn(
                    "w-fit max-w-[min(920px,96%)] min-w-0 break-words rounded-2xl border border-[var(--border)] px-4 py-3 shadow-[0_10px_25px_rgba(15,23,42,0.06)] [overflow-wrap:anywhere]",
                    system && "col-start-1 bg-[var(--surface)]",
                    !system &&
                      mine &&
                      "col-start-1 justify-self-end bg-[color-mix(in_oklab,var(--primary)_6%,var(--surface))]",
                    !system &&
                      !mine &&
                      "col-start-2 bg-[var(--surface)]",
                    pendingRead &&
                      "border-[color-mix(in_oklab,var(--muted)_35%,var(--border))] bg-[color-mix(in_oklab,var(--muted)_22%,var(--surface))] shadow-[0_8px_20px_rgba(15,23,42,0.05)]",
                    isSelected &&
                      "outline outline-2 outline-[color-mix(in_oklab,var(--primary)_25%,transparent)]",
                  )}
                >
                  {!system && (
                    <div className="mb-1.5 flex items-center justify-between gap-2.5 text-xs">
                      <span className="font-black">
                        {mine ? me.name : store.name}
                      </span>
                      <span className="vt-muted" data-chat-interactive>
                        {phone}
                      </span>
                      <TrustChip score={trust} />
                    </div>
                  )}
                  <MessageBody
                    m={m}
                    onImageOpen={setLightboxUrl}
                    agreementDoc={agreementDoc}
                    onAcceptAgreement={
                      m.type === "agreement"
                        ? () => {
                            respondTradeAgreement(thread.id, m.agreementId, "accept");
                            toast.success(
                              "Acuerdo aceptado. No puede derogarse; podés emitir otros contratos nuevos.",
                            );
                          }
                        : undefined
                    }
                    onRejectAgreement={
                      m.type === "agreement"
                        ? () => {
                            respondTradeAgreement(thread.id, m.agreementId, "reject");
                            toast("Acuerdo rechazado");
                          }
                        : undefined
                    }
                    canRespondAgreement={
                      m.type === "agreement" &&
                      agreementDoc?.status === "pending_buyer" &&
                      !chatActionsLocked
                    }
                    onOpenAgreementRouteSheet={
                      m.type === "agreement" && agreementDoc?.routeSheetId
                        ? () => {
                            setFocusRouteId(agreementDoc.routeSheetId!);
                            setRailOpen(true);
                          }
                        : undefined
                    }
                    isMine={mine}
                  />
                  {"at" in m && (
                    <MsgMeta
                      at={m.at}
                      read={"read" in m ? m.read : undefined}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="vt-card vt-card-pad flex shrink-0 flex-col gap-2.5">
          {selectedIds.length > 0 && (
            <div
              className="overflow-hidden rounded-xl border border-[color-mix(in_oklab,var(--muted)_22%,var(--border))] border-l-4 border-l-[#25d366] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] shadow-[0_1px_0_rgba(15,23,42,0.06)]"
              role="region"
              aria-label="Respondiendo a mensajes en un hilo nuevo"
            >
              <div className="flex items-start gap-2.5 border-b border-dashed border-[color-mix(in_oklab,var(--primary)_28%,var(--border))] bg-gradient-to-br from-[color-mix(in_oklab,var(--primary)_14%,var(--surface))] to-[color-mix(in_oklab,#7c3aed_10%,var(--surface))] px-3 py-2.5">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[color-mix(in_oklab,var(--primary)_18%,transparent)] text-[var(--primary)]"
                  aria-hidden
                >
                  <GitBranch size={18} strokeWidth={2.25} />
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[13px] font-black tracking-[-0.02em] text-[var(--text)]">
                    Nuevo hilo
                  </span>
                  <span className="text-[11px] leading-snug text-[var(--muted)]">
                    Tu mensaje enlaza estas citas y se muestra como continuación
                    de hilo
                  </span>
                </div>
              </div>
              <div className="mb-2 flex items-center justify-between gap-2.5 px-3 pb-0 pl-3.5 pt-2.5">
                <span className="text-[13px] font-extrabold text-[color-mix(in_oklab,var(--text)_88%,var(--muted))]">
                  Citas en este hilo ({selectedIds.length})
                </span>
                <button
                  type="button"
                  className="grid cursor-pointer place-items-center rounded-lg border-0 bg-transparent p-1 leading-none text-[var(--muted)] hover:bg-[color-mix(in_oklab,var(--muted)_14%,transparent)] hover:text-[var(--text)]"
                  aria-label="Cancelar respuesta"
                  title="Cancelar"
                  onClick={() => setSelected({})}
                >
                  <X size={20} strokeWidth={2} />
                </button>
              </div>
              <div className="flex max-h-[140px] flex-col gap-2 overflow-y-auto px-3 pb-2.5 pl-3.5 pr-2.5">
                {selectedOrdered.map((id) => {
                  const msg = thread.messages.find((x) => x.id === id);
                  if (!msg || msg.type === "certificate") return null;
                  const author = messageAuthorLabel(msg, store.name);
                  const preview = messagePreviewLine(msg);
                  return (
                    <div key={id} className="flex min-w-0 items-start gap-2">
                      <span
                        className="mt-0.5 min-h-9 w-1 shrink-0 self-stretch rounded bg-gradient-to-b from-[#25d366] to-[color-mix(in_oklab,#25d366_65%,var(--primary))]"
                        aria-hidden
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-xs font-extrabold text-[#25d366]">
                          {author}
                        </span>
                        <span className="line-clamp-2 text-xs leading-snug text-[var(--muted)]">
                          {preview}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="-mt-0.5 grid shrink-0 cursor-pointer place-items-center rounded-lg border-0 bg-transparent p-1 leading-none text-[var(--muted)] hover:bg-[color-mix(in_oklab,var(--muted)_12%,transparent)] hover:text-[var(--text)]"
                        aria-label={`Quitar cita a ${author}`}
                        onClick={() =>
                          setSelected((s) => {
                            const n = { ...s };
                            delete n[id];
                            return n;
                          })
                        }
                      >
                        <X size={16} strokeWidth={2} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-1">
              {recording ? (
                <span
                  className="grid h-11 w-11 shrink-0 cursor-not-allowed place-items-center rounded-full border-0 bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] text-[#54656f] opacity-45"
                  title="Termina la grabación para adjuntar archivos"
                  aria-disabled="true"
                  aria-label="Adjuntar documentos (no disponible durante la grabación)"
                >
                  <span className="pointer-events-none grid place-items-center" aria-hidden>
                    <Paperclip size={22} strokeWidth={2} />
                  </span>
                </span>
              ) : (
                <label
                  className={cn(
                    "relative m-0 grid h-11 w-11 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border-0 bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] text-[#54656f] hover:bg-[color-mix(in_oklab,var(--muted)_18%,var(--surface))] hover:text-[#111b21]",
                    chatActionsLocked && "pointer-events-none opacity-40",
                  )}
                  aria-label="Adjuntar documentos"
                  title="Documentos"
                >
                  <input
                    type="file"
                    className="sr-only"
                    multiple
                    accept=".pdf,.doc,.docx,.odt,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={onPickDocument}
                  />
                  <span className="pointer-events-none grid place-items-center" aria-hidden>
                    <Paperclip size={22} strokeWidth={2} />
                  </span>
                </label>
              )}
              {recording ? (
                <span
                  className="grid h-11 w-11 shrink-0 cursor-not-allowed place-items-center rounded-full border-0 bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] text-[#54656f] opacity-45"
                  title="Termina la grabación para adjuntar archivos"
                  aria-disabled="true"
                  aria-label="Adjuntar imágenes (no disponible durante la grabación)"
                >
                  <span className="pointer-events-none grid place-items-center" aria-hidden>
                    <ImageIcon size={22} strokeWidth={2} />
                  </span>
                </span>
              ) : (
                <label
                  className={cn(
                    "relative m-0 grid h-11 w-11 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border-0 bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] text-[#54656f] hover:bg-[color-mix(in_oklab,var(--muted)_18%,var(--surface))] hover:text-[#111b21]",
                    chatActionsLocked && "pointer-events-none opacity-40",
                  )}
                  aria-label="Adjuntar imágenes"
                  title="Imágenes"
                >
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/*"
                    multiple
                    onChange={onPickImages}
                  />
                  <span className="pointer-events-none grid place-items-center" aria-hidden>
                    <ImageIcon size={22} strokeWidth={2} />
                  </span>
                </label>
              )}
            </div>
            {(pendingDocs.length > 0 ||
              pendingImages.length > 0 ||
              pendingAudio) && (
              <div
                className="flex min-h-0 flex-wrap items-end gap-2 py-2 pb-1"
                aria-label="Archivos listos para enviar"
              >
                {pendingDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex min-w-0 max-w-full flex-[1_1_200px] items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_45%,var(--surface))] px-2.5 py-2"
                  >
                    <div className="shrink-0 text-[var(--muted)]" aria-hidden>
                      <FileText size={22} strokeWidth={2} />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-[13px] font-extrabold">
                        {doc.name}
                      </span>
                      <span className="text-[11px] text-[var(--muted)]">
                        {doc.size}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={cn(
                        "grid shrink-0 cursor-pointer place-items-center rounded-lg border-0 bg-transparent p-1 leading-none text-[var(--muted)] hover:bg-[color-mix(in_oklab,var(--muted)_12%,transparent)] hover:text-[var(--text)]",
                        chatActionsLocked && "pointer-events-none opacity-[0.35]",
                      )}
                      aria-label={`Quitar ${doc.name}`}
                      onClick={() => removePendingDoc(doc.id)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
                {pendingImages.map((img) => (
                  <div
                    key={img.id}
                    className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl border border-[var(--border)]"
                  >
                    <img
                      src={img.url}
                      alt=""
                      className="block h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      className={cn(
                        "absolute right-1 top-1 grid h-6 w-6 cursor-pointer place-items-center rounded-full border-0 bg-[rgba(15,23,42,0.65)] leading-none text-white hover:bg-[rgba(15,23,42,0.85)]",
                        chatActionsLocked && "pointer-events-none opacity-[0.35]",
                      )}
                      aria-label="Quitar imagen"
                      onClick={() => removePendingImage(img.id)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {pendingAudio && (
                  <div className="flex min-w-0 max-w-full flex-[1_1_200px] items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--primary)_8%,var(--surface))] px-2.5 py-2">
                    <div
                      className="grid shrink-0 place-items-center text-[var(--primary)]"
                      aria-hidden
                    >
                      <Mic size={20} strokeWidth={2} />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[13px] font-extrabold">
                        Nota de voz
                      </span>
                      <span className="text-[11px] text-[var(--muted)]">
                        {formatVoiceDur(pendingAudio.seconds)}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={cn(
                        "grid shrink-0 cursor-pointer place-items-center rounded-lg border-0 bg-transparent p-1 leading-none text-[var(--muted)] hover:bg-[color-mix(in_oklab,var(--muted)_12%,transparent)] hover:text-[var(--text)]",
                        chatActionsLocked && "pointer-events-none opacity-[0.35]",
                      )}
                      aria-label="Quitar nota de voz"
                      onClick={() => removePendingAudio()}
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}
              </div>
            )}
            {recording && (
              <div
                className="flex items-center gap-2 rounded-[10px] bg-[color-mix(in_oklab,#ef4444_10%,var(--surface))] px-2.5 py-1.5 text-[13px] font-semibold text-[#b91c1c]"
                role="status"
              >
                <span className="h-2 w-2 animate-[vt-rec-dot_1s_ease-in-out_infinite] rounded-full bg-[#ef4444]" />
                Grabando… {recordSecs}s — tocá de nuevo para enviar
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <input
                ref={draftInputRef}
                className="vt-input min-w-0 flex-1 self-stretch"
                disabled={
                  recording || blockTextWithVoiceAndFiles || chatActionsLocked
                }
                placeholder={
                  recording
                    ? "Grabando nota de voz…"
                    : blockTextWithVoiceAndFiles
                      ? "No se puede añadir texto con nota de voz y archivos"
                      : pendingDocs.length > 0 ||
                          pendingImages.length > 0 ||
                          pendingAudio
                        ? "Añade un mensaje (opcional)…"
                        : selectedIds.length
                          ? "Escribe una respuesta…"
                          : "Escribe un mensaje…"
                }
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    recording ||
                    blockTextWithVoiceAndFiles ||
                    chatActionsLocked
                  ) {
                    e.preventDefault();
                    return;
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!canSend) return;
                    submitComposer();
                    return;
                  }
                  if (e.key === "Backspace" && draft === "") {
                    if (pendingImages.length > 0) {
                      e.preventDefault();
                      const last = pendingImages[pendingImages.length - 1];
                      removePendingImage(last.id);
                      return;
                    }
                    if (pendingDocs.length > 0) {
                      e.preventDefault();
                      const last = pendingDocs[pendingDocs.length - 1];
                      removePendingDoc(last.id);
                      return;
                    }
                    if (pendingAudio) {
                      e.preventDefault();
                      removePendingAudio();
                      return;
                    }
                    if (selectedOrdered.length > 0) {
                      e.preventDefault();
                      const last = selectedOrdered[selectedOrdered.length - 1];
                      setSelected((s) => {
                        const n = { ...s };
                        delete n[last];
                        return n;
                      });
                    }
                  }
                }}
              />
              <button
                type="button"
                className={cn(
                  "grid h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] text-[#54656f] hover:bg-[color-mix(in_oklab,var(--muted)_18%,var(--surface))] hover:text-[#111b21]",
                  recording &&
                    "animate-[vt-rec-pulse_1.2s_ease-in-out_infinite] bg-[color-mix(in_oklab,#ef4444_18%,var(--surface))] text-[#b91c1c] hover:bg-[color-mix(in_oklab,#ef4444_18%,var(--surface))] hover:text-[#b91c1c]",
                )}
                disabled={chatActionsLocked && !recording}
                aria-label={
                  recording
                    ? "Detener y enviar nota de voz"
                    : "Grabar nota de voz"
                }
                title={recording ? "Detener grabación" : "Nota de voz"}
                onClick={toggleVoiceRecording}
              >
                {recording ? (
                  <Square size={18} fill="currentColor" />
                ) : (
                  <Mic size={22} strokeWidth={2} />
                )}
              </button>
              {hasComposeToSend && (
                <button
                  type="button"
                  className={cn(
                    "grid h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-gradient-to-br from-[var(--primary)] to-[color-mix(in_oklab,var(--primary)_75%,#7c3aed)] text-white shadow-[0_8px_20px_color-mix(in_oklab,var(--primary)_35%,transparent)] hover:brightness-105 active:scale-[0.97]",
                    !canSend &&
                      "cursor-not-allowed opacity-45 [filter:grayscale(0.2)] hover:brightness-100 active:scale-100",
                  )}
                  aria-label="Enviar mensaje"
                  title="Enviar"
                  disabled={!canSend}
                  onClick={() => {
                    if (!canSend) return;
                    submitComposer();
                  }}
                >
                  <Send size={22} strokeWidth={2.25} />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              className="vt-btn"
              onClick={() => {
                markThreadPaymentCompleted(thread.id);
                pushNotification({
                  kind: "payment",
                  title: "Pago",
                  body: "Se está generando la factura del pago (demo).",
                });
                toast("Se está generando la factura…", { icon: "⚠️" });
              }}
            >
              Pago
            </button>

            <button
              className="vt-btn"
              disabled={chatActionsLocked}
              title={
                chatActionsLocked
                  ? "No disponible hasta registrar el pago"
                  : undefined
              }
              onClick={() => {
                setTrustScore(me.trustScore + 1);
                toast.success("Acción exitosa (sube confianza)");
              }}
            >
              + Confianza
            </button>
          </div>
        </div>
      </div>
        </div>

        <div
          className={cn(
            "relative z-[2] flex min-h-0 flex-col min-[961px]:self-stretch",
            "vt-chat-rail-wrap",
            railOpen && "vt-chat-rail-wrap--open",
          )}
        >
          {railOpen ? (
            <button
              type="button"
              className="vt-chat-rail-backdrop"
              aria-label="Cerrar panel"
              onClick={() => setRailOpen(false)}
            />
          ) : null}
          <ChatRightRail
            threadId={thread.id}
            contracts={thread.contracts ?? []}
            routeSheets={thread.routeSheets ?? []}
            actionsLocked={chatActionsLocked}
            storeName={store.name}
            buyerName={me.name}
            buyer={{
              id: me.id,
              name: me.name,
              trustScore: me.trustScore,
            }}
            seller={store}
            participantsFocusEpoch={participantsEpoch}
            focusRouteId={focusRouteId}
            onConsumedRouteFocus={() => setFocusRouteId(null)}
            onOpenNewRouteSheet={() => {
              if (!threadHasAcceptedAgreement(thread)) {
                toast.error(
                  "Necesitás al menos un contrato aceptado para crear una hoja de ruta.",
                );
                return;
              }
              setRouteSheetBeingEdited(null);
              setShowRouteSheetForm(true);
              setRailOpen(true);
            }}
            onEditRouteSheet={(sheet) => {
              if (sheet.publicadaPlataforma) {
                toast.error(
                  "No se puede editar una hoja de ruta ya publicada en la plataforma.",
                );
                return;
              }
              setRouteSheetBeingEdited(sheet);
              setShowRouteSheetForm(true);
              setRailOpen(true);
            }}
            toggleRouteStop={toggleRouteStop}
          />
        </div>
      </div>

      <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />

      <TradeAgreementFormModal
        open={showAgreementForm}
        onClose={() => setShowAgreementForm(false)}
        storeName={store.name}
        onSubmit={(draft) => {
          const id = emitTradeAgreement(thread.id, draft);
          if (id) toast.success("Acuerdo emitido al chat");
          else
            toast.error(
              "No se pudo emitir: revisá los datos del acuerdo (validación del servidor).",
            );
        }}
      />

      <RouteSheetFormModal
        open={showRouteSheetForm}
        initialRouteSheet={routeSheetBeingEdited}
        onClose={() => {
          setShowRouteSheetForm(false);
          setRouteSheetBeingEdited(null);
        }}
        onSubmit={(payload) => {
          if (routeSheetBeingEdited) {
            const ok = updateRouteSheet(
              thread.id,
              routeSheetBeingEdited.id,
              payload,
            );
            if (!ok) {
              toast.error(
                "No se pudo guardar: revisá título, mercancías y al menos un tramo con origen y destino",
              );
            }
            return ok;
          }
          const id = createRouteSheet(thread.id, payload);
          if (!id) {
            if (!threadHasAcceptedAgreement(thread)) {
              toast.error(
                "Necesitás al menos un contrato aceptado para crear una hoja de ruta.",
              );
            } else {
              toast.error(
                "Completá título, mercancías y al menos un tramo con origen y destino",
              );
            }
            return false;
          }
          return true;
        }}
      />
    </div>
  );
}
