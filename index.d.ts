export namespace OpenApi {
  export interface ApiOptions {
      requestMiddleware?: ((event: object, context: object) => Promise<unknown>) | (() => unknown) | undefined;
      responseMiddleware?: ((request: object, context: object) => Promise<unknown>) | (() => unknown) | undefined;
      errorMiddleware?: ((event: object, error: object) => Promise<unknown>) | (() => unknown) | undefined;
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

export default class OpenApi {
  constructor(options: OpenApi.ApiOptions, overrideLogger?: () => void);

  setAuthorizer(authorizerFunc: (req?: unknown) => Promise<unknown>): void;
  onEvent(onEventFunc: (req?: unknown) => Promise<unknown>): void;
  onSchedule(onScheduleFunc: (req?: unknown) => Promise<unknown>): void;

  /**
   * @returns The the Path map { [path]: { [method]: {metadata} } } for discovery usage.
   */
  getPathMap(): Record<string, Record<string, unknown>>;

  /**
   * @returns The matched route based on the method and the specified path.
   */
  resolveRoute(method: string, path: string): string;

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
