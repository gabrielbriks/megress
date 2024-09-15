import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import { and, count, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db';
import { goals, goalsCompletions } from '../db/schema';

dayjs.extend(weekOfYear);

export async function getWeekPendingGoals() {
  const firstDayWeek = dayjs().startOf('week').toDate();
  const lastDayWeek = dayjs().endOf('week').toDate();
  // const currentWeek = dayjs().week();

  //Todas as metas criadas até a semana atual
  const goalsCreatedUpToWeek = db.$with('goals_created_up_to_week').as(
    db
      .select({
        id: goals.id,
        title: goals.title,
        desiredWeeklyFrequency: goals.desiredWeeklyFrequency,
        createdAt: goals.createdAt,
      })
      .from(goals)
      .where(
        //Selecionar todas as metas cuja a data de criação for menor ou igual ao último dia da semana atual
        lte(goals.createdAt, lastDayWeek)
      )
  );

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
          lte(goalsCompletions.createdAt, lastDayWeek)
        )
      )
      .groupBy(goalsCompletions.goalId)
  );

  //Query que irá utilizar as CTEs acima. Por isso utilizado "with()" ao invés do "$with"
  const pendingGoals = await db
    .with(goalsCreatedUpToWeek, goalsCompletionCounts)
    .select({
      id: goalsCreatedUpToWeek.id,
      title: goalsCreatedUpToWeek.title,
      desiredWeeklyFrequency: goalsCreatedUpToWeek.desiredWeeklyFrequency,
      completionCount:
        sql /*sql*/`COALESCE(${goalsCompletionCounts.completionCount}, 0)`.mapWith(
          Number
        ), //[COALESCE]Como se fosse um IF(Ex: no SLQServer seria ISNULL(column, 0))
    })
    .from(goalsCreatedUpToWeek)
    .leftJoin(
      goalsCompletionCounts,
      eq(goalsCompletionCounts.goalId, goalsCreatedUpToWeek.id)
    );

  return { pendingGoals };
}
