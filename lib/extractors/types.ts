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
  /** Fecha real de la venta/compra, extraída del PDF si está disponible */
  saleDate?: Date;
  source: "TIENDANUBE" | "REMITO" | "MANUAL";
}
