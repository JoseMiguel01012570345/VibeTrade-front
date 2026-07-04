/** Campos de texto donde puede aparecer un importe (servicios no tienen `price` dedicado). */
export type ServicePriceSource = {
  nombreServicio: string;
  descripcion: string;
  incluye: string;
  noIncluye: string;
  entregables: string;
  garantias?: { texto: string };
  propIntelectual: string;
  customFields?: { body: string }[];
};
