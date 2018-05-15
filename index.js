const Resp = require('./src/response');
const MapExapander = require('./src/mapExpander');
let mapExapander = new MapExapander();
let isFunction = obj => { return !!(obj && obj.constructor && obj.call && obj.apply); };

let apiFactory = null;
class ApiFactory {
	constructor(overrideLogger) {
		apiFactory = this;
		this.Authorizer = null;
		this.handlers = {
			onEvent() {},
			onSchedule() {}
		};
		this.Routes = {};
		this.ProxyRoutes = {};
		this.logger = overrideLogger || console.log;
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
		apiFactory.ProxyRoutes[verb] = mapExapander.expandMap(apiFactory.ProxyRoutes[verb], path, api);
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
			if (event.resource !== proxyPath) {
				if (mainEventHandler && mainEventHandler[event.resource]) {
					definedRoute = mainEventHandler[event.resource];
				} else if (anyEventHandler && anyEventHandler[event.resource]) {
					definedRoute = anyEventHandler[event.resource];
				}
			} else {
				// if it is a proxy path then then look up the proxied value.
				let map = mapExapander.getMapValue(apiFactory.ProxyRoutes[event.httpMethod], event.pathParameters.proxy);
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
			//Convert a string body into a javascript object, if it is valid json
			try {
				event.body = JSON.parse(event.body);
			} catch (e) { /* */ }
			try {
				let result = await lambda(event, context);
				if (!result) { return new Resp(null, 204); }
				if (!(result instanceof Resp)) { return new Resp(result, result && result.statusCode ? null : 200); }
				return result;
			} catch (e) {
				if (e instanceof Resp) { return e; }
				if (e instanceof Error) {
					apiFactory.logger(JSON.stringify({ title: 'Exception thrown by invocation of the runtime lambda function, check the implementation.', api: definedRoute, error: e }, null, 2));
					return new Resp({ title: 'Unexpected error', errorId: event.requestContext && event.requestContext.requestId }, 500);
				}
				return new Resp(e, e && e.statusCode ? null : 500);
			}
		}

		//If this is the authorizer lambda, then call the authorizer
		if (event.type === 'REQUEST' && event.methodArn) {
			if (!apiFactory.Authorizer) {
				apiFactory.logger(JSON.stringify({ title: 'No authorizer function defined' }));
				throw new Error('Authorizer Undefined');
			}
			try {
				let policy = await apiFactory.Authorizer(event);
				apiFactory.logger(JSON.stringify({ title: 'PolicyResult Success', details: policy }, null, 2));
				return policy;
			} catch (exception) {
				apiFactory.logger(JSON.stringify({ title: 'PolicyResult Failure', error: exception }, null, 2));
				throw exception;
			}
		}

		// this is a scheduled trigger
		if (event.source === 'aws.events') {
			try {
				return await apiFactory.handlers.onSchedule(event, context);
			} catch (exception) {
				apiFactory.logger(JSON.stringify({ title: 'Exception thrown by invocation of the runtime scheduled function, check the implementation.', error: exception }, null, 2));
				throw exception;
			}
		}

		// This is an event triggered lambda
		if (event.Records || event.messages) {
			try {
				return await apiFactory.handlers.onEvent(event, context);
			} catch (exception) {
				apiFactory.logger(JSON.stringify({ title: 'Exception thrown by invocation of the runtime event function, check the implementation.', error: exception }, null, 2));
				throw exception;
			}
		}

		throw new Error('No handler matches handler JSON.');
	}
}

module.exports = ApiFactory;
