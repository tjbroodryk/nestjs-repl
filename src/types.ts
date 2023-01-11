import { REPLServer } from 'repl';
import { ZodSchema, z } from 'zod';

export type ReplMiddleware = {
  before?(replServer: REPLServer): Promise<any>;
  after?(replServer: REPLServer): Promise<any>;
};

export type ReplCommand<T extends ZodSchema<any>> = {
  execute(args: z.infer<T>, replServer: REPLServer): Promise<any>;
};
