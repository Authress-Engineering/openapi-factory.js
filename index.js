'use strict';
var ApiResponse = require('./src/response');
var ApiConfiguration = require('./src/configuration');

function ApiFactory() {
	if (!(this instanceof ApiFactory)) {
		throw new Error('ApiFactory must be instantiated.');
	}
	this.AuthorizerFunc = () => true;
	this.Routes = {};
};

ApiFactory.prototype.Response = ApiResponse;

var isFunction = (obj) => { return !!(obj && obj.constructor && obj.call && obj.apply); };

ApiFactory.prototype.Authorizer = function(authorizerFunc, options) {
	if(!isFunction(authorizerFunc)) { throw new Error('Authorizer Function has not be defined as a function.'); }
	this.AuthorizerFunc = authorizerFunc;
};

['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'PATCH'].forEach((verb) => {
	ApiFactory.prototype[verb.toLowerCase()] = function(route, options, handler) {
		if(!handler) { handler = options; options = {}; }
		if(!isFunction(handler)) { throw new Error('Handler is not defined as a function.'); }

		var api = {
			Route: route,
			Verb: verb,
			Handler: handler,
			Options: new ApiConfiguration(options, __filename)
		};
		if(!this.Routes[verb]) { this.Routes[verb] = {}; }
		this.Routes[verb][route] = api;
	};
});

/* This is the entry point from AWS Lambda. */
ApiFactory.prototype.handler = function(event, context, callback) {
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

	if(!event.api || !event.api.method || !event.api.path) {
		return callback(JSON.stringify({
			statusCode: 500,
			error: 'API Gateway has not been configured to contain api: "method" and "path".',
			details: {
				event: event,
				context: context
			}
		}));
	}

	var lambda = this.Routes[event.api.method][event.api.path].Handler;
	if(!lambda) {
		return callback(JSON.stringify({
			statusCode: 500,
			error: 'No handler defined for method and route.',
			details: {
				method: headers.method,
				route: headers.path
			}
		}));
	}

	var data = {
		api: event.api,
		headers: event.headers,
		body: event.body || {},
		context: context,
		queryString: event.queryString || {}
	};
	try {
		var resultPromise = lambda(data);
		if(!resultPromise) { return callback(JSON.stringify(new ApiResponse(null, null, 204))); }

		return Promise.resolve(resultPromise)
		.then((result) => {
			var apiResponse = result;
			if(!(apiResponse instanceof ApiResponse)) {
				apiResponse = new ApiResponse(apiResponse, {}, 200);
			}
			return callback(JSON.stringify(apiResponse));
		}, (failure) => {
			var apiResponse = failure;
			if(!(apiResponse instanceof ApiResponse)) {
				apiResponse = new ApiResponse(apiResponse, {}, 500);
			}
			return callback(JSON.stringify(apiResponse));
		});
	}
	catch (exception) {
		return Promise.resolve(callback(JSON.stringify(new ApiResponse({
			error: 'Failed executing lambda function.',
			request: data,
			data: exception
		}, null, 500))));
	}
}

module.exports = ApiFactory;