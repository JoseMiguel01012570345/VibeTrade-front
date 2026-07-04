/** Errores por clave de campo plana o por índice de servicio del acuerdo. */
export type TradeAgreementFormErrors = {
  title?: string;
  /** Error global del acuerdo (p. ej. moneda única, falta de servicios en catálogo). */
  scope?: string;
  /** Al menos un servicio; errores por índice de servicio */
  serviceItems?: string;
  serviceErrors?: Record<number, string[]>;
  /** Campos adicionales (servicio), una cadena por fila problemática */
  extraFieldsLines?: Record<number, string>;
};
