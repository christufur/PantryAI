/** Shared shape for pantry rows passed from the server into client views. */
export type PlainItem = {
  id: number;
  name: string;
  category: string;
  qty: number;
  unit: string;
  storageLocation: string;
  expiryDate: number; // unix seconds
  isLocal: boolean;
  localSwap?: { localProducer: string; product: string; whereToBuy: string } | null;
};
