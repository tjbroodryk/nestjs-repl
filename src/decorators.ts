import { Injectable, SetMetadata } from '@nestjs/common';
import { Constructor } from 'type-fest';
import {
  ReplCommand as TReplCommand,
  ReplMiddleware as TReplMiddleware,
} from './types';
import { ZodSchema, z } from 'zod';

export const REPL_COMMAND = 'REPLModule_REPL_COMMAND';
export const REPL_MIDDLEWARE = 'REPLModule_REPL_MIDDLEWARE';

export const ReplCommand = <T extends ZodSchema<any> | never>(
  command: string,
  args?: T,
  description?: string,
) => {
  return (target: Constructor<TReplCommand<T>>) => {
    SetMetadata(REPL_COMMAND, { command, args, description })(target);
    Injectable()(target);
  };
};

export const ReplMiddleware = () => {
  return (target: Constructor<TReplMiddleware>) => {
    SetMetadata(REPL_MIDDLEWARE, {})(target);
    Injectable()(target);
  };
};
