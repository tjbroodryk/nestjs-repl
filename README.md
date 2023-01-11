<h1 align="center"></h1>

<div align="center">
  <a href="http://nestjs.com/" target="_blank">
    <img src="https://nestjs.com/img/logo_text.svg" width="150" alt="Nest Logo" />
  </a>
</div>

<h3 align="center">NestJS REPL Module</h3>

<div align="center">
  <a href="https://nestjs.com" target="_blank">
    <img src="https://img.shields.io/badge/built%20with-NestJs-red.svg" alt="Built with NestJS">
  </a>
</div>

Type Safe, REPL module for a NestJS application enabling you to create REPL commands in a consistent way.

Uses [zod](https://github.com/colinhacks/zod) object defintions to create typesafe command args, with automatic validation.

Features a built in `help` command which can be used to list all commands like so `> .help` or used to describe the args for a specific command, like so `> .help foo`.

## Installation

```bash
npm i nestjs-repl
```

## Example

1. Register in `app.module`

```typescript
import { ReplModule } from 'nestjs-repl';

@Module({
  imports: [ReplModule],
})
export class AppModule {}
```

2. Wire-up to your repl entrypoint

```typescript
export async function bootstrapRepl() {
  const repl = await import('repl');

  const app = await NestFactory.createApplicationContext(AppModule, {
    abortOnError: false,
    logger: new ReplLogger(),
  });

  await app.init();

  const replServer = repl.start({
    prompt: color(`> `),
    ignoreUndefined: true,
    preview: false,
  });

  replServer.setupHistory('.repl-history', (err, _repl) => {
    if (err) {
      console.error('error initializing history');
      console.error(inspect(err));
      throw err;
    }
  });

  /**
   * >>>>>>>> THIS BIT
   */
  app.get(ReplModule).setup(replServer);

  return replServer;
}
```

2. Register your command

```typescript
import { ReplCommand } from 'nestjs-repl';
import { z } from 'zod';

const schema = z.object({
  id: z.string().uuid(),
});

@ReplCommand('foo')
export class TestCommand {
  async execute(args: z.infer<typeof schema>) {
    //do stuff
  }
}
```

Usage

```bash
> help('foo')

foo: {
  args: {
    id: { type: string, format: 'uuid', required: true }
  }
}

> await foo({ id: "'62f60dc1-230f-4be0-b85e-cb7245f77f4b" })
```

## TODO

- Potentially wire-up `inquirerjs` to build args via a prompt?
- Allow middlewares to only be applied to commands matching a pattern?
