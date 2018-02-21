# OpenAPI Factory (Javascript)

API as first class node library to generate clients, servers, and documentation. To simplify the creation and management of serverless cloud API, manage the server and api using the OpenAPI Factory.

[![npm version](https://badge.fury.io/js/openapi-factory.svg)](https://badge.fury.io/js/openapi-factory)
[![Build Status](https://travis-ci.org/wparad/openapi-factory.js.svg?branch=master)](https://travis-ci.org/wparad/openapi-factory.js)

### Create an API

```javascript
	var ApiFactory = require('openapi-factory');
	var api = new ApiFactory();

	api.get('/example', request => {
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

	api.get('/items/{itemid}', (request) => {
		console.log(request.pathParameters.itemId);
		new ApiFactory.Response({ value: 'testWithStatus' }, 200, { 'Content-Type': 'application/json'});
	});

```