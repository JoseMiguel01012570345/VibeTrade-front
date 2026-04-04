import {
  type ChangeEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { cn } from "../../lib/cn";
import {
  ArrowLeft,
  FileText,
  PanelRight,
  ShieldCheck,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAppStore } from "../../app/store/useAppStore";
import {
  threadHasAcceptedAgreement,
  useMarketStore,
} from "../../app/store/useMarketStore";
import { ImageLightbox } from "./components/media/ChatMedia";
import {
  ChatComposerSection,
  type PendingDoc,
  type PendingImg,
} from "./components/composer/ChatComposerSection";
import { ChatMessageList } from "./components/messages/ChatMessageList";
import { formatFileSize, inferDocKind } from "./lib/chatAttachments";
import { ChatRightRail } from "./components/rail/ChatRightRail";
import type { RouteSheet } from "./domain/routeSheetTypes";
import { RouteSheetFormModal } from "./components/modals/RouteSheetFormModal";
import { TradeAgreementFormModal } from "./components/modals/TradeAgreementFormModal";
import { tradeAgreementToDraft } from "./domain/tradeAgreementTypes";
import "./chat.css";

export function ChatPage() {
  const { threadId } = useParams();
  const nav = useNavigate();
  const me = useAppStore((s) => s.me);
  const setTrustScore = useAppStore((s) => s.setTrustScore);
  const pushNotification = useAppStore((s) => s.pushNotification);

  const ensureThreadForOffer = useMarketStore((s) => s.ensureThreadForOffer);
  const syncThreadBuyerQa = useMarketStore((s) => s.syncThreadBuyerQa);
  const emitTradeAgreement = useMarketStore((s) => s.emitTradeAgreement);
  const updatePendingTradeAgreement = useMarketStore((s) => s.updatePendingTradeAgreement);
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
  const [agreementBeingEditedId, setAgreementBeingEditedId] = useState<string | null>(null);
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

  const agreementFormInitial = useMemo(() => {
    if (!agreementBeingEditedId || !thread?.contracts) return null;
    const a = thread.contracts.find((c) => c.id === agreementBeingEditedId);
    return a ? tradeAgreementToDraft(a) : null;
  }, [agreementBeingEditedId, thread?.contracts]);

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
    const hasDocsOrImages = pendingDocs.length > 0 || pendingImages.length > 0;
    const hasVoice = pendingAudio !== null;
    /** No caption when voice is bundled with files (product rule). */
    const noTextWithVoiceAndFiles = hasVoice && hasDocsOrImages;
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
      voiceEmbeddedInImages = pendingAudio !== null && !voiceEmbeddedInDocs;
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

  const canSend = !recording && hasComposeToSend && !chatActionsLocked;

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
                    <div className="font-black tracking-[-0.03em]">
                      {store.name}
                    </div>
                    {thread.purchaseMode && (
                      <span className="rounded-full border border-[color-mix(in_oklab,var(--accent,#16a34a)_35%,transparent)] bg-[color-mix(in_oklab,var(--accent,#16a34a)_18%,transparent)] px-2.5 py-1 text-xs font-bold tracking-wide text-[var(--accent-foreground,#14532d)]">
                        Modo compra
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="vt-pill inline-flex items-center gap-1">
                      <ShieldCheck size={14} aria-hidden />
                      {store.verified
                        ? "Credenciales validadas"
                        : "No verificado"}
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
                    onClick={() => {
                      setAgreementBeingEditedId(null);
                      setShowAgreementForm(true);
                    }}
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
                Chat restringido: saliste con un acuerdo{" "}
                <strong>aceptado</strong> y el pago aún no registrado. Solo
                podés usar <strong>Pago</strong> para continuar; no podés enviar
                mensajes ni crear acuerdos u hojas de ruta hasta entonces.
              </div>
            ) : null}

            <ChatMessageList
              listRef={listRef}
              thread={thread}
              me={me}
              selected={selected}
              chatActionsLocked={chatActionsLocked}
              toggleSelectRow={toggleSelectRow}
              setLightboxUrl={setLightboxUrl}
              respondTradeAgreement={respondTradeAgreement}
              setFocusRouteId={setFocusRouteId}
              setRailOpen={setRailOpen}
            />

            <ChatComposerSection
              thread={thread}
              me={me}
              storeName={store.name}
              chatActionsLocked={chatActionsLocked}
              draftInputRef={draftInputRef}
              draft={draft}
              setDraft={setDraft}
              selected={selected}
              setSelected={setSelected}
              selectedIds={selectedIds}
              selectedOrdered={selectedOrdered}
              pendingDocs={pendingDocs}
              pendingImages={pendingImages}
              pendingAudio={pendingAudio}
              recording={recording}
              recordSecs={recordSecs}
              blockTextWithVoiceAndFiles={blockTextWithVoiceAndFiles}
              hasComposeToSend={hasComposeToSend}
              canSend={canSend}
              onPickDocument={onPickDocument}
              onPickImages={onPickImages}
              removePendingDoc={removePendingDoc}
              removePendingImage={removePendingImage}
              removePendingAudio={removePendingAudio}
              submitComposer={submitComposer}
              toggleVoiceRecording={toggleVoiceRecording}
              markThreadPaymentCompleted={markThreadPaymentCompleted}
              pushNotification={pushNotification}
              setTrustScore={setTrustScore}
            />
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
            onEditPendingAgreement={(ag) => {
              if (ag.status !== "pending_buyer" && ag.status !== "rejected") return;
              setAgreementBeingEditedId(ag.id);
              setShowAgreementForm(true);
            }}
          />
        </div>
      </div>

      <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />

      <TradeAgreementFormModal
        open={showAgreementForm}
        onClose={() => {
          setShowAgreementForm(false);
          setAgreementBeingEditedId(null);
        }}
        storeName={store.name}
        initialDraft={agreementBeingEditedId ? agreementFormInitial : null}
        editingAgreementId={agreementBeingEditedId}
        onSubmit={(draft) => {
          if (agreementBeingEditedId) {
            const ok = updatePendingTradeAgreement(
              thread.id,
              agreementBeingEditedId,
              draft,
            );
            if (ok) toast.success("Acuerdo actualizado");
            else
              toast.error(
                "No se pudo guardar: solo se editan acuerdos pendientes o rechazados (no los ya aceptados).",
              );
            return ok;
          }
          const id = emitTradeAgreement(thread.id, draft);
          if (id) toast.success("Acuerdo emitido al chat");
          else
            toast.error(
              "No se pudo emitir: revisá los datos del acuerdo (validación del servidor).",
            );
          return id != null;
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
