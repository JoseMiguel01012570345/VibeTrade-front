import type { Message } from '../../app/store/useMarketStore'

/** Línea corta para citas en la UI (composer / burbujas). */
export function messagePreviewLine(m: Message): string {
  switch (m.type) {
    case 'text':
      return m.text.length > 72 ? `${m.text.slice(0, 72)}…` : m.text
    case 'image':
      return m.images.length > 1 ? `${m.images.length} fotos` : 'Foto'
    case 'audio':
      return 'Nota de voz'
    case 'doc':
      return m.name
    case 'certificate':
      return m.title
    default:
      return ''
  }
}

export function messageAuthorLabel(m: Message, peerName: string, meLabel = 'Tú'): string {
  if (m.from === 'me') return meLabel
  if (m.from === 'other') return peerName
  return 'Sistema'
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function inferDocKind(name: string): 'pdf' | 'doc' | 'other' {
  const lower = name.toLowerCase()
  if (lower.endsWith('.pdf')) return 'pdf'
  if (lower.endsWith('.doc') || lower.endsWith('.docx') || lower.endsWith('.odt')) return 'doc'
  return 'other'
}
