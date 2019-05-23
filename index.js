const Resp = require('./src/response');
const PathResolver = require('./src/pathResolver');
let isFunction = obj => { return !!(obj && obj.constructor && obj.call && obj.apply); };

let apiFactory = null;
class ApiFactory {
	constructor(options, overrideLogger = null) {
		apiFactory = this;
		this.Authorizer = null;
		this.requestMiddleware = options && options.requestMiddleware || (r => r);
		this.responseMiddleware = options && options.responseMiddleware || ((_, r) => r);
		this.errorMiddleware = options && options.errorMiddleware || ((_, e) => e);
		this.handlers = {
			onEvent() {},
			onSchedule() {}
		};
		this.Routes = {};
		this.ProxyRoutes = {};
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
		if (!apiFactory.Routes[verb]) {
			apiFactory.Routes[verb] = {};
			apiFactory.ProxyRoutes[verb] = {};
		}
		apiFactory.Routes[verb][path] = api;
		apiFactory.ProxyRoutes[verb] = apiFactory.pathResolver.storePath(apiFactory.ProxyRoutes[verb], path, api);
	}

	/* This is the entry point from AWS Lambda. */
	async handler(event, context) {
		if (event.path && !event.type) {
			event.queryStringParameters = event.queryStringParameters || {};
			event.stageVariables = event.stageVariables || {};
			event.pathParameters = event.pathParameters || {};

			let mainEventHandler = apiFactory.Routes[event.httpMethod];
			let anyEventHandler = apiFactory.Routes.ANY;
			let definedRoute = null;

			let proxyPath = '/{proxy+}';
			// default to defined path when proxy is not specified.
			if (event.resource.lastIndexOf(proxyPath) === -1) {
				if (mainEventHandler && mainEventHandler[event.resource]) {
					definedRoute = mainEventHandler[event.resource];
				} else if (anyEventHandler && anyEventHandler[event.resource]) {
					definedRoute = anyEventHandler[event.resource];
				}
			} else {
				// modify path to strip out potential stage in path
				event.path = `${event.resource.slice(0, -8)}${event.pathParameters.proxy}`;
				// if it is a proxy path then then look up the proxied value.
				let map = apiFactory.pathResolver.resolvePath(apiFactory.ProxyRoutes[event.httpMethod], event.path);
				if (map) {
					definedRoute = map.value;
					event.pathParameters = map.tokens;
				}
			}

			// either it is proxied and not defined or not defined, either way go to the proxy method.
			if (!definedRoute) {
				if (mainEventHandler && mainEventHandler[proxyPath]) {
					definedRoute = mainEventHandler[proxyPath];
				} else if (anyEventHandler && anyEventHandler[proxyPath]) {
					definedRoute = anyEventHandler[proxyPath];
				}
			}

			if (!definedRoute) {
				return new Resp({
					title: 'No handler defined for method and resource.',
					details: {
						event: event,
						context: context
					}
				}, 500);
			}

			let lambda = definedRoute.Handler;
			if (!definedRoute.Options.rawBody) {
				// Convert a string body into a javascript object, if it is valid json and raw body is not set.
				try {
					event.body = JSON.parse(event.body);
				} catch (e) { /* */ }
			}
			try {
				let request = await apiFactory.requestMiddleware(event);
				let response = await lambda(request, context);
				let result = await apiFactory.responseMiddleware(event, response);
				if (!result) { return new Resp(null, 204); }
				if (!(result instanceof Resp)) { return new Resp(result, result && result.statusCode ? null : 200); }
				return result;
			} catch (e) {
				try {
					let error = await apiFactory.errorMiddleware(event, e);
					if (error instanceof Resp) { return error; }
					if (error instanceof Error) {
						apiFactory.logger({ title: 'Exception thrown by invocation of the runtime lambda function, check the implementation.', api: definedRoute, error: e });
						return new Resp({ title: 'Unexpected error', errorId: event.requestContext && event.requestContext.requestId }, 500);
					}
					return new Resp(error, error && error.statusCode ? null : 500);
				} catch (middleE) {
					apiFactory.logger({ title: 'Exception thrown by invocation of the error middleware, check the implementation.', api: definedRoute, error: e, middleware: middleE });
					return new Resp({ title: 'Unexpected error', errorId: event.requestContext && event.requestContext.requestId }, 500);
				}
			}
		}

		//If this is the authorizer lambda, then call the authorizer
		if (event.type === 'REQUEST' && event.methodArn) {
			if (!apiFactory.Authorizer) {
				apiFactory.logger({ title: 'No authorizer function defined' });
				throw new Error('Authorizer Undefined');
			}
			if (event.pathParameters && event.pathParameters.proxy) {
				event.path = `${event.resource.slice(0, -8)}${event.pathParameters.proxy}`;
			}
			try {
				let policy = await apiFactory.Authorizer(event);
				apiFactory.logger({ title: 'PolicyResult Success', details: policy });
				return policy;
			} catch (exception) {
				apiFactory.logger({ title: 'PolicyResult Failure', error: exception });
				throw exception;
			}
		}

		// this is a scheduled trigger
		if (event.source === 'aws.events') {
			try {
				return await apiFactory.handlers.onSchedule(event, context);
			} catch (exception) {
				apiFactory.logger({ title: 'Exception thrown by invocation of the runtime scheduled function, check the implementation.', error: exception });
				throw exception;
			}
		}

		// Otherwise execute the onEvent handler
		try {
			return await apiFactory.handlers.onEvent(event, context);
		} catch (exception) {
			apiFactory.logger({ title: 'Exception thrown by invocation of the runtime event function, check the implementation.', error: exception });
			throw exception;
		}
	}
}

module.exports = ApiFactory;
