# Node OpenAPI Factory

API as first class node library to generate clients, servers, and documentation. To simplify the creation and management of serverless cloud API, manage the server and api using the OpenAPI Factory.

[![npm version](https://badge.fury.io/js/openapi-factory.svg)](https://badge.fury.io/js/openapi-factory)
[![Build Status](https://travis-ci.org/wparad/node-openapi-factory.svg?branch=master)](https://travis-ci.org/wparad/node-openapi-factory)

### Create an API

```javascript
	var ApiFactory = require('openapi-factory');
	var api = new ApiFactory();

	api.get('/example', (request) => {
		return {value: 'test'};
	});

	//OR
	api.get('/example', (request) => {
		new ApiFactory.Response({ value: 'testWithStatus' }, { 'Content-Type': 'application/json' }, 200);
	});

```