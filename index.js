'use strict';
var ApiResponse = require('./src/response');
var ApiConfiguration = require('./src/configuration');

module.exports = function(options, lambdaFilename) {
	var apiFactory = this;
	if(!apiFactory) { throw new Error('ApiFactory must be instantiated.'); }

	apiFactory.Authorizer = {
		AuthorizerFunc: () => true,
		Options: {}
	};
	apiFactory.Routes = {};
	apiFactory.Configuration = new ApiConfiguration(options, lambdaFilename);

	var isFunction = (obj) => { return !!(obj && obj.constructor && obj.call && obj.apply); };

	apiFactory.SetAuthorizer = function(authorizerFunc, requestAuthorizationHeader, cacheTimeout) {
		if(!isFunction(authorizerFunc)) { throw new Error('Authorizer Function has not be defined as a function.'); }
		apiFactory.Authorizer = {
			AuthorizerFunc: authorizerFunc,
			Options: {
				AuthorizationHeaderName: requestAuthorizationHeader,
				CacheTimeout: cacheTimeout
			}
		};
	};

	['HEAD', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'].forEach((verb) => {
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
			if(!apiFactory.Routes[verb]) { apiFactory.Routes[verb] = {}; }
			apiFactory.Routes[verb][path] = api;
		};
	});

	/* This is the entry point from AWS Lambda. */
	apiFactory.handler = function(event, context, callback) {
		try {
			//If this is the authorizer lambda, then call the authorizer
			if(event.type && event.authorizationToken && event.methodArn) {
				try {
					return apiFactory.Authorizer.AuthorizerFunc(event.authorizationToken, event.methodArn, context.authorizer.principalId);
				}
				catch (exception) {
					console.log(`Failure to authorize: ${exception.stack || exception} event: ${JSON.stringify(event)} context: ${JSON.stringify(context)}`)
					return {
						principalId: context.authorizer.principalId,
						policyDocument: {
							Version: '2012-10-17',
							Statement: [
								{
									Action: 'execute-api:Invoke',
									Effect: 'Deny',
									Resource: event.methodArn
								}
							]
						}
					};
				}
			}

			if(!callback) {
				return callback(JSON.stringify({
					statusCode: 500,
					error: 'Lambda function was not executed with a callback, check the version of nodejs specified.',
					details: {
						event: event,
						context: context
					}
				}));
			}

			var lambda = apiFactory.Routes[event.api.httpMethod][event.api.resourcePath].Handler;
			if(!lambda) {
				return callback(JSON.stringify({
					statusCode: 500,
					error: 'No handler defined for method and resource.',
					details: event.api
				}));
			}

			var data = {
				params: event.params,
				headers: event.headers,
				body: event.body || {},
				context: context,
				queryString: event.queryString || {},
				stage: event.variables
			};

			try {
				var resultPromise = lambda(data);
				if(!resultPromise) { return callback(JSON.stringify(new ApiResponse(null, 204))); }

				return Promise.resolve(resultPromise)
				.then((result) => {
					var apiResponse = result;
					if(!(apiResponse instanceof ApiResponse)) {
						apiResponse = new ApiResponse(apiResponse, 200);
					}
					return callback(JSON.stringify(apiResponse));
				}, (failure) => {
					var apiResponse = failure;
					if(!(apiResponse instanceof ApiResponse)) {
						apiResponse = new ApiResponse(apiResponse, 500);
					}
					return callback(JSON.stringify(apiResponse));
				});
			}
			catch (exception) {
				return Promise.resolve(callback(JSON.stringify(new ApiResponse(exception, 500))));
			}
		}
		catch (exception) {
			console.log(exception.stack || exception);
			return Promise.resolve(callback(JSON.stringify(new ApiResponse({Error: 'Failed to load lambda function', Details: exception.stack || exception }, 500))));
		}
	}
};

module.exports.Response = ApiResponse;