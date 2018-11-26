declare module 'openapi-factory' {
  class OpenApi {
    constructor(options: OpenApi.ApiFactoryOptions, overrideLogger?: Function);

    setAuthorizer(authorizerFunc: Function): void;

    onEvent(onEventFunc: Function): void;

    onSchedule(onScheduleFunc: Function): void;

    head(route: string, p0: Function): void;
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

    handler(event: object, context: object): Promise<any>;
  }

  namespace OpenApi {
    interface ApiFactoryOptions {
      requestMiddleware?: Function,
      responseMiddleware?: Function,
      errorMiddleware?: Function
    }
  }

  export = OpenApi;
}

