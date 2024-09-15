import fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { z } from 'zod';
import { createGoal } from '../use-cases/create-goal';
import { createGoalCompletion } from '../use-cases/create-goal-complete';
import { getWeekPendingGoals } from '../use-cases/get-week-pending-goals';

const app = fastify().withTypeProvider<ZodTypeProvider>();

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.get('/pending-goals', async () => {
  const sql = await getWeekPendingGoals();

  return sql;
});

app.post(
  '/completions',
  {
    schema: {
      body: z.object({
        goalId: z.string(),
      }),
    },
  },
  async request => {
    const { goalId } = request.body;

    await createGoalCompletion({
      goalId,
    });
  }
);

app.post(
  '/goals',
  {
    schema: {
      body: z.object({
        title: z.string().min(1).max(255),
        desiredWeeklyFrequency: z.number().int().min(1).max(7),
      }),
    },
  },
  async request => {
    const { title, desiredWeeklyFrequency } = request.body;

    await createGoal({
      title,
      desiredWeeklyFrequency,
    });
  }
);

app
  .listen({
    port: 3333,
  })
  .then(() => {
    console.log('HTTP server running');
  });
