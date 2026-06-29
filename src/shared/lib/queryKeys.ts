/** Claves centralizadas para React Query e invalidación cruzada. */
export const queryKeys = {
  catalogCategories: ['catalog-categories'] as const,
  currencies: ['currencies'] as const,
  signInCountries: ['sign-in-countries'] as const,
  publicOfferCard: (offerId: string) =>
    ['public-offer-card', offerId.trim()] as const,
  paymentGatewayConfig: ['payment-gateway-config'] as const,
  savedCards: ['saved-cards'] as const,
  contacts: ['contacts'] as const,
  trustHistory: (userId: string) =>
    ['trust-history', userId.trim()] as const,
  linkPreview: (url: string) => ['link-preview', url.trim()] as const,
  agreementServicePayments: (threadId: string, agreementId: string) =>
    [
      'agreement-service-payments',
      threadId.trim(),
      agreementId.trim(),
    ] as const,
  agreementMerchandisePayments: (threadId: string, agreementId: string) =>
    [
      'agreement-merchandise-payments',
      threadId.trim(),
      agreementId.trim(),
    ] as const,
  agreementRouteDeliveries: (threadId: string, agreementId: string) =>
    [
      'agreement-route-deliveries',
      threadId.trim(),
      agreementId.trim(),
    ] as const,
  carrierTelemetry: (
    threadId: string,
    agreementId: string,
    routeSheetId: string,
  ) =>
    [
      'carrier-telemetry',
      threadId.trim(),
      agreementId.trim(),
      routeSheetId.trim(),
    ] as const,
  chatThread: (threadId: string) =>
    ['chat-thread', threadId.trim()] as const,
  chatThreadMessages: (threadId: string) =>
    ['chat-thread', threadId.trim(), 'messages'] as const,
  chatThreadAgreements: (threadId: string) =>
    ['chat-thread', threadId.trim(), 'agreements'] as const,
  chatThreadRouteSheets: (threadId: string) =>
    ['chat-thread', threadId.trim(), 'route-sheets'] as const,
  chatThreadRouteTramoSubs: (threadId: string) =>
    ['chat-thread', threadId.trim(), 'route-tramo-subs'] as const,
  routeSheetPreselPreview: (threadId: string, routeSheetId: string) =>
    [
      'route-sheet-presel-preview',
      threadId.trim(),
      routeSheetId.trim(),
    ] as const,
  emergentRouteTramoSubs: (emergentOfferId: string) =>
    ['emergent-route-tramo-subs', emergentOfferId.trim()] as const,
  publishedTransportServices: (userId: string) =>
    ['published-transport-services', userId.trim()] as const,
  catalogAutocomplete: (q: string, kinds: string) =>
    ['catalog-autocomplete', q.trim(), kinds] as const,
} as const
