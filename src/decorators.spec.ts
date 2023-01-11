import { ReplCommand } from './decorators';
import { z } from 'zod';

const schema = z.object({
  id: z.string().uuid(),
});

describe('decorator type tests', () => {
  //@ts-expect-error
  @ReplCommand('foo', schema)
  class Test {}

  //@ts-expect-error
  @ReplCommand('foo', schema)
  class Test2 {
    async execute(args: { foo: string }) {}
  }

  it('just needs to satisfy jest', () => {});
});
