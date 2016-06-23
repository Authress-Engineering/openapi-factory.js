'use strict;'
var esprima = require('esprima');
var mocha = require('mocha');
var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');

describe('index.js', function() {
	describe('Syntax', function() {
		it('Should be valid Javascript', function() {
			try {
				var userStringToTest = fs.readFileSync(path.resolve('index.js'));
				esprima.parse(userStringToTest);
				assert(true);
			}
			catch(e) {
				console.error(e);
				assert(false, JSON.stringify(e, null, 2));
			}
		});
		it('Should be valid node', function() {
			try {
				var app = require('../index');
				assert(true);
			}
			catch(e) {
				console.error(e);
				assert(false, JSON.stringify(e, null, 2));
			}
		});
	});
	describe('methods', function() {
		it('Check expected API Methods', function() {
			var isFunction = (obj) => { return !!(obj && obj.constructor && obj.call && obj.apply); };
			var Api = require('../index');
			var api = new Api();
			assert.isFunction(api.head, 'HEAD has not been defined.');
			assert.isFunction(api.get, 'GET has not been defined.');
			assert.isFunction(api.put, 'PUT has not been defined.');
			assert.isFunction(api.patch, 'PATCH has not been defined.');
			assert.isFunction(api.post, 'POST has not been defined.');
			assert.isFunction(api.delete, 'DELETE has not been defined.');
		});
	});
	describe('authorizer', function() {
		it('check call to default authorizerFunc', function() {
			try {
				var Api = require('../index');
				var api = new Api();
				assert(api.Authorizer.AuthorizerFunc());
			}
			catch(e) {
				console.error(e);
				assert(false, e.toString());
			}
		});
		it('check call to false authorizerFunc', function() {
			try {
				var Api = require('../index');
				var api = new Api();
				api.SetAuthorizer(() => false);
				var result = api.Authorizer.AuthorizerFunc();
				//result should be false;
				assert(!result);
			}
			catch(e) {
				console.error(e);
				assert(false, e.toString());
			}
		});
	});
	describe('handler', function() {
		it('check call to GET handler', function(done) {
			try {
				var expectedResult = {'Value': 5};
				var Api = require('../index');
				var api = new Api();
				api.get('/test', (request) => {
					return new Api.Response(expectedResult);
				});

				api.handler({}, {
					httpMethod: 'GET',
					resourcePath: '/test'
				}, x => x)
				.then(outputString => {
					var output = null;
					try { output = JSON.parse(outputString); }
					catch (exception) { assert(false, `failed to parse response as json: ${outputString}`); }

					assert.deepEqual(output.body, expectedResult, `Output data does not match expected.`);
					assert.strictEqual(output.statusCode, 200, 'Status code should be 200');
					done();
				})
				.catch(failure => done(failure));
			}
			catch(e) {
				console.error(e.stack);
				assert(false, e.toString());
			}
		});
		it('check promise result to GET handler', function(done) {
			try {
				var expectedResult = {'Value': 5};
				var Api = require('../index');
				var api = new Api();
				api.get('/test', (request) => {
					return Promise.resolve(new Api.Response(expectedResult));
				});

				api.handler({}, {
					httpMethod: 'GET',
					resourcePath: '/test'
				}, x => x)
				.then(outputString => {
					var output = null;
					try { output = JSON.parse(outputString); }
					catch (exception) { assert(false, `failed to parse response as json: ${outputString}`); }

					assert.deepEqual(output.body, expectedResult, `Output data does not match expected.`);
					assert.strictEqual(output.statusCode, 200, 'Status code should be 200');
					done();
				})
				.catch(failure => done(failure));
			}
			catch(e) {
				console.error(e.stack);
				assert(false, e.toString());
			}
		});
		it('check promise rejection to GET handler', function(done) {
			try {
				var expectedResult = {'Value': 5};
				var Api = require('../index');
				var api = new Api();
				api.get('/test', (request) => {
					return Promise.reject(expectedResult);
				});

				api.handler({}, {
					httpMethod: 'GET',
					resourcePath: '/test'
				}, x => x)
				.then(outputString => {
					var output = null;
					try { output = JSON.parse(outputString); }
					catch (exception) { assert(false, `failed to parse response as json: ${outputString}`); }

					assert.deepEqual(output.body, expectedResult, `Output data does not match expected.`);
					assert.strictEqual(output.statusCode, 500, 'Promise rejections should be 500');
					done();
				})
				.catch(failure => done(failure));
			}
			catch(e) {
				console.error(e.stack);
				assert(false, e.toString());
			}
		});
		it('check exception in GET handler', function(done) {
			try {
				var expectedResult = {'Value': 5};
				var Api = require('../index');
				var api = new Api();
				api.get('/test', (request) => {
					throw expectedResult;
				});

				api.handler({}, {
					httpMethod: 'GET',
					resourcePath: '/test'
				}, x => x)
				.then(outputString => {
					var output = null;
					try { output = JSON.parse(outputString); }
					catch (exception) { assert(false, `failed to parse response as json: ${outputString}`); }

					assert.deepEqual(output.body, expectedResult, `Output data does not match expected.`);
					assert.strictEqual(output.statusCode, 500, 'Error should be a 500 on a throw');
					done();
				})
				.catch(failure => done(failure));
			}
			catch(e) {
				console.error(e.stack);
				assert(false, e.toString());
			}
		});
		it('check configuration options in GET handler', function() {
			try {
				var Api = require('../index');
				var options = {};
				var lambdaFilename = 'lambda.js';
				var api = new Api(options, lambdaFilename);
				assert.strictEqual(api.Configuration.Handler, `lambda.handler`, 'Function handler does not match');
			}
			catch(e) {
				console.error(e.stack);
				assert(false, e.toString());
			}
		});
	});
});