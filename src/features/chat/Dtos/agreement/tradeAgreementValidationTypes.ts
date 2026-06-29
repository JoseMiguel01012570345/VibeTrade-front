import type { MerchandiseLine } from "./tradeAgreementTypes";

/** Errores por clave de campo plana o por índice de línea de mercancía. */
export type TradeAgreementFormErrors = {
  title?: string;
  /** Alcance global: al menos mercancías o servicio; mercancías vacías con el flag activo. */
  scope?: string;
  merchandiseLines?: Record<
    number,
    Partial<Record<keyof MerchandiseLine, string>>
  >;
  /** Al menos un servicio; errores por índice de servicio */
  serviceItems?: string;
  serviceErrors?: Record<number, string[]>;
  /** Campos adicionales (mercancía + servicio), una cadena por fila problemática */
  extraFieldsLines?: Record<number, string>;
};
