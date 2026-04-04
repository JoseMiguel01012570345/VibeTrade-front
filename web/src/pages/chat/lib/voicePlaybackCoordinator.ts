/** Solo un mensaje de voz del chat reproduce a la vez; el resto queda pausado donde estaba. */
let active: HTMLAudioElement | null = null

export function claimChatVoicePlayback(el: HTMLAudioElement): void {
  if (active && active !== el) {
    active.pause()
  }
  active = el
}

export function releaseChatVoicePlayback(el: HTMLAudioElement): void {
  if (active === el) active = null
}
