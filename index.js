'use strict';
const ApiResponse = require('./src/response');
const MapExapander = require('./src/mapExpander');
let mapExapander = new MapExapander();

// convert an error object to a json object
let replaceErrors = (_, value) => {
	if (value instanceof Error) {
		let error = {};
		Object.getOwnPropertyNames(value).forEach(key => {
			error[key] = value[key];
		});
		return error;
	}
	return value;
};

module.exports = function() {
	var apiFactory = this;
	if(!apiFactory) { throw new Error('ApiFactory must be instantiated.'); }

	apiFactory.Authorizer = {
		AuthorizerFunc: null,
		Options: {}
	};
	apiFactory.onEvent = () => {};
	apiFactory.onSchedule = () => {};
	apiFactory.Routes = {};
	apiFactory.ProxyRoutes = {};

	var isFunction = (obj) => { return !!(obj && obj.constructor && obj.call && obj.apply); };

	apiFactory.setAuthorizer = function(authorizerFunc, requestAuthorizationHeader, cacheTimeout) {
		if(!isFunction(authorizerFunc)) { throw new Error('Authorizer Function has not been defined as a function.'); }
		apiFactory.Authorizer = {
			AuthorizerFunc: authorizerFunc,
			Options: {
				AuthorizationHeaderName: requestAuthorizationHeader,
				CacheTimeout: cacheTimeout
			}
		};
	};
	apiFactory.SetAuthorizer = apiFactory.setAuthorizer;

	apiFactory.onEvent = (onEventFunc) => {
		if(!isFunction(onEventFunc)) { throw new Error('onEvent has not been defined as a function.'); }
		apiFactory.onEvent = onEventFunc;
	};

	apiFactory.onSchedule = (onScheduleFunc) => {
		if(!isFunction(onScheduleFunc)) { throw new Error('onSchedule has not been defined as a function.'); }
		apiFactory.onSchedule = onScheduleFunc;
	};

	['HEAD', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'ANY'].forEach((verb) => {
		this[verb.toLowerCase()] = function(route, p0, p1) {
			var params = [p0, p1].filter(p => p);
			var handler = null, headers = {}, options = {};
			if(params.length > 0) { handler = params[params.length - 1]; }
			if(params.length > 1) { options = params[params.length - 2]; }
			if(params.length > 2) { throw new Error(`Method not defined with ${params.length} parameters.  Closest match is function(route, options, handler).`)}

			if(!isFunction(handler)) { throw new Error('Handler is not defined as a function.'); }

			var path = route.toString();
			if(path[0] != '/') { path = '/' + route; }

			var api = {
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
	apiFactory.handler = function(event, context, callback, logger) {
		if (!logger) { logger = console.log; }
		if(!callback) {
			var errorResponse = {
				statusCode: 500,
				body: JSON.stringify({
					error: 'Lambda function was not executed with a callback, check the version of nodejs specified.',
					details: {
						event: event,
						context: context
					}
				}),
				headers: {
					'Content-Type': 'application/json'
				}
			};
			logger(JSON.stringify({ title: 'AWS Lambda "callback" function not defined, uprade nodejs version.', error: errorResponse }, null, 2));
			throw new Error(JSON.stringify(errorResponse));
		}

		try {
			// this is a scheduled trigger
			if (event.source === 'aws.events') {
				try {
					var resultPromise = apiFactory.onSchedule(event);
					if(!resultPromise) { return callback(null, null); }

					return Promise.resolve(resultPromise)
					.then(result => {
						return callback(null, result);
					}, failure => {
						return callback(failure);
					});
				}
				catch (exception) {
					logger(JSON.stringify({ title: 'Exception thrown by invocation of the runtime scheduled function, check the implementation.', error: exception }, replaceErrors, 2));
					var body = exception instanceof Error ? exception.toString() : exception;
					return Promise.resolve(callback('Internal Error, check logs'));
				}
			}

			// this is an event triggered lambda
			if (event.Records) {
				try {
					var resultPromise = apiFactory.onEvent(event);
					if(!resultPromise) { return callback(null, null); }

					return Promise.resolve(resultPromise)
					.then(result => {
						return callback(null, result);
					}, failure => {
						return callback(failure);
					});
				}
				catch (exception) {
					logger(JSON.stringify({ title: 'Exception thrown by invocation of the runtime event function, check the implementation.', error: exception }, replaceErrors, 2));
					var body = exception instanceof Error ? exception.toString() : exception;
					return Promise.resolve(callback('Internal Error, check logs'));
				}
			}

			//If this is the authorizer lambda, then call the authorizer
			if(event.type === 'REQUEST' && event.methodArn) {
				if(!apiFactory.Authorizer.AuthorizerFunc) {
					logger(JSON.stringify({ title: 'No authorizer function defined' }));
					return callback('Authorizer Undefined');
				}
				try {
					var resultPromise = apiFactory.Authorizer.AuthorizerFunc(event);
					return Promise.resolve(resultPromise).then(policy => {
						logger(JSON.stringify({ title: 'PolicyResult Success', details: policy }, null, 2));
						return callback(null, policy);
					}, failure => {
						logger(JSON.stringify({ title: 'PolicyResult Failure', error: failure }, replaceErrors, 2));
						return callback(failure);
					});
				}
				catch (exception) {
					logger(JSON.stringify({ code: 'OpenApiAuthorizerException', error: exception.stack || exception, event: event, context: context }, replaceErrors));
					return callback('OpenApiAuthorizerException');
				}
			}

			event.queryStringParameters = event.queryStringParameters || {};
			event.pathParameters = event.pathParameters || {};
			event.stageVariables = event.stageVariables || {};
			var mainEventHandler = apiFactory.Routes[event.httpMethod];
			var anyEventHandler = apiFactory.Routes['ANY'];
			var definedRoute = null;

			let proxyPath = '/{proxy+}';
			// default to defined path when proxy is not specified.
			if (event.resource !== proxyPath) {
				if (mainEventHandler && mainEventHandler[event.resource]) { definedRoute = mainEventHandler[event.resource]; }
				else if (anyEventHandler && anyEventHandler[event.resource]) { definedRoute = anyEventHandler[event.resource]; }
			}
			// if it is a proxy path then then look up the proxied value.
			else {
				let map = mapExapander.getMapValue(apiFactory.ProxyRoutes[event.httpMethod], event.pathParameters.proxy);
				if (map) {
					definedRoute = map.value;
					event.pathParameters = map.tokens;
				}
			}

			// either it is proxied and not defined or not defined, either way go to the proxy method.
			if (!definedRoute) {
				if (mainEventHandler && mainEventHandler[proxyPath]) { definedRoute = mainEventHandler[proxyPath]; }
				else if (anyEventHandler && anyEventHandler[proxyPath]) { definedRoute = anyEventHandler[proxyPath]; }
			}

			if(!definedRoute) {
				return callback(null, {
					statusCode: 500,
					body: JSON.stringify({
						title: 'No handler defined for method and resource.',
						details: {
							event: event,
							context: context
						}
					}),
					headers: {
						'Content-Type': 'application/json'
					}
				});
			}

			var lambda = definedRoute.Handler;
			//Convert a string body into a javascript object, if it is valid json
			try { event.body = JSON.parse(event.body); }
			catch (e) {}
			try {
				var resultPromise = lambda(event, context);
				if(!resultPromise) { return callback(null, new ApiResponse(null, 204)); }

				return Promise.resolve(resultPromise)
				.then((result) => {
					var apiResponse = result;
					if(!(apiResponse instanceof ApiResponse)) {
						apiResponse = new ApiResponse(apiResponse, apiResponse && apiResponse.statusCode ? null : 200);
					}
					return callback(null, apiResponse);
				}, (failure) => {
					var apiResponse = failure;
					if(!(apiResponse instanceof ApiResponse)) {
						apiResponse = new ApiResponse(apiResponse, apiResponse && apiResponse.statusCode ? null : 500);
					}
					return callback(null, apiResponse);
				});
			}
			catch (exception) {
				logger(JSON.stringify({ title: 'Exception thrown by invocation of the runtime lambda function, check the implementation.', api: definedRoute, error: exception }, replaceErrors, 2));
				var body = exception instanceof Error ? exception.toString() : exception;
				return Promise.resolve(callback(null, new ApiResponse(body, body && body.statusCode ? null : 500)));
			}
		}
		catch (exception) {
			logger(JSON.stringify({ title: 'OpenApiFailureFactoryException', error: exception.stack || exception.toString() }, replaceErrors, 2));
			return Promise.resolve(callback(null, new ApiResponse({Error: 'Failed to load lambda function', Details: exception.stack || exception }, 500)));
		}
	}
};

module.exports.Response = ApiResponse;
module.exports.response = ApiResponse;