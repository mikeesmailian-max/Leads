export type EquipmentTypeGuess = "DRY_VAN" | "REEFER" | "FLATBED" | "OTHER";

export interface FieldGuess<T> {
  value: T | null;
  confidence: number; // 0..1
}

export interface ExtractedContact {
  name: string | null;
  title: string | null;
  phone: string | null;
  email: string | null;
}

export interface ParsedDocumentFields {
  broker: FieldGuess<string>;
  shipper: FieldGuess<string>;
  consignee: FieldGuess<string>;

  pickupAddress: FieldGuess<string>;
  pickupCity: FieldGuess<string>;
  pickupState: FieldGuess<string>;
  pickupZip: FieldGuess<string>;
  pickupDate: FieldGuess<string>; // ISO date string
  pickupTime: FieldGuess<string>;

  deliveryAddress: FieldGuess<string>;
  deliveryCity: FieldGuess<string>;
  deliveryState: FieldGuess<string>;
  deliveryZip: FieldGuess<string>;
  deliveryDate: FieldGuess<string>;
  deliveryTime: FieldGuess<string>;

  commodity: FieldGuess<string>;
  equipmentType: FieldGuess<EquipmentTypeGuess>;
  linehaulAmount: FieldGuess<number>;
  referenceNumber: FieldGuess<string>;
  loadNumber: FieldGuess<string>;
  mcNumber: FieldGuess<string>;
  dotNumber: FieldGuess<string>;

  contacts: ExtractedContact[];
  phones: string[];
  emails: string[];
}

export interface ParsedDocumentResult {
  fields: ParsedDocumentFields;
  overallConfidence: number;
  needsReview: boolean;
}
