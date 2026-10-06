/** An order as the checkout produces it (same shape the design builds in place()). */
export interface PlacedOrder {
  id: string;
  ref: string;
  status: "new";
  at: number;
  eta: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  pay: "cash" | "card";
  lines: { qty: number; name: string }[];
  total: number;
}

/**
 * Seam for the future backend (Phase 7). Checkout submits orders only through this.
 * The remote implementation will send the order to the server (which re-prices it)
 * and return the confirmed reference.
 */
export interface OrderService {
  submit(order: PlacedOrder): Promise<void>;
}

/** What the design does today: the order exists only in the browser. Nothing is sent. */
export class LocalOrderService implements OrderService {
  async submit(): Promise<void> {}
}

let service: OrderService = new LocalOrderService();

export function getOrderService(): OrderService {
  return service;
}

/** For tests and, later, wiring the remote implementation. */
export function setOrderService(next: OrderService) {
  service = next;
}
