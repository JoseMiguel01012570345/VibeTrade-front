export type MergePersistedChatMessagesOptions = {
  /**
   * IDs de `trade_agreements` que siguen existiendo (p. ej. GET /trade-agreements).
   * Si un mensaje local `agreement` referencia un id que no está aquí, se descarta (p. ej. acuerdo eliminado en servidor).
   */
  validTradeAgreementIds?: ReadonlySet<string>;
};
