export type UserContact = {
  userId: string
  displayName: string
  phoneDisplay: string | null
  phoneDigits: string | null
  /** ISO 8601 — cuándo se añadió el contacto (API actual). */
  createdAt?: string
}

/** Resuelve un usuario registrado por teléfono sin añadirlo a la agenda. */
export type PlatformUserByPhone = {
  userId: string
  displayName: string
  phoneDisplay: string | null
  phoneDigits: string | null
}
