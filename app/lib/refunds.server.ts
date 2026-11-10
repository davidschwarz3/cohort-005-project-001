import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "~/db";
import {
  coupons,
  lessonProgress,
  lessons,
  modules,
  purchases,
  refunds,
  videoWatchEvents,
  LessonProgressStatus,
} from "~/db/schema";
import { checkRefundEligibility, type RefundEligibility } from "~/lib/refunds";

export function getLatestPurchase(userId: number, courseId: number) {
  return db
    .select()
    .from(purchases)
    .where(and(eq(purchases.userId, userId), eq(purchases.courseId, courseId)))
    .orderBy(sql`${purchases.createdAt} desc`)
    .get();
}

function getLessonIds(courseId: number): number[] {
  return db
    .select({ id: lessons.id })
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .where(eq(modules.courseId, courseId))
    .all()
    .map((row) => row.id);
}

function hasRefundRequest(purchaseId: number): boolean {
  const row = db
    .select({ id: refunds.id })
    .from(refunds)
    .where(eq(refunds.purchaseId, purchaseId))
    .get();
  return row !== undefined;
}

function isClaimedTeamSeat(purchaseId: number): boolean {
  const row = db
    .select({ id: coupons.id })
    .from(coupons)
    .where(and(eq(coupons.purchaseId, purchaseId), isNotNull(coupons.redeemedAt)))
    .get();
  return row !== undefined;
}

function getCompletedLessonCount(userId: number, lessonIds: number[]): number {
  if (lessonIds.length === 0) return 0;

  const result = db
    .select({ count: sql<number>`count(*)` })
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.userId, userId),
        eq(lessonProgress.status, LessonProgressStatus.Completed),
        inArray(lessonProgress.lessonId, lessonIds)
      )
    )
    .get();

  return result?.count ?? 0;
}

function getSecondsWatched(userId: number, lessonIds: number[]): number {
  if (lessonIds.length === 0) return 0;

  return db
    .select({ furthest: sql<number>`max(${videoWatchEvents.positionSeconds})` })
    .from(videoWatchEvents)
    .where(
      and(
        eq(videoWatchEvents.userId, userId),
        inArray(videoWatchEvents.lessonId, lessonIds)
      )
    )
    .groupBy(videoWatchEvents.lessonId)
    .all()
    .reduce((total, row) => total + row.furthest, 0);
}

/**
 * Whether the Learner may raise a Refund Request for their latest Purchase of
 * the course, together with that Purchase when there is one.
 */
export function getRefundEligibility(userId: number, courseId: number) {
  const purchase = getLatestPurchase(userId, courseId);
  const lessonIds = getLessonIds(courseId);

  const eligibility: RefundEligibility = checkRefundEligibility({
    purchase: purchase ?? null,
    hasRefundRequest: purchase ? hasRefundRequest(purchase.id) : false,
    isClaimedTeamSeat: purchase ? isClaimedTeamSeat(purchase.id) : false,
    secondsWatched: getSecondsWatched(userId, lessonIds),
    completedLessonCount: getCompletedLessonCount(userId, lessonIds),
    lessonCount: lessonIds.length,
    now: new Date(),
  });

  return { purchase, eligibility };
}
