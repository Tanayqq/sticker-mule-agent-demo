/**
 * Simulated/mock data store representing typical Sticker Mule operational data.
 * All records here are strictly deterministic test fixtures for portfolio demonstration.
 */

export interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  size: string;
  unitPrice: number;
}

export interface OrderRecord {
  orderId: string;
  customerEmail: string;
  customerName: string;
  orderDate: string;
  status: "proof_review" | "in_production" | "shipped" | "delivered";
  total: number;
  items: OrderItem[];
  shippingAddress: string;
}

export interface ProductionTrackingRecord {
  orderId: string;
  currentStage: "artwork_setup" | "proof_approval" | "printing" | "die_cutting" | "packaging" | "carrier_transit";
  proofApproved: boolean;
  estimatedShipDate: string;
  trackingNumber?: string;
  carrier?: string;
  notes: string;
}

export const MOCK_ORDERS: Record<string, OrderRecord> = {
  "SM-84920": {
    orderId: "SM-84920",
    customerEmail: "alex@example.com",
    customerName: "Alex Rivera",
    orderDate: "2026-03-28",
    status: "in_production",
    total: 89.0,
    items: [
      {
        sku: "DC-STICKER-3X3",
        name: "Custom Die-Cut Vinyl Stickers",
        quantity: 100,
        size: '3" x 3"',
        unitPrice: 0.89,
      },
    ],
    shippingAddress: "742 Evergreen Terrace, Springfield, OR",
  },
  "SM-91204": {
    orderId: "SM-91204",
    customerEmail: "jane@example.com",
    customerName: "Jane Doe",
    orderDate: "2026-04-01",
    status: "proof_review",
    total: 145.0,
    items: [
      {
        sku: "POLY-MAILER-10X13",
        name: "Custom Poly Mailers",
        quantity: 50,
        size: '10" x 13"',
        unitPrice: 2.1,
      },
      {
        sku: "KRAFT-TAPE-2IN",
        name: "Custom Packaging Tape",
        quantity: 2,
        size: '300 ft roll',
        unitPrice: 20.0,
      },
    ],
    shippingAddress: "100 Main St, Austin, TX",
  },
};

export const MOCK_PRODUCTION_STATUSES: Record<string, ProductionTrackingRecord> = {
  "SM-84920": {
    orderId: "SM-84920",
    currentStage: "die_cutting",
    proofApproved: true,
    estimatedShipDate: "2026-04-03",
    carrier: "UPS Ground",
    notes: "Printing complete. Currently undergoing precision laser die-cutting in factory line B.",
  },
  "SM-91204": {
    orderId: "SM-91204",
    currentStage: "proof_approval",
    proofApproved: false,
    estimatedShipDate: "Pending proof approval",
    notes: "Digital proof generated and awaiting customer approval via email link.",
  },
};
