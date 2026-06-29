import {
  type MutableRefObject,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";
import { createChatVoiceRecorderSession } from '@features/chat/logic/voice/chatWavesurferRecorder';
import { ensureMicPermission } from '@features/chat/logic/voice/voiceRecording';

function revokeBlob(url: string) {
  if (url.startsWith("blob:")) URL.revokeObjectURL(url);
}

type PendingAudio = { url: string; seconds: number } | null;

type Deps = {
  threadId: string | undefined;
  chatActionsLocked: boolean;
  sendAudio: (
    threadId: string,
    payload: { url: string; seconds: number },
    opts?: { replyToIds?: string[] },
  ) => void;
  setSelected: (s: Record<string, boolean>) => void;
  selectedIdsRef: MutableRefObject<string[]>;
  pendingDocsRef: MutableRefObject<{ length: number }>;
  pendingImagesRef: MutableRefObject<{ length: number }>;
  draftRef: MutableRefObject<string>;
  pendingAudioRef: MutableRefObject<PendingAudio>;
  setPendingAudio: React.Dispatch<React.SetStateAction<PendingAudio>>;
};

export function useChatVoiceRecorder({
  threadId,
  chatActionsLocked,
  sendAudio,
  setSelected,
  selectedIdsRef,
  pendingDocsRef,
  pendingImagesRef,
  draftRef,
  pendingAudioRef,
  setPendingAudio,
}: Deps) {
  const voiceRecorderContainerRef = useRef<HTMLDivElement | null>(null);
  const voiceSessionRef = useRef<ReturnType<
    typeof createChatVoiceRecorderSession
  > | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);

  const stopVoiceRecording = useCallback(() => {
    voiceSessionRef.current?.stop();
  }, []);

  const startVoiceRecording = useCallback(async () => {
    if (chatActionsLocked === true) return;
    const ok = await ensureMicPermission();
    if (!ok) {
      toast.error(
        "No se pudo acceder al micrÃ³fono. Permite el permiso y usa HTTPS o localhost.",
      );
      return;
    }
    setRecordSecs(0);
    setRecording(true);
  }, [chatActionsLocked]);

  useLayoutEffect(() => {
    if (!recording) {
      voiceSessionRef.current = null;
      return;
    }
    const el = voiceRecorderContainerRef.current;
    const tid = threadId?.trim();
    if (!el || !tid) {
      setRecording(false);
      return;
    }

    let cancelled = false;
    setRecordSecs(0);

    const session = createChatVoiceRecorderSession(el, {
      onProgressSec: (s) => {
        if (!cancelled) setRecordSecs(s);
      },
      onStartFailed: () => {
        if (!cancelled) {
          toast.error("No se pudo acceder al micrÃ³fono");
          setRecording(false);
          setRecordSecs(0);
        }
      },
      onEnd: (blob, seconds) => {
        if (cancelled) return;
        if (blob.size < 32) {
          toast.error(
            "No se grabÃ³ audio Ãºtil. MantenÃ© pulsado un poco mÃ¡s el micrÃ³fono.",
          );
          setRecording(false);
          setRecordSecs(0);
          return;
        }
        const url = URL.createObjectURL(blob);
        const hasOtherStuff =
          pendingDocsRef.current.length > 0 ||
          pendingImagesRef.current.length > 0 ||
          draftRef.current.trim().length > 0 ||
          pendingAudioRef.current !== null;
        if (!hasOtherStuff) {
          const replyToIds = selectedIdsRef.current;
          sendAudio(
            tid,
            { url, seconds },
            replyToIds.length ? { replyToIds } : undefined,
          );
          setSelected({});
          toast.success("Nota de voz enviada");
        } else {
          setPendingAudio((prev) => {
            if (prev) revokeBlob(prev.url);
            return { url, seconds };
          });
          toast.success("Nota de voz aÃ±adida al envÃ­o");
        }
        setRecording(false);
        setRecordSecs(0);
      },
    });

    voiceSessionRef.current = session;
    void session.start();

    return () => {
      cancelled = true;
      voiceSessionRef.current = null;
      session.destroy();
    };
  }, [
    recording,
    threadId,
    sendAudio,
    setSelected,
    selectedIdsRef,
    pendingDocsRef,
    pendingImagesRef,
    draftRef,
    pendingAudioRef,
    setPendingAudio,
  ]);

  const toggleVoiceRecording = useCallback(() => {
    if (!recording && chatActionsLocked === true) return;
    if (recording) {
      stopVoiceRecording();
    } else {
      void startVoiceRecording();
    }
  }, [recording, chatActionsLocked, stopVoiceRecording, startVoiceRecording]);

  return {
    recording,
    recordSecs,
    voiceRecorderContainerRef,
    toggleVoiceRecording,
  };
}
