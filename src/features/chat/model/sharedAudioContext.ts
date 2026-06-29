/** Contexto compartido para decodificar forma de onda (`decodeAudioData`) en mensajes de voz. */
let shared: AudioContext | null = null

export function getSharedAudioContext(): AudioContext {
  const w = window as Window & { webkitAudioContext?: typeof AudioContext }
  const Ctor = window.AudioContext ?? w.webkitAudioContext
  if (!shared || shared.state === 'closed') {
    shared = new Ctor()
  }
  return shared
}
