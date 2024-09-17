import dayjs from 'dayjs';
import { and, count, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db';
import { goals, goalsCompletions } from '../db/schema';

interface CreateGoalCompletionRequest {
  goalId: string;
}

export async function createGoalCompletion({
  goalId,
}: CreateGoalCompletionRequest) {
  const firstDayWeek = dayjs().startOf('week').toDate();
  const lastDayWeek = dayjs().endOf('week').toDate();

  const goalsCompletionCounts = db.$with('goal_completion_count').as(
    db
      .select({
        goalId: goalsCompletions.goalId,
        completionCount: count(goalsCompletions.id).as('completionCount'),
      })
      .from(goalsCompletions)
      .where(
        //todas as metas onde a data de criação for ">= primeiro dia da semana" ou "<= último dia da semana"
        and(
          gte(goalsCompletions.createdAt, firstDayWeek),
          lte(goalsCompletions.createdAt, lastDayWeek),
          eq(goalsCompletions.goalId, goalId)
        )
      )
      .groupBy(goalsCompletions.goalId)
  );

  const result = await db
    .with(goalsCompletionCounts)
    .select({
      desiredWeeklyFrequency: goals.desiredWeeklyFrequency,
      completionCount:
        sql /*sql*/`COALESCE(${goalsCompletionCounts.completionCount}, 0)`.mapWith(
          Number
        ), //[COALESCE]Como se fosse um IF(Ex: no SLQServer seria ISNULL(column, 0))
    })
    .from(goals)
    .leftJoin(goalsCompletionCounts, eq(goalsCompletionCounts.goalId, goals.id))
    .where(eq(goals.id, goalId))
    .limit(1);

  const { completionCount, desiredWeeklyFrequency } = result[0];
  console.log({ completionCount, desiredWeeklyFrequency });

  if (completionCount >= desiredWeeklyFrequency) {
    throw new Error('Goal already completed this week');
  }

  const insertResult = await db
    .insert(goalsCompletions)
    .values({ goalId })
    .returning();

  const goalCompletion = insertResult[0];

  return {
    goalCompletion,
  };
}
