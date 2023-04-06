/* eslint-disable @typescript-eslint/no-empty-function */
const Resp = require('./src/response');
const PathResolver = require('./src/pathResolver');
let isFunction = obj => { return !!(obj && obj.constructor && obj.call && obj.apply); };

// This class is a singleton because the standard usage dereferences the `handler` method which removes the binding to `this`
let apiFactory = null;

class ApiFactory {
  constructor(options, overrideLogger = null) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    apiFactory = this;
    this.Authorizer = null;
    this.requestMiddleware = options && options.requestMiddleware || (r => r);
    this.responseMiddleware = options && options.responseMiddleware || ((_, r) => r);
    this.errorMiddleware = options && options.errorMiddleware || ((_, e) => e);
    this.debug = options && !!options.debug;
    this.handlers = {
      onEvent() {},
      onSchedule() {}
    };
    this.Routes = {};
    this.ProxyRoutes = {};
    this.paths = {};
    this.pathResolver = options && options.pathResolver || new PathResolver();
    this.logger = overrideLogger || (message => console.log(JSON.stringify(message, null, 2)));
  }

  setAuthorizer(authorizerFunc) {
    if (!isFunction(authorizerFunc)) { throw new Error('Authorizer Function has not been defined as a function.'); }
    this.Authorizer = authorizerFunc;
  }

  SetAuthorizer(authorizerFunc) {
    this.setAuthorizer(authorizerFunc);
  }

  onEvent(onEventFunc) {
    if (!isFunction(onEventFunc)) { throw new Error('onEvent has not been defined as a function.'); }
    this.handlers.onEvent = onEventFunc;
  }

  onSchedule(onScheduleFunc) {
    if (!isFunction(onScheduleFunc)) { throw new Error('onSchedule has not been defined as a function.'); }
    this.handlers.onSchedule = onScheduleFunc;
  }

  head(route, p0, p1) { this.method('HEAD', route, p0, p1); }
  get(route, p0, p1) { this.method('GET', route, p0, p1); }
  post(route, p0, p1) { this.method('POST', route, p0, p1); }
  put(route, p0, p1) { this.method('PUT', route, p0, p1); }
  patch(route, p0, p1) { this.method('PATCH', route, p0, p1); }
  query(route, p0, p1) { this.method('QUERY', route, p0, p1); }
  delete(route, p0, p1) { this.method('DELETE', route, p0, p1); }
  options(route, p0, p1) { this.method('OPTIONS', route, p0, p1); }
  any(route, p0, p1) { this.method('ANY', route, p0, p1); }

  method(verb, route, p0, p1) {
    let params = [p0, p1].filter(p => p);
    let handler = null;
    let options = {};
    if (params.length > 0) { handler = params[params.length - 1]; }
    if (params.length > 1) { options = params[params.length - 2]; }
    if (params.length > 2) { throw new Error(`Method not defined with ${params.length} parameters.  Closest match is function(route, options, handler).`); }

    if (!isFunction(handler)) { throw new Error('Handler is not defined as a function.'); }

    let path = route.toString();
    if (path[0] !== '/') { path = `/${route}`; }

    let api = {
      ResourcePath: path,
      Method: verb,
      Handler: handler,
      Options: options || {}
    };
    if (!apiFactory.Routes[path]) {
      apiFactory.Routes[path] = {};
      apiFactory.ProxyRoutes[path] = {};
    }
    apiFactory.Routes[path][verb] = api;
    apiFactory.ProxyRoutes = apiFactory.pathResolver.storePath(apiFactory.ProxyRoutes, verb, path, api);
    if (!apiFactory.paths[path]) {
      apiFactory.paths[path] = {};
    }
    if (verb !== 'ANY') {
      apiFactory.paths[path][verb] = {};
    }
  }

  getPathMap() {
    return apiFactory.paths;
  }

  convertEvent(event) {
    event.openApiOptions = event.openApiOptions || {};
    event.queryStringParameters = event.queryStringParameters || {};
    event.stageVariables = event.stageVariables || {};
    event.pathParameters = event.pathParameters || {};

    const method = event.httpMethod || event.requestContext && event.requestContext.http && event.requestContext.http.method;
    let definedRoute = null;

    const proxyPath = '/{proxy+}';
    event.path = event.path || event.requestContext && event.requestContext.http && event.requestContext.http.path || event.requestContext.path;
    // Remove stage from Path
    event.path = event.requestContext && event.path.startsWith(`/${event.requestContext.stage}`) ? event.path.substring(event.requestContext.stage.length + 1) : event.path;

    // The replace handles cases where the route key is prepended with a method from API Gateway
    const routeKey = event.routeKey && event.routeKey.replace(/^[A-Z]+\s/, '') || event.resource;

    const map = apiFactory.pathResolver.resolvePath(apiFactory.ProxyRoutes, method, event.path);
    const definedMethods = map && map.methods;

    // default to defined path when proxy is not specified.
    if (routeKey.lastIndexOf(proxyPath) === -1 && routeKey !== '$default') {
      if (apiFactory.Routes[routeKey] && apiFactory.Routes[routeKey][method]) {
        definedRoute = apiFactory.Routes[routeKey][method];
      } else if (apiFactory.Routes[routeKey] && apiFactory.Routes[routeKey].ANY) {
        definedRoute = apiFactory.Routes[routeKey].ANY;
      }
    } else {
      // if it is a proxy path then then look up the proxied value.
      if (map) {
        definedRoute = map.value;
        delete event.pathParameters.proxy;
        event.pathParameters = Object.assign({}, map.tokens, event.pathParameters);
      }
    }

    // either it is proxied and not defined or not defined, either way go to the proxy method.
    if (!definedRoute) {
      if (apiFactory.Routes[proxyPath] && apiFactory.Routes[proxyPath][method]) {
        definedRoute = apiFactory.Routes[proxyPath][method];
      } else if (apiFactory.Routes[proxyPath] && apiFactory.Routes[proxyPath].ANY) {
        definedRoute = apiFactory.Routes[proxyPath].ANY;
      }
    }

    if (definedRoute) {
      event.route = definedRoute.ResourcePath;
      event.openApiOptions.definedMethods = definedMethods;
      return { event, definedRoute };
    }

    event.route = null;
    event.openApiOptions.definedMethods = definedMethods;
    return { event, definedRoute };
  }

  /* This is the entry point from AWS Lambda. */
  async handler(originalEvent, context) {
    if (apiFactory.debug) {
      apiFactory.logger({ level: 'DEBUG', title: 'Original Event, before transformation', originalEvent });
    }

    if ((originalEvent.path || originalEvent.rawPath) && !originalEvent.type) {
      let { event, definedRoute } = apiFactory.convertEvent(originalEvent);
      if (!definedRoute) {
        return new Resp({
          title: 'No handler defined for method and resource.',
          details: { event, context }
        }, 500);
      }

      let lambda = definedRoute.Handler;
      event.openApiOptions = Object.assign({}, event.openApiOptions, definedRoute.Options || {});
      if (event.isBase64Encoded) {
        event.body = Buffer.from(event.body || '', 'base64').toString('utf8');
        event.isBase64Encoded = false;
      }
      if (!definedRoute.Options.rawBody) {
        // Convert a string body into a javascript object, if it is valid json and raw body is not set.
        try {
          event.body = JSON.parse(event.body);
        } catch (e) { /* */ }
      }

      try {
        let request = await apiFactory.requestMiddleware(event, context);
        let response = await lambda(request, context);
        let result = await apiFactory.responseMiddleware(request, response);
        if (!result) { return new Resp(null, 204); }
        if (!(result instanceof Resp)) { return new Resp(result, result && result.statusCode ? null : 200); }
        return result;
      } catch (e) {
        try {
          let error = await apiFactory.errorMiddleware(event, e);
          if (error instanceof Resp) { return error; }
          if (error instanceof Error) {
            apiFactory.logger({ level: 'ERROR', title: 'Exception thrown by invocation of the runtime lambda function, check the implementation.', api: definedRoute, error: e });
            return new Resp({ title: 'Unexpected error', errorId: event.requestContext && event.requestContext.requestId }, 500);
          }
          return new Resp(error, error && error.statusCode ? null : 500);
        } catch (middleE) {
          apiFactory.logger({ level: 'ERROR', title: 'Exception thrown by invocation of the error middleware, check the implementation.', api: definedRoute, error: e, middleware: middleE });
          return new Resp({ title: 'Unexpected error', errorId: event.requestContext && event.requestContext.requestId }, 500);
        }
      }
    }

    //If this is the authorizer lambda, then call the authorizer
    if (originalEvent.type === 'REQUEST' && (originalEvent.methodArn || originalEvent.routeArn)) {
      if (!apiFactory.Authorizer) {
        apiFactory.logger({ title: 'No authorizer function defined' });
        throw new Error('Authorizer Undefined');
      }

      const { event } = apiFactory.convertEvent(originalEvent);
      try {
        let policy = await apiFactory.Authorizer(event, context);
        if (!policy.principalId) {
          apiFactory.logger({ title: 'OpenAPI-Factory: PolicyResult Failure, missing required parameter in policy: principalId', level: 'WARN', details: policy });
        }
        if (apiFactory.debug) {
          apiFactory.logger({ title: 'OpenAPI-Factory: PolicyResult Success', level: 'INFO', details: policy });
        }
        return policy;
      } catch (error) {
        if (apiFactory.debug) {
          apiFactory.logger({ title: 'OpenAPI-Factory: PolicyResult Failure', level: 'WARN', error });
        }
        throw error;
      }
    }

    // this is a scheduled trigger
    if (originalEvent.source === 'aws.events') {
      // eslint-disable-next-line no-return-await
      return await apiFactory.handlers.onSchedule(originalEvent, context);
    }

    // Otherwise execute the onEvent handler
    // eslint-disable-next-line no-return-await
    return await apiFactory.handlers.onEvent(originalEvent, context);
  }
}

module.exports = ApiFactory;
