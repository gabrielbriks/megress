import dayjs from 'dayjs';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db';
import { goals, goalsCompletions } from '../db/schema';

export async function getWeekSummary() {
  /* Utilizar a abordagem de agregação para montar a busca
    Retornar dados para a barra de progresso
    Retornar o resumo da semana
  */

  const firstDayWeek = dayjs().startOf('week').toDate();
  const lastDayWeek = dayjs().endOf('week').toDate();

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

  const goalsCompletionInWeek = db.$with('goal_completion_in_week').as(
    db
      .select({
        id: goalsCompletions.id,
        title: goals.title,
        completedAt: goalsCompletions.createdAt,
        completedAtDate: sql /*sql*/`
          DATE(${goalsCompletions.createdAt}) --Matem somente a Data(remove time)
        `.as('completedAtDate'),
      })
      .from(goalsCompletions)
      .innerJoin(goals, eq(goals.id, goalsCompletions.goalId))
      .where(
        and(
          gte(goalsCompletions.createdAt, firstDayWeek),
          lte(goalsCompletions.createdAt, lastDayWeek)
        )
      )
  );

  const goalsCompletedByWeekDay = db.$with('goals_completed_by_week_day').as(
    db
      .select({
        completedDate: goalsCompletionInWeek.completedAtDate,
        completions: sql /*sql*/`
            --Montando agregação em formato JSON
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id',${goalsCompletionInWeek.id},
                'title', ${goalsCompletionInWeek.title},
                'completedAt', ${goalsCompletionInWeek.completedAt}
              )
            )
          `.as('completions'),
      })
      .from(goalsCompletionInWeek)
      .groupBy(goalsCompletionInWeek.completedAtDate)
  );

  const result = await db
    .with(goalsCreatedUpToWeek, goalsCompletionInWeek, goalsCompletedByWeekDay)
    .select({
      completed: sql /*sql*/`
        (SELECT COUNT(*) FROM ${goalsCompletionInWeek})
      `.mapWith(Number),
      total: sql /*sql*/`
       (SELECT SUM(${goalsCreatedUpToWeek.desiredWeeklyFrequency}) FROM ${goalsCreatedUpToWeek})
     `.mapWith(Number),
      goalsPerDay: sql /*sql*/`
      JSON_OBJECT_AGG(
        ${goalsCompletedByWeekDay.completedDate},
        ${goalsCompletedByWeekDay.completions}
      )
     `,
    })
    .from(goalsCompletedByWeekDay);

  return {
    summary: result,
  };
}
