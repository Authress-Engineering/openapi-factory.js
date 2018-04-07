'use strict';
const { describe, it, beforeEach, afterEach } = require('mocha');
const chai = require('chai');
const { assert } = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

const MapExpander = require('../src/mapExpander');
let Api = require('../index');

chai.use(sinonChai);

let sandbox;
beforeEach(() => { sandbox = sinon.sandbox.create(); });
afterEach(() => sandbox.restore());

describe('index.js', () => {
	describe('methods', () => {
		it('Check expected API Methods', () => {
			let api = new Api();
			assert.isFunction(api.head, 'HEAD has not been defined.');
			assert.isFunction(api.get, 'GET has not been defined.');
			assert.isFunction(api.put, 'PUT has not been defined.');
			assert.isFunction(api.patch, 'PATCH has not been defined.');
			assert.isFunction(api.post, 'POST has not been defined.');
			assert.isFunction(api.delete, 'DELETE has not been defined.');
			assert.isFunction(api.any, 'ANY has not been defined.');
		});
	});
	describe('authorizer', () => {
		it('check call to default authorizerFunc', () => {
			let api = new Api();
			assert(api.Authorizer.AuthorizerFunc === null);
		});
		it('check call to false authorizerFunc', () => {
			try {
				let api = new Api();
				api.SetAuthorizer(() => false);
				let result = api.Authorizer.AuthorizerFunc();
				//result should be false;
				assert(!result);
			} catch (e) {
				console.error(e);
				assert(false, e.toString());
			}
		});
		it('check call to false authorizerFunc', async () => {
			let api = new Api();
			api.SetAuthorizer(() => {
				return Promise.reject('Unauthorized');
			});
			try {
				await api.Authorizer.AuthorizerFunc();
				throw 'Should have failed';
			} catch (e) {
				return;
			}
		});
		it('check call to success authorizerFunc', async () => {
			let api = new Api();
			api.SetAuthorizer(() => {
				return Promise.resolve();
			});
			await api.Authorizer.AuthorizerFunc();
		});
		it('check call to success authorizer', async () => {
			let api = new Api();
			api.SetAuthorizer(() => {
				return Promise.resolve();
			});
			await api.Authorizer.AuthorizerFunc();
		});
		it('check call to failure authorizer', async () => {
			let api = new Api();
			api.SetAuthorizer(() => {
				return Promise.reject('Fail this test');
			});
			
			try {
				let result = await api.Authorizer.AuthorizerFunc();
				throw `Should not have passed: ${result}`;
			} catch (e) {
				return;
			}
		});
		it('check call to failure authorizer handler', async () => {
			let api = new Api();
			try {
				await api.handler({
					type: 'REQUEST',
					methodArn: 'authorizationHandlerTest'
				}, {}, null, () => {});
				throw 'This test should have failed';
			} catch (e) {
				return;
			}
		});
		it('check call to failure when no authorizer defined', async () => {
			try {
				let api = new Api();
				await api.handler({
					type: 'REQUEST',
					methodArn: 'authorizationHandlerTest'
				}, {}, null, () => {});
				throw 'This test should have failed';
			} catch (e) {
				return;
			}
		});
	});
	describe('handler', () => {
		it('check call to ANY handler', async () => {
			let mapExpanderMock = sandbox.mock(MapExpander.prototype);
			mapExpanderMock.expects('expandMap').returns({});
			mapExpanderMock.expects('getMapValue').returns(null);
			let expectedResult = { value: 5 };
			let api = new Api();
			api.any('/test', () => {
				return new Api.Response(expectedResult);
			});

			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/test'
			}, {}, null, () => {});
			
			assert.deepEqual(JSON.parse(output.body), expectedResult, 'Output data does not match expected.');
			assert.strictEqual(output.statusCode, 200, 'Status code should be 200');
		});
		it('check call to GET handler', async () => {
			let mapExpanderMock = sandbox.mock(MapExpander.prototype);
			mapExpanderMock.expects('expandMap').returns({});
			mapExpanderMock.expects('getMapValue').returns(null);

			let expectedResult = { value: 5 };
			let api = new Api();
			api.get('/test', () => {
				return new Api.Response(expectedResult);
			});

			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/test'
			}, {}, null, () => {});
			assert.deepEqual(JSON.parse(output.body), expectedResult, 'Output data does not match expected.');
			assert.strictEqual(output.statusCode, 200, 'Status code should be 200');
		});
		it('check promise result to GET handler', async () => {
			let mapExpanderMock = sandbox.mock(MapExpander.prototype);
			mapExpanderMock.expects('expandMap').returns({});
			mapExpanderMock.expects('getMapValue').returns(null);
			let expectedResult = { value: 5 };
			let api = new Api();
			api.get('/test', () => {
				return Promise.resolve(new Api.Response(expectedResult));
			});

			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/test'
			}, {}, null, () => {});
			assert.deepEqual(JSON.parse(output.body), expectedResult, 'Output data does not match expected.');
			assert.strictEqual(output.statusCode, 200, 'Status code should be 200');
		});
		it('check promise result to GET handler with object', async () => {
			let expectedResult = { value: 5 };
			let api = new Api();
			api.get('/test', () => {
				return Promise.resolve({ body: expectedResult, statusCode: 201 });
			});

			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/test'
			}, {}, null, () => {});

			assert.deepEqual(JSON.parse(output.body), expectedResult, 'Output data does not match expected.');
			assert.strictEqual(output.statusCode, 201, 'Status code should be 200');
		});
		it('check promise rejection to GET handler', async () => {
			let mapExpanderMock = sandbox.mock(MapExpander.prototype);
			mapExpanderMock.expects('expandMap').returns({});
			mapExpanderMock.expects('getMapValue').returns(null);

			let expectedResult = { value: 5 };
			let api = new Api();
			api.get('/test', () => {
				return Promise.reject(expectedResult);
			});

			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/test'
			}, {}, null, () => {});

			assert.deepEqual(JSON.parse(output.body), expectedResult, 'Output data does not match expected.');
			assert.strictEqual(output.statusCode, 500, 'Promise rejections should be 500');
		});
		it('check promise rejection to GET handler with object', async () => {
			let expectedResult = { value: 5 };
			let api = new Api();
			api.get('/test', () => {
				throw { body: expectedResult, statusCode: 500 };
			});

			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/test'
			}, {}, null, () => {});
			assert.deepEqual(JSON.parse(output.body), expectedResult, 'Output data does not match expected.');
			assert.strictEqual(output.statusCode, 500, 'Promise rejections should be 500');
		});
		it('check exception in GET handler', async () => {
			let mapExpanderMock = sandbox.mock(MapExpander.prototype);
			mapExpanderMock.expects('expandMap').returns({});
			mapExpanderMock.expects('getMapValue').returns(null);
			let expectedResult = { value: 5 };
			let api = new Api();
			api.get('/test', () => {
				throw expectedResult;
			});

			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/test'
			}, {}, null, () => {});
			assert.deepEqual(JSON.parse(output.body), expectedResult, 'Output data does not match expected.');
			assert.strictEqual(output.statusCode, 500, 'Error should be a 500 on a throw');
		});
		it('check exception in GET handler with object', async () => {
			let mapExpanderMock = sandbox.mock(MapExpander.prototype);
			mapExpanderMock.expects('expandMap').returns({});
			mapExpanderMock.expects('getMapValue').returns(null);

			let expectedResult = { value: 5 };
			let api = new Api();
			api.get('/test', () => {
				throw { body: expectedResult, statusCode: 401 };
			});

			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/test'
			}, {}, null, () => {});
			assert.deepEqual(JSON.parse(output.body), expectedResult, 'Output data does not match expected.');
			assert.strictEqual(output.statusCode, 401, 'Error should be a 401 on a throw that matches response object');
		});
		it('validate default parameters', async () => {
			let expectedResult = { value: 5 };
			let api = new Api();
			api.get('/test', request => {
				assert.isNotNull(request.pathParameters);
				assert.isNotNull(request.stageletiables);
				assert.isNotNull(request.queryStringParameters);
				return Promise.resolve({ body: expectedResult, statusCode: 201 });
			});

			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/test'
			}, {}, null, () => {});
			assert.deepEqual(JSON.parse(output.body), expectedResult, 'Output data does not match expected.');
			assert.strictEqual(output.statusCode, 201, 'Status code should be 200');
		});
		it('validate default parameters when api gateways are null', async () => {
			let expectedResult = { value: 5 };
			let api = new Api();
			api.get('/test', request => {
				assert.isNotNull(request.pathParameters);
				assert.isNotNull(request.stageVariables);
				assert.isNotNull(request.queryStringParameters);
				return { body: expectedResult, statusCode: 201 };
			});

			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/test',
				stageVariables: null,
				pathParameters: null,
				queryStringParameters: null
			}, {}, null, () => {});
			assert.deepEqual(JSON.parse(output.body), expectedResult, 'Output data does not match expected.');
			assert.strictEqual(output.statusCode, 201, 'Status code should be 200');
		});
		it('validate default parameters do not override', async () => {
			let expectedQueryStringParameters = { h: 1 };
			let expectedPathParameters = { h: 2 };
			let expcetedStageVariables = { h: 3 };

			let expectedResult = { value: 5 };
			let api = new Api();
			api.get('/test', request => {
				assert.equal(request.pathParameters, expectedPathParameters);
				assert.equal(request.stageVariables, expcetedStageVariables);
				assert.equal(request.queryStringParameters, expectedQueryStringParameters);
				return Promise.resolve({ body: expectedResult, statusCode: 201 });
			});

			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/test',
				stageVariables: expcetedStageVariables,
				pathParameters: expectedPathParameters,
				queryStringParameters: expectedQueryStringParameters
			}, {}, null, () => {});
			assert.deepEqual(JSON.parse(output.body), expectedResult, 'Output data does not match expected.');
			assert.strictEqual(output.statusCode, 201, 'Status code should be 200');
		});
	});
});
