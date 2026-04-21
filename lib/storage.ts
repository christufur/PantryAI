export type StorageLocation = "fridge" | "freezer" | "pantry";

export const VALID_LOCATIONS: ReadonlySet<StorageLocation> = new Set([
  "fridge",
  "freezer",
  "pantry",
]);
