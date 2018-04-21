const ApiResponse = require('./src/response');
const MapExapander = require('./src/mapExpander');
let mapExapander = new MapExapander();

module.exports = function() {
	let apiFactory = this;
	if (!apiFactory) { throw new Error('ApiFactory must be instantiated.'); }

	apiFactory.Authorizer = {
		AuthorizerFunc: null,
		Options: {}
	};
	apiFactory.onEvent = () => {};
	apiFactory.onSchedule = () => {};
	apiFactory.Routes = {};
	apiFactory.ProxyRoutes = {};

	let isFunction = obj => { return !!(obj && obj.constructor && obj.call && obj.apply); };

	apiFactory.setAuthorizer = function(authorizerFunc, requestAuthorizationHeader, cacheTimeout) {
		if (!isFunction(authorizerFunc)) { throw new Error('Authorizer Function has not been defined as a function.'); }
		apiFactory.Authorizer = {
			AuthorizerFunc: authorizerFunc,
			Options: {
				AuthorizationHeaderName: requestAuthorizationHeader,
				CacheTimeout: cacheTimeout
			}
		};
	};
	apiFactory.SetAuthorizer = apiFactory.setAuthorizer;

	apiFactory.onEvent = onEventFunc => {
		if (!isFunction(onEventFunc)) { throw new Error('onEvent has not been defined as a function.'); }
		apiFactory.onEvent = onEventFunc;
	};

	apiFactory.onSchedule = onScheduleFunc => {
		if (!isFunction(onScheduleFunc)) { throw new Error('onSchedule has not been defined as a function.'); }
		apiFactory.onSchedule = onScheduleFunc;
	};

	['HEAD', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'ANY'].forEach(verb => {
		this[verb.toLowerCase()] = function(route, p0, p1) {
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
		};
	});

	/* This is the entry point from AWS Lambda. */
	apiFactory.handler = async (event, context, _, overrideLogger) => {
		let logger = overrideLogger || console.log;

		// this is a scheduled trigger
		if (event.source === 'aws.events') {
			try {
				return await apiFactory.onSchedule(event, context);
			} catch (exception) {
				logger(JSON.stringify({ title: 'Exception thrown by invocation of the runtime scheduled function, check the implementation.', error: exception }, null, 2));
				throw exception;
			}
		}

		// this is an event triggered lambda
		if (event.Records) {
			try {
				return await apiFactory.onEvent(event, context);
			} catch (exception) {
				logger(JSON.stringify({ title: 'Exception thrown by invocation of the runtime event function, check the implementation.', error: exception }, null, 2));
				throw exception;
			}
		}

		//If this is the authorizer lambda, then call the authorizer
		if (event.type === 'REQUEST' && event.methodArn) {
			if (!apiFactory.Authorizer.AuthorizerFunc) {
				logger(JSON.stringify({ title: 'No authorizer function defined' }));
				throw new Error('Authorizer Undefined');
			}
			try {
				let policy = await apiFactory.Authorizer.AuthorizerFunc(event);
				logger(JSON.stringify({ title: 'PolicyResult Success', details: policy }, null, 2));
				return policy;
			} catch (exception) {
				logger(JSON.stringify({ title: 'PolicyResult Failure', error: exception }, null, 2));
				throw exception;
			}
		}

		event.queryStringParameters = event.queryStringParameters || {};
		event.pathParameters = event.pathParameters || {};
		event.stageVariables = event.stageVariables || {};
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
			return new ApiResponse({
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
			if (!result) { return new ApiResponse(null, 204); }

			let apiResponse = result;
			if (!(apiResponse instanceof ApiResponse)) {
				return new ApiResponse(apiResponse, apiResponse && apiResponse.statusCode ? null : 200);
			}
			return apiResponse;
		} catch (exception) {
			if (exception instanceof ApiResponse) {
				return exception;
			}

			if (exception instanceof Error) {
				logger(JSON.stringify({ title: 'Exception thrown by invocation of the runtime lambda function, check the implementation.', api: definedRoute, error: exception }, null, 2));
				return new ApiResponse({ title: 'Unexpected error', errorId: event.requestContext && event.requestContext.requestId }, 500);
			}

			return new ApiResponse(exception, exception && exception.statusCode ? null : 500);
		}
	};
};

module.exports.Response = ApiResponse;
module.exports.response = ApiResponse;
