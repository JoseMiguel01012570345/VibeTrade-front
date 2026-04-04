/** Solicita permiso de micrófono y libera el stream (patrón tipo preview antes de grabar). */
export async function ensureMicPermission(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return false
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((t) => t.stop())
    return true
  } catch {
    return false
  }
}

/** Mime type preferido para MediaRecorder (mejor compatibilidad que el default vacío). */
export function preferredVoiceRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ]
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  return undefined
}
