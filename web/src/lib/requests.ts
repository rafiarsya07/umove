export type RequestStatus = "open" | "accepted" | "on_the_way" | "delivered" | "cancelled";

export type BoardItem = {
  /** Public order code, e.g. UM-7K3F9Q. */
  code: string;
  details: string;
  pickup: string;
  /** The pickup is on the admin's list of UM places. */
  listed: boolean;
  dropoff: string;
  tipSen: number;
  status: RequestStatus;
  createdAt: string;
  customer: { username: string; name: string };
};

export type RequestDetail = BoardItem & {
  acceptedAt: string | null;
  deliveredAt: string | null;
  runner: {
    username: string;
    name: string;
    /** Only for the requester once matched. */
    hasPhoto?: boolean;
    vehicle?: "walk" | "bicycle" | "motorcycle" | "car" | null;
    runs?: number;
    rating?: number | null;
    ratingCount?: number;
  } | null;
  viewerRole: "customer" | "runner" | null;
  canAccept: boolean;
  /** A runner who could take this but has no approved face photo yet. */
  needsPhoto: boolean;
  /** This runner was sent away by the requester and cannot take it again. */
  skipped: boolean;
  canRate: boolean;
  /** The runner reported that the requester didn't turn up or pay (only for those two). */
  noShow: boolean;
  /** This runner may report a no-show now. */
  canReportNoShow: boolean;
  /** Waiting for an admin check before it appears on the board (only the requester sees this). */
  held: boolean;
  /** Closed by itself because nobody took it in time. */
  expired: boolean;
  /** The requester reported that the runner never came. */
  runnerMissing: boolean;
  /** The requester may report that the runner never came. */
  canReportRunner: boolean;
  /** The other side's WhatsApp number, only after a match. */
  contact: string | null;
};

export type MyRequest = Omit<BoardItem, "customer"> & { mine: "customer" | "runner" };
