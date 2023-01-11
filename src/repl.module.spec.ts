import { ReplCommand, ReplMiddleware } from './decorators';
import { ReplModule } from './repl.module';
import { Test } from '@nestjs/testing';
import { z } from 'zod';
import { REPLServer } from 'repl';

const commandMock = jest.fn();
const beforeMock = jest.fn();
const afterMock = jest.fn();

const schema = z.object({
  id: z.string().uuid(),
});
@ReplCommand('foo', schema, 'some description')
class TestCommand {
  async execute(args: z.infer<typeof schema>) {
    commandMock(args);
  }
}

@ReplCommand('other')
class OtherCommand {
  async execute(args) {
    commandMock(args);
  }
}

@ReplMiddleware()
class BeforeMidleware {
  async before(repl: REPLServer) {
    beforeMock(repl);
  }
}

@ReplMiddleware()
class AfterMidleware {
  async after(repl: REPLServer) {
    afterMock(repl);
  }
}

describe(ReplModule.name, () => {
  let replServer: REPLServer;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ReplModule],
      providers: [TestCommand, OtherCommand, BeforeMidleware, AfterMidleware],
    }).compile();

    await module.get(ReplModule).onModuleInit();

    const repl = await import('repl');

    replServer = repl.start({
      prompt: '>',
      ignoreUndefined: true,
    });

    module.get(ReplModule).setup(replServer);
  });

  afterAll(async () => {
    replServer.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('given command', () => {
    it('should add to the repl context', () => {
      expect(replServer.context['foo']).toBeDefined();
    });

    it('should throw on invalid args', async () => {
      await expect(
        async () => await replServer.context['foo'](),
      ).rejects.toThrow();
      expect(commandMock).not.toHaveBeenCalled();
    });

    it('should run on valid args', async () => {
      expect(await replServer.context['other']({ foo: 'bar' }));
      expect(commandMock).toHaveBeenCalledWith(undefined);
    });

    describe('given command with no schema', () => {
      it('should no pass args to executor', async () => {
        const args = { id: '62f60dc1-230f-4be0-b85e-cb7245f77f4b' };
        expect(await replServer.context['foo'](args));
        expect(commandMock).toHaveBeenCalledWith(args);
      });
    });
  });

  describe('given middlewares', () => {
    it('should call before', async () => {
      await replServer.context['foo']({
        id: '62f60dc1-230f-4be0-b85e-cb7245f77f4b',
      });

      expect(beforeMock).toHaveBeenCalledWith(replServer);
    });

    it('should call after', async () => {
      await replServer.context['foo']({
        id: '62f60dc1-230f-4be0-b85e-cb7245f77f4b',
      });

      expect(afterMock).toHaveBeenCalledWith(replServer);
    });
  });

  describe('help command', () => {
    it('should register help command', () => {
      expect(replServer.context['help']).toBeDefined();
    });

    describe('given command name', () => {
      it('should print help for single command', () => {
        const logSpy = jest
          .spyOn(global.console, 'log')
          .mockImplementationOnce(() => {});

        replServer.context['help']('foo');

        expect(logSpy).toHaveBeenCalledWith('foo:', {
          args: { id: { format: 'uuid', required: true, type: 'string' } },
          description: 'some description',
        });
      });
    });

    describe('given no command name', () => {
      it('should print help for all available commands', () => {
        const logSpy = jest
          .spyOn(global.console, 'log')
          .mockImplementationOnce(() => {});

        replServer.context['help']();

        expect(logSpy).toHaveBeenCalledWith('foo:', {
          args: { id: { format: 'uuid', required: true, type: 'string' } },
          description: 'some description',
        });
        expect(logSpy).toHaveBeenCalledWith('other:', {
          args: 'None',
          description: 'n/a',
        });
      });
    });

    describe('given command does not exist', () => {
      it('should inform caller that the command does not exist', () => {
        const logSpy = jest
          .spyOn(global.console, 'log')
          .mockImplementationOnce(() => {});

        replServer.context['help']('fudge');

        expect(logSpy).toHaveBeenCalledWith('Command "fudge" does not exist');
      });
    });
  });
});
