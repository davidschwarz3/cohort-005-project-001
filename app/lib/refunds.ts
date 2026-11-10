import { RefundStatus } from "~/db/schema";
import { formatPrice } from "~/lib/utils";

// Refund Eligibility, as GLOSSARY.md defines it. These rules are the one copy:
// the course page and the Refund Request action both ask this module.

export const REFUND_WINDOW_DAYS = 14;
export const REFUND_WATCH_LIMIT_SECONDS = 2 * 60 * 60;
export const REFUND_COMPLETION_LIMIT = 0.5;

export type RefundFacts = {
  purchase: { createdAt: string; amountPaid: number } | null;
  /** Any Refund Request on the Purchase, whatever its state. */
  hasRefundRequest: boolean;
  isClaimedTeamSeat: boolean;
  secondsWatched: number;
  completedLessonCount: number;
  lessonCount: number;
  now: Date;
};

export type RefundIneligibleReason =
  | "no-purchase"
  | "already-requested"
  | "window-closed"
  | "watched-too-much"
  | "completed-too-much"
  | "claimed-team-seat";

export type RefundEligibility =
  | { eligible: true; amount: number; lastDayOfWindow: string }
  | { eligible: false; reason: RefundIneligibleReason };

/** What each refusal tells the Learner. */
export const REFUND_INELIGIBLE_MESSAGES: Record<RefundIneligibleReason, string> =
  {
    "no-purchase": "You have not bought this course.",
    "already-requested":
      "This purchase already has a refund request. Each purchase can have only one.",
    "window-closed": `The ${REFUND_WINDOW_DAYS}-day refund window has closed.`,
    "watched-too-much":
      "You have watched too much of this course to request a refund.",
    "completed-too-much":
      "You have completed too much of this course to request a refund.",
    "claimed-team-seat":
      "A claimed team seat cannot be refunded. The team that bought it can request a refund only while no seat is claimed.",
  };

// The Refund Window is counted in calendar days, not hours: a Purchase made at
// 23:00 still gets the whole of its fourteenth day.
function calendarDay(when: Date): string {
  const year = when.getFullYear();
  const month = String(when.getMonth() + 1).padStart(2, "0");
  const day = String(when.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function checkRefundEligibility(facts: RefundFacts): RefundEligibility {
  const { purchase } = facts;

  if (!purchase) return { eligible: false, reason: "no-purchase" };

  if (facts.hasRefundRequest) {
    return { eligible: false, reason: "already-requested" };
  }

  const purchasedAt = new Date(purchase.createdAt);
  const windowEnd = new Date(purchasedAt);
  windowEnd.setDate(windowEnd.getDate() + REFUND_WINDOW_DAYS);

  const firstDay = calendarDay(purchasedAt);
  const lastDayOfWindow = calendarDay(windowEnd);
  const today = calendarDay(facts.now);

  if (today < firstDay || today > lastDayOfWindow) {
    return { eligible: false, reason: "window-closed" };
  }

  if (facts.secondsWatched >= REFUND_WATCH_LIMIT_SECONDS) {
    return { eligible: false, reason: "watched-too-much" };
  }

  if (
    facts.lessonCount > 0 &&
    facts.completedLessonCount / facts.lessonCount >= REFUND_COMPLETION_LIMIT
  ) {
    return { eligible: false, reason: "completed-too-much" };
  }

  if (facts.isClaimedTeamSeat) {
    return { eligible: false, reason: "claimed-team-seat" };
  }

  // The Refund Amount is always what the Learner paid, never the list price.
  return { eligible: true, amount: purchase.amountPaid, lastDayOfWindow };
}

const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  [RefundStatus.Requested]: "Refund requested",
  [RefundStatus.Approved]: "Refund approved",
  [RefundStatus.Declined]: "Refund declined",
};

export function refundStatusLabel(status: RefundStatus): string {
  return REFUND_STATUS_LABELS[status];
}

/**
 * The confirmation the Learner gets in their inbox. There is no mail
 * transport wired up yet, so the built message goes to the server log.
 */
export function buildRefundRequestedEmail(input: {
  learnerName: string;
  learnerEmail: string;
  courseTitle: string;
  amount: number;
}) {
  return {
    to: input.learnerEmail,
    subject: `Refund requested — ${input.courseTitle}`,
    body: [
      `Hi ${input.learnerName},`,
      "",
      `We have your refund request for "${input.courseTitle}".`,
      `If it is approved, we will refund ${formatPrice(input.amount)}, the amount you paid, and your access to the course will end.`,
      "",
      "A Cadence admin reviews every refund request by hand. You do not need to do anything else. We will email you again once your refund is approved or declined.",
      "",
      "— Cadence",
    ].join("\n"),
  };
}
