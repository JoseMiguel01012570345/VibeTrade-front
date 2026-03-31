export type Country = {
  name: string
  code: string
  dial: string
  flag: string
}

export const COUNTRIES: Country[] = [
  { name: 'Argentina', code: 'AR', dial: '+54', flag: '🇦🇷' },
  { name: 'Colombia', code: 'CO', dial: '+57', flag: '🇨🇴' },
  { name: 'España', code: 'ES', dial: '+34', flag: '🇪🇸' },
  { name: 'México', code: 'MX', dial: '+52', flag: '🇲🇽' },
  { name: 'Chile', code: 'CL', dial: '+56', flag: '🇨🇱' },
  { name: 'Perú', code: 'PE', dial: '+51', flag: '🇵🇪' },
  { name: 'Estados Unidos', code: 'US', dial: '+1', flag: '🇺🇸' },
]

