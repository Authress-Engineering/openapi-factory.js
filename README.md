# OpenAPI Factory (Javascript)

API as first class node library to generate clients, servers, and documentation. To simplify the creation and management of serverless cloud API, manage the server and api using the OpenAPI Factory.

[![npm version](https://badge.fury.io/js/openapi-factory.svg)](https://badge.fury.io/js/openapi-factory)
[![Build Status](https://travis-ci.org/wparad/openapi-factory.js.svg?branch=master)](https://travis-ci.org/wparad/openapi-factory.js)

### Create an API
The default headers returned unless overriden are
* For a JSON Object: `{ 'Content-Type': 'application/links+json', 'Access-Control-Allow-Origin': '*' }`
* For a binary Object: `{ 'Content-Type': 'application/octet-stream', 'Access-Control-Allow-Origin': '*' }`

```javascript
	const ApiFactory = require('openapi-factory');
	let options = {
		requestMiddleware(request) {

		},
		responseMiddleware(request, response) {

		},
		errorMiddleware(request, error) {

		}
	};
	let api = new ApiFactory(options);

	api.get('/example', async request => {
		// which auto wraps => body: { value: 'test' }, statusCode => 200, headers => application/json
		return { value: 'test' };

		// or non-wrap coerce
		return {
			body: { value: 'testWithStatus' },
			statusCode: 200,
			headers: { 'Content-Type': 'application/json'}
		};

		// a static type
		return new ApiFactory.response({ value: 'testWithStatus' }, 200, { 'Content-Type': 'application/json'});
	});


	// converts dynamic variables paths
	api.get('/example/{id}/subpath', request => {
		let idFromPath = request.pathParameters.id;
		let stageVariable = request.stageVariables.VARIABLE_NAME;
		let query = request.queryStringParameters.QUERY_NAME;
		let headers = request.headers.HEADER_NAME;
	});

	api.setAuthorizer(request => {
		return 'valid-policy-doument';
	});

	api.onEvent(event => {
		console.log('triggered by event trigger');
	});

	api.onSchedule(data => {
		console.log('triggered by a schedule');
	});

	api.get('/items/{itemid}', async request => {
		console.log(request.path.itemId);
		return new ApiFactory.Response({ value: 'testWithStatus' }, 200, { 'Content-Type': 'application/json'});
	});
	
	// Example: AWS Api Gateway magic string handling for CORS and 404 fallbacks.
	api.options('/{proxy+}', () => {
	  	return {
			statusCode: 200,
			headers: {
			    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
			    'Access-Control-Allow-Methods': 'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT',
			    'Access-Control-Allow-Origin': '*'
			}
	  	};
	});

	api.any('/{proxy+}', () => {
		 return {
			statusCode: 404,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*'
			}
		 };
	});

```
