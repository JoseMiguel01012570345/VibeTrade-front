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
import clsx from "clsx";
import {
  ArrowLeft,
  FileText,
  GitBranch,
  Image as ImageIcon,
  Mic,
  Paperclip,
  Plus,
  Send,
  ShieldCheck,
  Square,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAppStore } from "../../app/store/useAppStore";
import { useMarketStore } from "../../app/store/useMarketStore";
import { ImageLightbox, MessageBody, MsgMeta } from "./ChatMedia";
import {
  formatFileSize,
  inferDocKind,
  messageAuthorLabel,
  messagePreviewLine,
} from "./chatAttachments";
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
      className="vt-chat-trust"
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
  const thread = useMarketStore((s) =>
    threadId ? s.threads[threadId] : undefined,
  );
  const sendText = useMarketStore((s) => s.sendText);
  const sendAudio = useMarketStore((s) => s.sendAudio);
  const sendDocsBundle = useMarketStore((s) => s.sendDocsBundle);
  const sendImages = useMarketStore((s) => s.sendImages);

  const [draft, setDraft] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [showContracts, setShowContracts] = useState(false);
  const [showCarrier, setShowCarrier] = useState(false);
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
  const transportWarning = !store.transportIncluded;

  function toggleSelectRow(e: MouseEvent, id: string) {
    if ((e.target as HTMLElement).closest("[data-chat-interactive]")) return;
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }

  function submitComposer() {
    if (!threadId || !thread || recording) return;
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

  const canSend = !recording && hasComposeToSend;

  function stopVoiceRecording() {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
  }

  async function startVoiceRecording() {
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
    if (recording) {
      stopVoiceRecording();
    } else {
      void startVoiceRecording();
    }
  }

  return (
    <div className="container vt-page">
      <div className="vt-chat">
        <div className="vt-chat-head vt-card vt-card-pad">
          <div className="vt-chat-head-top">
            <button
              className="vt-btn"
              onClick={() => nav(-1)}
              aria-label="Volver"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="vt-chat-head-main">
              <div className="vt-chat-title-row">
                <div className="vt-chat-title">{store.name}</div>
                {thread.purchaseMode && (
                  <span className="vt-chat-purchase-badge">Modo compra</span>
                )}
              </div>
              <div className="vt-chat-sub">
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

            <button className="vt-btn" onClick={() => setShowContracts(true)}>
              Contratos
            </button>
          </div>

          {transportWarning && (
            <div className="vt-chat-warn">
              <div className="vt-chat-warn-text">
                Este producto/servicio no incluye transporte. Podés añadir
                transportista antes de cerrar el acuerdo.
              </div>
              <button
                className="vt-btn vt-btn-primary"
                onClick={() => setShowCarrier(true)}
              >
                <Plus size={16} /> Añadir Transportista
              </button>
            </div>
          )}
        </div>

        <div className="vt-chat-list vt-card" ref={listRef}>
          {thread.messages.map((m) => {
            const mine = m.from === "me";
            const system = m.from === "system";
            const isSelected = !!selected[m.id];
            const phone = mine ? me.phone : "+54 11 0000-0000";
            const trust = mine ? me.trustScore : store.trustScore;
            const pendingRead = mine && "read" in m && m.read === false;

            return (
              <div
                key={m.id}
                className={clsx(
                  "vt-chat-row",
                  mine && "vt-chat-row-mine",
                  system && "vt-chat-row-system",
                  isSelected && "vt-chat-row-selected",
                )}
                onClick={(e) => {
                  if (system) return;
                  toggleSelectRow(e, m.id);
                }}
              >
                {!system && (
                  <Link
                    to={`/profile/${mine ? me.id : store.id}`}
                    className="vt-chat-avatar"
                    title="Ver perfil"
                    data-chat-interactive
                    onClick={(e) => e.stopPropagation()}
                  >
                    {mine ? me.name.slice(0, 1) : store.name.slice(0, 1)}
                  </Link>
                )}

                <div
                  className={clsx(
                    "vt-chat-bubble",
                    pendingRead && "vt-chat-bubble-pending",
                  )}
                >
                  {!system && (
                    <div className="vt-chat-badge">
                      <span className="vt-chat-name">
                        {mine ? me.name : store.name}
                      </span>
                      <span className="vt-muted" data-chat-interactive>
                        {phone}
                      </span>
                      <TrustChip score={trust} />
                    </div>
                  )}
                  <MessageBody m={m} onImageOpen={setLightboxUrl} />
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

        <div className="vt-chat-compose vt-card vt-card-pad">
          {selectedIds.length > 0 && (
            <div
              className="vt-chat-reply-wa"
              role="region"
              aria-label="Respondiendo a mensajes en un hilo nuevo"
            >
              <div className="vt-chat-reply-thread-strip">
                <span className="vt-chat-reply-thread-strip-icon" aria-hidden>
                  <GitBranch size={18} strokeWidth={2.25} />
                </span>
                <div className="vt-chat-reply-thread-strip-text">
                  <span className="vt-chat-reply-thread-strip-title">
                    Nuevo hilo
                  </span>
                  <span className="vt-chat-reply-thread-strip-sub">
                    Tu mensaje enlaza estas citas y se muestra como continuación
                    de hilo
                  </span>
                </div>
              </div>
              <div className="vt-chat-reply-wa-head">
                <span className="vt-chat-reply-wa-title">
                  Citas en este hilo ({selectedIds.length})
                </span>
                <button
                  type="button"
                  className="vt-chat-reply-wa-closeall"
                  aria-label="Cancelar respuesta"
                  title="Cancelar"
                  onClick={() => setSelected({})}
                >
                  <X size={20} strokeWidth={2} />
                </button>
              </div>
              <div className="vt-chat-reply-wa-list">
                {selectedOrdered.map((id) => {
                  const msg = thread.messages.find((x) => x.id === id);
                  if (!msg || msg.type === "certificate") return null;
                  const author = messageAuthorLabel(msg, store.name);
                  const preview = messagePreviewLine(msg);
                  return (
                    <div key={id} className="vt-chat-reply-wa-row">
                      <span className="vt-chat-reply-wa-accent" aria-hidden />
                      <div className="vt-chat-reply-wa-snippet">
                        <span className="vt-chat-reply-wa-author">
                          {author}
                        </span>
                        <span className="vt-chat-reply-wa-preview">
                          {preview}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="vt-chat-reply-wa-remove"
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

          <div className="vt-chat-compose-bar">
            <div className="vt-chat-compose-tools">
              {recording ? (
                <span
                  className="vt-chat-tool-btn vt-chat-tool-disabled"
                  title="Termina la grabación para adjuntar archivos"
                  aria-disabled="true"
                  aria-label="Adjuntar documentos (no disponible durante la grabación)"
                >
                  <span className="vt-chat-tool-file-face" aria-hidden>
                    <Paperclip size={22} strokeWidth={2} />
                  </span>
                </span>
              ) : (
                <label
                  className="vt-chat-tool-btn vt-chat-tool-file-label"
                  aria-label="Adjuntar documentos"
                  title="Documentos"
                >
                  <input
                    type="file"
                    className="vt-chat-file-input"
                    multiple
                    accept=".pdf,.doc,.docx,.odt,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={onPickDocument}
                  />
                  <span className="vt-chat-tool-file-face" aria-hidden>
                    <Paperclip size={22} strokeWidth={2} />
                  </span>
                </label>
              )}
              {recording ? (
                <span
                  className="vt-chat-tool-btn vt-chat-tool-disabled"
                  title="Termina la grabación para adjuntar archivos"
                  aria-disabled="true"
                  aria-label="Adjuntar imágenes (no disponible durante la grabación)"
                >
                  <span className="vt-chat-tool-file-face" aria-hidden>
                    <ImageIcon size={22} strokeWidth={2} />
                  </span>
                </span>
              ) : (
                <label
                  className="vt-chat-tool-btn vt-chat-tool-file-label"
                  aria-label="Adjuntar imágenes"
                  title="Imágenes"
                >
                  <input
                    type="file"
                    className="vt-chat-file-input"
                    accept="image/*"
                    multiple
                    onChange={onPickImages}
                  />
                  <span className="vt-chat-tool-file-face" aria-hidden>
                    <ImageIcon size={22} strokeWidth={2} />
                  </span>
                </label>
              )}
            </div>
            {(pendingDocs.length > 0 ||
              pendingImages.length > 0 ||
              pendingAudio) && (
              <div
                className="vt-chat-compose-pending"
                aria-label="Archivos listos para enviar"
              >
                {pendingDocs.map((doc) => (
                  <div key={doc.id} className="vt-chat-pending-doc">
                    <div className="vt-chat-pending-doc-icon" aria-hidden>
                      <FileText size={22} strokeWidth={2} />
                    </div>
                    <div className="vt-chat-pending-doc-info">
                      <span className="vt-chat-pending-doc-name">
                        {doc.name}
                      </span>
                      <span className="vt-chat-pending-doc-meta">
                        {doc.size}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="vt-chat-pending-remove"
                      aria-label={`Quitar ${doc.name}`}
                      onClick={() => removePendingDoc(doc.id)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
                {pendingImages.map((img) => (
                  <div key={img.id} className="vt-chat-pending-thumb-wrap">
                    <img
                      src={img.url}
                      alt=""
                      className="vt-chat-pending-thumb"
                    />
                    <button
                      type="button"
                      className="vt-chat-pending-thumb-x"
                      aria-label="Quitar imagen"
                      onClick={() => removePendingImage(img.id)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {pendingAudio && (
                  <div className="vt-chat-pending-audio">
                    <div className="vt-chat-pending-audio-icon" aria-hidden>
                      <Mic size={20} strokeWidth={2} />
                    </div>
                    <div className="vt-chat-pending-audio-info">
                      <span className="vt-chat-pending-audio-label">
                        Nota de voz
                      </span>
                      <span className="vt-chat-pending-audio-meta">
                        {formatVoiceDur(pendingAudio.seconds)}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="vt-chat-pending-remove"
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
              <div className="vt-chat-rec-banner" role="status">
                <span className="vt-chat-rec-dot" />
                Grabando… {recordSecs}s — tocá de nuevo para enviar
              </div>
            )}
            <div className="vt-chat-compose-inputrow">
              <input
                ref={draftInputRef}
                className="vt-input"
                disabled={recording || blockTextWithVoiceAndFiles}
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
                  if (recording || blockTextWithVoiceAndFiles) {
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
                className={clsx(
                  "vt-chat-tool-btn",
                  "vt-chat-compose-voice-btn",
                  recording && "vt-chat-tool-btn-rec",
                )}
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
                  className={clsx(
                    "vt-chat-send-btn",
                    !canSend && "vt-chat-send-btn-disabled",
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

          <div className="vt-chat-actions2">
            <button
              className="vt-btn"
              onClick={() => {
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
              onClick={() => {
                setTrustScore(me.trustScore + 1);
                toast.success("Acción exitosa (sube confianza)");
              }}
            >
              + Confianza
            </button>

            <button
              className="vt-btn"
              onClick={() => {
                const reason = window.prompt("Motivo para salir del chat");
                if (!reason) return;
                toast(
                  "Salida registrada. Se investigará y podría afectar tu confianza.",
                  { icon: "⚠️" },
                );
              }}
            >
              Salir del chat
            </button>
          </div>
        </div>
      </div>

      <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />

      {showContracts && (
        <div className="vt-modal-backdrop" role="dialog" aria-modal="true">
          <div className="vt-modal">
            <div className="vt-modal-title">Contratos (demo)</div>
            <div className="vt-modal-body">
              Aquí se listan acuerdos emitidos, con filtro por usuario y link a
              hojas de ruta cuando hay mercancías.
            </div>
            <div className="vt-modal-actions">
              <button
                className="vt-btn"
                onClick={() => setShowContracts(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showCarrier && (
        <div className="vt-modal-backdrop" role="dialog" aria-modal="true">
          <div className="vt-modal">
            <div className="vt-modal-title">Añadir transportista</div>
            <div className="vt-modal-body">
              <div className="vt-col" style={{ gap: 10 }}>
                <div className="vt-muted">
                  Se despliega un formulario donde se definen términos. El
                  comprador debe aceptar explícitamente el precio del transporte
                  antes de proceder.
                </div>
                <label className="vt-chat-check">
                  <input type="checkbox" /> Estoy de acuerdo con el precio del
                  transporte
                </label>
              </div>
            </div>
            <div className="vt-modal-actions">
              <button className="vt-btn" onClick={() => setShowCarrier(false)}>
                Cancelar
              </button>
              <button
                className="vt-btn vt-btn-primary"
                onClick={() => {
                  toast.success("Transportista añadido (demo)");
                  setShowCarrier(false);
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
