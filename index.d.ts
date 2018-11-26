declare class Response {
  constructor(body: object, statusCode: number, headers: object): void;
}

declare interface ApiFactoryOptions {
  requestMiddleware: Function,
  responseMiddleware: Function,
  errorMiddleware: Function
}

declare interface ILogger {
  log(...args: any[]): void;
  trace(...args: any[]): void;
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
  fatal(...args: any[]): void;
}

declare function AuthorizerFunc(event: object): boolean {}
declare function OnEventFunc(event: object, context?: object): any {}
declare function OnScheduleFunc(event: object, context?: object): any {}

declare class ApiFactory {
  constructor(options: ApiFactoryOptions, overrideLogger?: ILogger);

  setAuthorizer(authorizerFunc: AuthorizerFunc): void;

  onEvent(onEventFunc: OnEventFunc): void;

  onSchedule(onScheduleFunc: Function): void;

  head(route: string, p0: Function|object): void;
  head(route: string, p0: object, p1: Function): void;

  get(route: string, p0: Function): void;
  get(route: string, p0: object, p1: Function): void;

  post(route: string, p0: Function): void;
  post(route: string, p0: object, p1: Function): void;

  put(route: string, p0: Function): void;
  put(route: string, p0: object, p1: Function): void;

  patch(route: string, p0: Function): void;
  patch(route: string, p0: object, p1: Function): void;

  delete(route: string, p0: Function): void;
  delete(route: string, p0: object, p1: Function): void;

  options(route: string, p0: Function): void;
  options(route: string, p0: object, p1: Function): void;

  any(route: string, p0: Function): void;
  any(route: string, p0: object, p1: Function): void;

  async handler(event: object, context: object): Response;
}
