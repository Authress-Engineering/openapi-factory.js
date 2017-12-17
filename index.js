'use strict';
const ApiResponse = require('./src/response');
const MapExapander = require('./src/mapExpander');
let mapExapander = new MapExapander();
module.exports = function() {
	var apiFactory = this;
	if(!apiFactory) { throw new Error('ApiFactory must be instantiated.'); }

	apiFactory.Authorizer = {
		AuthorizerFunc: null,
		Options: {}
	};
	apiFactory.Routes = {};
	apiFactory.ProxyRoutes = {};

	var isFunction = (obj) => { return !!(obj && obj.constructor && obj.call && obj.apply); };

	apiFactory.SetAuthorizer = function(authorizerFunc, requestAuthorizationHeader, cacheTimeout) {
		if(!isFunction(authorizerFunc)) { throw new Error('Authorizer Function has not been defined as a function.'); }
		apiFactory.Authorizer = {
			AuthorizerFunc: authorizerFunc,
			Options: {
				AuthorizationHeaderName: requestAuthorizationHeader,
				CacheTimeout: cacheTimeout
			}
		};
	};

	['HEAD', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'ANY'].forEach((verb) => {
		this[verb.toLowerCase()] = function(route, p0, p1, p2) {
			var params = [p0, p1, p2].filter(p => p);
			var handler = null, headers = {}, options = {};
			if(params.length > 0) { handler = params[params.length - 1]; }
			if(params.length > 1) { headers = params[params.length - 2]; }
			if(params.length > 2) { options = params[params.length - 3]; }
			if(params.length > 3) { throw new Error(`Method not defined with ${params.length} parameters.  Closest match is function(route, options, headers, handler).`)}

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
	apiFactory.handler = function(event, context, callback) {
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
			console.log(`Callback Not Defined: ${JSON.stringify(errorResponse)}`);
			throw new Error(JSON.stringify(errorResponse));
		}

		try {
			//If this is the authorizer lambda, then call the authorizer
			if(event.type && event.authorizationToken && event.methodArn) {
				if(!apiFactory.Authorizer.AuthorizerFunc) { return callback('Authorizer Undefined'); }
				try {
					var authorization = {
						Type: event.authorizationToken.split(' ')[0],
						Token: event.authorizationToken.split(' ')[1]
					};
					var resultPromise = apiFactory.Authorizer.AuthorizerFunc(authorization, event.methodArn, context);
					return Promise.resolve(resultPromise).then(policy => {
						console.log(JSON.stringify({Title: 'PolicyResult Success', Details: policy}));
						return callback(null, policy);
					}, failure => {
						console.log(JSON.stringify({Title: 'PolicyResult Failure', Details: failure}));
						return callback(failure);
					});
				}
				catch (exception) {
					console.log(`Failure to authorize: ${exception.stack || exception} event: ${JSON.stringify(event)} context: ${JSON.stringify(context)}`)
					return callback('Failed to Authorize');
				}
			}

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
						error: 'No handler defined for method and resource.',
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
						apiResponse = new ApiResponse(apiResponse, 200);
					}
					return callback(null, apiResponse);
				}, (failure) => {
					var apiResponse = failure;
					if(!(apiResponse instanceof ApiResponse)) {
						apiResponse = new ApiResponse(apiResponse, 500);
					}
					return callback(null, apiResponse);
				});
			}
			catch (exception) {
				var body = exception instanceof Error ? exception.toString() : exception;
				return Promise.resolve(callback(null, new ApiResponse(body, 500)));
			}
		}
		catch (exception) {
			console.log(exception.stack || exception.toString());
			return Promise.resolve(callback(null, new ApiResponse({Error: 'Failed to load lambda function', Details: exception.stack || exception }, 500)));
		}
	}
};

module.exports.Response = ApiResponse;