declare class MapExpander {
  expandMap(currentMap: Object, pathString: string, mapValue: Object): Object;
  getMapValue(currentMap: Object, pathString: string): Object;
}

declare class Response {
  constructor(body: Object, statusCode: number, headers: Object): void;
}

declare class ApiFactory {
  constructor(options: object, overrideLogger: object);


  setAuthorizer(authorizerFunc: any): void;
  SetAuthorizer(authorizerFunc: any): void;

  onEvent(onEventFunc: any): void;

  onSchedule(onScheduleFunc: any): void;

  head(route: string, p0: Function, p1: Function): void;
  get(route: string, p0: Function, p1: Function): void;
  post(route: string, p0: Function, p1: Function): void;
  put(route: string, p0: Function, p1: Function): void;
  patch(route: string, p0: Function, p1: Function): void;
  delete(route: string, p0: Function, p1: Function): void;
  options(route: string, p0: Function, p1: Function): void;
  any(route: string, p0: Function, p1: Function): void;

  method(verb: string, route: string, p0: Function, p1: Function): void;

  async handler(event: Object, context: Object): Response;
}
