import toast from 'react-hot-toast'

type WindowWithSave = Window & {
  showSaveFilePicker?: (options?: { suggestedName?: string }) => Promise<FileSystemFileHandle>
}

export async function downloadDocumentFile(
  url: string,
  filename: string,
): Promise<{ ok: true; openUrl: string } | { ok: false }> {
  const w = window as WindowWithSave
  let blob: Blob | null = null
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (res.ok) blob = await res.blob()
  } catch {
    /* CORS / red */
  }

  const blobUrl = blob ? URL.createObjectURL(blob) : null

  if (blob && typeof w.showSaveFilePicker === 'function') {
    try {
      const handle = await w.showSaveFilePicker({ suggestedName: filename })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      toast.success('Archivo guardado')
      return { ok: true, openUrl: blobUrl! }
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        if (blobUrl) URL.revokeObjectURL(blobUrl)
        return { ok: false }
      }
    }
  }

  if (blob && blobUrl) {
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    toast.success('Descarga iniciada')
    return { ok: true, openUrl: blobUrl }
  }

  if (blobUrl) URL.revokeObjectURL(blobUrl)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  a.remove()
  toast('Descarga iniciada (ubicación según tu navegador)', { icon: '⬇️' })
  return { ok: true, openUrl: url }
}
