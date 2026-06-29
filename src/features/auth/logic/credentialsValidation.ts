/** Letras Unicode, dígitos y `_`; alineado con `AuthUtils.IsValidUsername` en backend. */
export const USERNAME_PATTERN = /^[\p{L}\p{N}_]{3,32}$/u

const USERNAME_INPUT_FILTER = /[^\p{L}\p{N}_]/gu

export function sanitizeUsernameInput(value: string): string {
  return value.replace(USERNAME_INPUT_FILTER, "").slice(0, 32)
}

export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value)
}

export function isValidPassword(value: string): boolean {
  return value.length >= 8
}

export function isValidEmail(value: string): boolean {
  const v = value.trim()
  return v.length >= 5 && v.includes('@')
}
