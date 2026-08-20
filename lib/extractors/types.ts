export interface ExtractedShipment {
  orderNumber?: string;
  recipientName: string;
  recipientPhone?: string;
  addressLine: string;
  addressExtra?: string;
  city: string;
  province: string;
  postalCode?: string;
  products?: string;
  notes?: string;
  source: "TIENDANUBE" | "REMITO" | "MANUAL";
}
