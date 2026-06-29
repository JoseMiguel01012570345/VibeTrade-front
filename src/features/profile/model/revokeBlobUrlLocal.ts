export function revokeBlobUrlLocal(url: string | null | undefined) {
  if (!url?.startsWith('blob:')) return
  try {
    URL.revokeObjectURL(url)
  } catch {
    /* noop */
  }
}
