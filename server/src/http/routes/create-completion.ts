import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { createGoalCompletion } from '../../use-cases/create-goal-complete';

export const createCompletionRoute: FastifyPluginAsyncZod = async app => {
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
};
