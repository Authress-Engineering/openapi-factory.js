# Node OpenAPI Factory

API as first class node library to generate clients, servers, and documentation.

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
		new api.Response({ value: 'testWithStatus' }, { 'Content-Type': 'application/json' }, 200);
	});

```
