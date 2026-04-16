import WaveSurfer from 'wavesurfer.js'
import RecordPlugin from 'wavesurfer.js/plugins/record'
import { preferredVoiceRecorderMimeType } from './voiceRecording'
import { readWaveSurferRecorderColors } from './voiceUiColors'

const VOICE_WS_LAYOUT = {
  height: 50,
  barWidth: 2,
  barGap: 2,
} as const

export type ChatVoiceRecorderSession = {
  start: () => Promise<void>
  stop: () => void
  /** Abort without emitting a blob (ej. cleanup del efecto). */
  destroy: () => void
}

export type ChatVoiceRecorderHandlers = {
  onProgressSec: (sec: number) => void
  onEnd: (blob: Blob, seconds: number) => void
  onStartFailed: () => void
}

/**
 * Vista previa con WaveSurfer (`renderMicStream`) y captura con un `MediaRecorder`
 * propio sobre el mismo `MediaStream`. Evita blobs vacíos / silencio que a veces
 * da la ruta `startRecording()` del plugin cuando compite con el ciclo de vida
 * del efecto React.
 */
export function createChatVoiceRecorderSession(
  container: HTMLElement,
  handlers: ChatVoiceRecorderHandlers,
): ChatVoiceRecorderSession {
  let destroyed = false
  let ws: WaveSurfer | null = null
  let record: ReturnType<typeof RecordPlugin.create> | null = null
  let micHandle: { onDestroy: () => void; onEnd: () => void } | null = null
  let mediaStream: MediaStream | null = null
  let mediaRecorder: MediaRecorder | null = null
  let recordChunks: Blob[] = []
  let progressTimer: ReturnType<typeof setInterval> | null = null
  let recordStartMs = 0
  /** Si true, al cerrar el MediaRecorder se llama onEnd (tap en detener). */
  let shouldEmitOnStop = false
  let visualTeardownDone = false

  function clearProgressTimer() {
    if (progressTimer) {
      clearInterval(progressTimer)
      progressTimer = null
    }
  }

  function teardownAfterRecorderClosed() {
    if (visualTeardownDone) return
    visualTeardownDone = true
    clearProgressTimer()
    if (micHandle) {
      try {
        micHandle.onDestroy()
      } catch {
        /* noop */
      }
      micHandle = null
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop())
      mediaStream = null
    }
    mediaRecorder = null
    recordChunks = []
    try {
      record?.destroy()
    } catch {
      /* noop */
    }
    record = null
    try {
      ws?.destroy()
    } catch {
      /* noop */
    }
    ws = null
    container.replaceChildren()
  }

  function destroy() {
    if (destroyed) return
    destroyed = true
    shouldEmitOnStop = false

    clearProgressTimer()

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try {
        mediaRecorder.stop()
      } catch {
        teardownAfterRecorderClosed()
      }
      return
    }

    if (micHandle) {
      try {
        micHandle.onDestroy()
      } catch {
        /* noop */
      }
      micHandle = null
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop())
      mediaStream = null
    }
    mediaRecorder = null
    recordChunks = []
    try {
      record?.destroy()
    } catch {
      /* noop */
    }
    record = null
    try {
      ws?.destroy()
    } catch {
      /* noop */
    }
    ws = null
    container.replaceChildren()
  }

  async function start() {
    visualTeardownDone = false
    const { waveColor, progressColor } = readWaveSurferRecorderColors()
    ws = WaveSurfer.create({
      container,
      height: VOICE_WS_LAYOUT.height,
      cursorWidth: 0,
      barWidth: VOICE_WS_LAYOUT.barWidth,
      barGap: VOICE_WS_LAYOUT.barGap,
      barRadius: 1,
      barAlign: 'bottom',
      interact: false,
      normalize: true,
      fillParent: true,
      waveColor,
      progressColor,
    })

    record = ws.registerPlugin(
      RecordPlugin.create({
        continuousWaveform: true,
        continuousWaveformDuration: 120,
        renderRecordedAudio: false,
        scrollingWaveform: false,
      }),
    )

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      if (!destroyed) handlers.onStartFailed()
      try {
        record?.destroy()
      } catch {
        /* noop */
      }
      record = null
      try {
        ws?.destroy()
      } catch {
        /* noop */
      }
      ws = null
      container.replaceChildren()
      return
    }

    if (destroyed) {
      stream.getTracks().forEach((t) => t.stop())
      return
    }

    mediaStream = stream
    micHandle = record.renderMicStream(stream)

    const mimeType = preferredVoiceRecorderMimeType()
    const mr = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: 128_000,
    })
    mediaRecorder = mr
    recordChunks = []
    recordStartMs = performance.now()
    shouldEmitOnStop = false

    mr.ondataavailable = (ev) => {
      if (ev.data.size > 0) recordChunks.push(ev.data)
    }

    mr.onstop = () => {
      const emit = shouldEmitOnStop
      shouldEmitOnStop = false
      const blobType = mr.mimeType || mimeType || 'audio/webm'
      const blob = new Blob(recordChunks, { type: blobType })
      const seconds = Math.max(
        1,
        Math.round((performance.now() - recordStartMs) / 1000),
      )

      teardownAfterRecorderClosed()

      if (!destroyed && emit) {
        handlers.onEnd(blob, seconds)
      }
    }

    try {
      mr.start(100)
    } catch {
      if (!destroyed) handlers.onStartFailed()
      destroy()
      return
    }

    progressTimer = setInterval(() => {
      if (destroyed) return
      handlers.onProgressSec(
        Math.floor((performance.now() - recordStartMs) / 1000),
      )
    }, 250)
  }

  function stop() {
    if (!mediaRecorder || destroyed) return
    if (mediaRecorder.state === 'inactive') return
    shouldEmitOnStop = true
    try {
      mediaRecorder.stop()
    } catch {
      shouldEmitOnStop = false
    }
  }

  return { start, stop, destroy }
}
