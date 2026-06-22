export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,32}$/

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
