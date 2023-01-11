import { DiscoveryModule, DiscoveryService } from '@golevelup/nestjs-discovery';
import { createConfigurableDynamicRootModule } from '@golevelup/nestjs-modules';
import { Module, OnModuleInit } from '@nestjs/common';
import { REPLServer } from 'repl';
import { REPL_COMMAND, REPL_MIDDLEWARE } from './decorators';
import { ZodSchema } from 'zod';
import zodToJsonSchema from 'zod-to-json-schema';
import { ReplCommand, ReplMiddleware } from './types';

export type ReplCommandMeta = {
  command: string;
  args?: ZodSchema<any>;
  description?: string;
};

type Schema = Record<
  string,
  { required: boolean; default: unknown; type: string }
>;

@Module({
  imports: [DiscoveryModule],
})
export class ReplModule
  extends createConfigurableDynamicRootModule<ReplModule, {}>('')
  implements OnModuleInit
{
  private readonly commands: Record<
    string,
    {
      command: ReplCommand<any>['execute'];
      schema?: Schema;
      description?: string;
    }
  > = {};

  constructor(private readonly discover: DiscoveryService) {
    super();
  }

  async onModuleInit() {
    const providers =
      await this.discover.providersWithMetaAtKey<ReplCommandMeta>(REPL_COMMAND);
    const middleWareProviders = await this.discover.providersWithMetaAtKey(
      REPL_MIDDLEWARE,
    );

    const middlewares = middleWareProviders.map(
      (provider) => provider.discoveredClass.instance as ReplMiddleware,
    );

    for (const provider of providers) {
      const instance = provider.discoveredClass.instance as ReplCommand<any>;
      const meta = provider.meta;

      this.commands[meta.command] = {
        command: async (args, replServer) => {
          await Promise.all(
            middlewares
              .filter((m) => m.before)
              .map((m) => m.before!(replServer)),
          );
          await instance.execute.bind(instance)(
            meta.args?.parse(args),
            replServer,
          );
          await Promise.all(
            middlewares.filter((m) => m.after).map((m) => m.after!(replServer)),
          );
        },
        schema: meta.args && createSchena(meta.args),
        description: meta.description,
      };
    }
  }

  setup(replServer: REPLServer) {
    for (const key in this.commands) {
      replServer.context[key] = (args: any) =>
        this.commands[key]!.command(args, replServer);
    }
    replServer.context['help'] = (command?: string) => {
      replServer.clearBufferedCommand();
      if (command) {
        this.logCommand(command);
      } else {
        Object.keys(this.commands).map((command) => this.logCommand(command));
      }
      replServer.displayPrompt();
    };

    replServer.defineCommand('help', replServer.context['help']);
  }

  private logCommand(command: string) {
    const replCommand = this.commands[command];
    if (replCommand) {
      const output = {
        args: replCommand.schema ?? 'None',
        description: replCommand.description ?? 'n/a',
      };
      console.log(`${command}:`, output);
    } else {
      console.log(`Command "${command}" does not exist`);
    }
  }
}

const createSchena = (schema: ZodSchema<any>) => {
  const jsonSchema = zodToJsonSchema(schema) as any;

  return mapObject(jsonSchema.properties, ([key, prop]) => ({
    ...(prop as any),
    required: jsonSchema.required.includes(key),
  }));
};

const mapObject = <T, K>(
  obj: Record<string, T>,
  fn: (entry: [string, T]) => K,
): Record<string, K> => {
  return Object.fromEntries(Object.entries(obj).map((x) => [x[0], fn(x)]));
};
