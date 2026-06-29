export type SavedCard = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  country?: string | null;
};
