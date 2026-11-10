import { describe, it, expect } from "vitest";
import { RefundStatus } from "~/db/schema";
import {
  REFUND_WINDOW_DAYS,
  buildRefundRequestedEmail,
  checkRefundEligibility,
  refundStatusLabel,
  type RefundFacts,
} from "./refunds";

// A Purchase made at 23:00 on 1 March, which is eligible on 5 March unless a
// test changes one fact.
const PURCHASED_AT = new Date(2026, 2, 1, 23, 0).toISOString();

function facts(overrides: Partial<RefundFacts> = {}): RefundFacts {
  return {
    purchase: {
      createdAt: PURCHASED_AT,
      amountPaid: 7900,
    },
    hasRefundRequest: false,
    isClaimedTeamSeat: false,
    secondsWatched: 0,
    completedLessonCount: 0,
    lessonCount: 10,
    now: new Date(2026, 2, 5, 12, 0),
    ...overrides,
  };
}

describe("checkRefundEligibility", () => {
  it("offers the amount the Learner paid, and the last day of the Refund Window", () => {
    expect(checkRefundEligibility(facts())).toEqual({
      eligible: true,
      amount: 7900,
      lastDayOfWindow: "2026-03-15",
    });
  });

  it("refunds the amount paid even when it differs from the course's list price", () => {
    // A Refund never pays back the list price: only what the Learner paid.
    const result = checkRefundEligibility(
      facts({ purchase: { createdAt: PURCHASED_AT, amountPaid: 3950 } })
    );
    expect(result).toMatchObject({ eligible: true, amount: 3950 });
  });

  it("refuses without a Purchase", () => {
    expect(checkRefundEligibility(facts({ purchase: null }))).toMatchObject({
      eligible: false,
      reason: "no-purchase",
    });
  });

  it("refuses once the Purchase has any Refund Request, so a decline is final", () => {
    expect(
      checkRefundEligibility(facts({ hasRefundRequest: true }))
    ).toMatchObject({ eligible: false, reason: "already-requested" });
  });

  describe("the Refund Window", () => {
    it(`includes the whole ${REFUND_WINDOW_DAYS}th calendar day after the purchase day`, () => {
      expect(
        checkRefundEligibility(facts({ now: new Date(2026, 2, 15, 23, 59) }))
      ).toMatchObject({ eligible: true });
    });

    it("closes the day after", () => {
      expect(
        checkRefundEligibility(facts({ now: new Date(2026, 2, 16, 0, 1) }))
      ).toMatchObject({ eligible: false, reason: "window-closed" });
    });

    it("does not open before the purchase day", () => {
      expect(
        checkRefundEligibility(facts({ now: new Date(2026, 1, 28, 12, 0) }))
      ).toMatchObject({ eligible: false, reason: "window-closed" });
    });
  });

  it("refuses once the Learner has watched 2 hours of the course", () => {
    expect(checkRefundEligibility(facts({ secondsWatched: 2 * 60 * 60 - 1 })))
      .toMatchObject({ eligible: true });
    expect(checkRefundEligibility(facts({ secondsWatched: 2 * 60 * 60 })))
      .toMatchObject({ eligible: false, reason: "watched-too-much" });
  });

  it("refuses once the Learner has completed half the lessons", () => {
    expect(checkRefundEligibility(facts({ completedLessonCount: 4 })))
      .toMatchObject({ eligible: true });
    expect(checkRefundEligibility(facts({ completedLessonCount: 5 })))
      .toMatchObject({ eligible: false, reason: "completed-too-much" });
  });

  it("ignores the completion rule for a course with no lessons", () => {
    expect(
      checkRefundEligibility(facts({ lessonCount: 0, completedLessonCount: 0 }))
    ).toMatchObject({ eligible: true });
  });

  it("refuses a claimed team-licence seat", () => {
    expect(
      checkRefundEligibility(facts({ isClaimedTeamSeat: true }))
    ).toMatchObject({ eligible: false, reason: "claimed-team-seat" });
  });
});

describe("refundStatusLabel", () => {
  it("names each state of a Refund Request the one way Learners see it", () => {
    expect(refundStatusLabel(RefundStatus.Requested)).toBe("Refund requested");
    expect(refundStatusLabel(RefundStatus.Approved)).toBe("Refund approved");
    expect(refundStatusLabel(RefundStatus.Declined)).toBe("Refund declined");
  });
});

describe("buildRefundRequestedEmail", () => {
  const email = buildRefundRequestedEmail({
    learnerName: "Liam",
    learnerEmail: "liam@example.com",
    courseTitle: "Introduction to TypeScript",
    amount: 7900,
  });

  it("confirms the Refund Request in the glossary's words", () => {
    expect(email.to).toBe("liam@example.com");
    expect(email.subject).toBe("Refund requested — Introduction to TypeScript");
    expect(email.body).toContain("$79.00");
  });

  it("uses none of the words the glossary rules out", () => {
    const text = `${email.subject}\n${email.body}`;
    for (const word of [/reversal/i, /chargeback/i, /cancel/i, /our team/i, /\bdone\b/i]) {
      expect(text).not.toMatch(word);
    }
  });
});
