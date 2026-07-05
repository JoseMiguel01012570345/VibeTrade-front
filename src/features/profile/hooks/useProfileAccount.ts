import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAppStore } from '@features/auth/logic/useAppStore'
import { patchProfile } from '@features/auth/api/patchProfile'
import { formatPhoneForDisplay } from '@features/auth/logic/formatPhoneForDisplay'

/** Estado y acciones de la sección «account» del perfil. */
export function useProfileAccount() {
  const { userId } = useParams()
  const me = useAppStore((s) => s.me)
  const isOwnProfile = me.id !== 'guest' && userId === me.id
  const [saving, setSaving] = useState(false)

  const saveName = useCallback(
    async (name: string) => {
      if (!isOwnProfile) return
      setSaving(true)
      try {
        await patchProfile({ name: name.trim() })
        useAppStore.getState().setMeName(name.trim())
        toast.success('Nombre actualizado')
      } catch {
        toast.error('No se pudo guardar el nombre')
      } finally {
        setSaving(false)
      }
    },
    [isOwnProfile],
  )

  return {
    isOwnProfile,
    saving,
    saveName,
    displayPhone: formatPhoneForDisplay(me.phone),
    me,
  }
}
