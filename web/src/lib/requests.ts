export type RequestStatus = "open" | "accepted" | "on_the_way" | "delivered" | "cancelled";

export type BoardItem = {
  /** Public order code, e.g. UM-7K3F9Q. */
  code: string;
  details: string;
  pickup: string;
  dropoff: string;
  tipSen: number;
  status: RequestStatus;
  createdAt: string;
  customer: { username: string; name: string };
};

export type RequestDetail = BoardItem & {
  acceptedAt: string | null;
  deliveredAt: string | null;
  runner: { username: string; name: string } | null;
  viewerRole: "customer" | "runner" | null;
  canAccept: boolean;
  canRate: boolean;
  /** The other side's WhatsApp number, only after a match. */
  contact: string | null;
};

export type MyRequest = Omit<BoardItem, "customer"> & { mine: "customer" | "runner" };
