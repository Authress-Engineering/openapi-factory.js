export namespace OpenApi {
  export interface ApiOptions {
      requestMiddleware?: (() => unknown) | undefined;
      responseMiddleware?: (() => unknown) | undefined;
      errorMiddleware?: (() => unknown) | undefined;
  }

  export interface HttpMethodOptions {
      rawBody?: boolean | undefined;
  }

  export interface HttpResponse {
      statusCode?: number | undefined;
      headers?: object | undefined;
      body?: (object | string) | undefined;
  }
}

export class OpenApi {
  constructor(options: OpenApi.ApiOptions, overrideLogger?: () => void);

  setAuthorizer(authorizerFunc: (req?: unknown) => Promise<unknown>): void;
  onEvent(onEventFunc: (req?: unknown) => Promise<unknown>): void;
  onSchedule(onScheduleFunc: (req?: unknown) => Promise<unknown>): void;

  head(route: string, handler: (req?: object) => (OpenApi.HttpResponse | Promise<OpenApi.HttpResponse>)): void;
  head(route: string, options: OpenApi.HttpMethodOptions, handler: (req?: object) => (OpenApi.HttpResponse | Promise<OpenApi.HttpResponse>)): void;

  get(route: string, handler: (req?: object) => (OpenApi.HttpResponse | Promise<OpenApi.HttpResponse>)): void;
  get(route: string, options: OpenApi.HttpMethodOptions, handler: (req?: object) => (OpenApi.HttpResponse | Promise<OpenApi.HttpResponse>)): void;

  post(route: string, handler: (req?: object) => (OpenApi.HttpResponse | Promise<OpenApi.HttpResponse>)): void;
  post(route: string, options: OpenApi.HttpMethodOptions, handler: (req?: object) => (OpenApi.HttpResponse | Promise<OpenApi.HttpResponse>)): void;

  put(route: string, handler: (req?: object) => (OpenApi.HttpResponse | Promise<OpenApi.HttpResponse>)): void;
  put(route: string, options: OpenApi.HttpMethodOptions, handler: (req?: object) => (OpenApi.HttpResponse | Promise<OpenApi.HttpResponse>)): void;

  patch(route: string, handler: (req?: object) => (OpenApi.HttpResponse | Promise<OpenApi.HttpResponse>)): void;
  patch(route: string, options: OpenApi.HttpMethodOptions, handler: (req?: object) => (OpenApi.HttpResponse | Promise<OpenApi.HttpResponse>)): void;

  query(route: string, handler: (req?: object) => (OpenApi.HttpResponse | Promise<OpenApi.HttpResponse>)): void;
  query(route: string, options: OpenApi.HttpMethodOptions, handler: (req?: object) => (OpenApi.HttpResponse | Promise<OpenApi.HttpResponse>)): void;

  delete(route: string, handler: (req?: object) => (OpenApi.HttpResponse | Promise<OpenApi.HttpResponse>)): void;
  delete(route: string, options: OpenApi.HttpMethodOptions, handler: (req?: object) => (OpenApi.HttpResponse | Promise<OpenApi.HttpResponse>)): void;

  options(route: string, handler: (req?: object) => (OpenApi.HttpResponse | Promise<OpenApi.HttpResponse>)): void;
  options(route: string, options: OpenApi.HttpMethodOptions, handler: (req?: object) => (OpenApi.HttpResponse | Promise<OpenApi.HttpResponse>)): void;

  any(route: string, handler: (req?: object) => (OpenApi.HttpResponse | Promise<OpenApi.HttpResponse>)): void;
  any(route: string, options: OpenApi.HttpMethodOptions, handler: (req?: object) => (OpenApi.HttpResponse | Promise<OpenApi.HttpResponse>)): void;

  handler(event: object, context: object): Promise<unknown>;
}
