require('error-object-polyfill');
const { describe, it, beforeEach, afterEach } = require('mocha');
const chai = require('chai');
const { assert } = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

const PathResolver = require('../src/pathResolver');
const Api = require('../index');
const Response = require('../src/response');

chai.use(sinonChai);

let sandbox;
beforeEach(() => { sandbox = sinon.sandbox.create(); });
afterEach(() => sandbox.restore());

describe('index.js', () => {
	describe('middleware', () => {
		it('requestMiddleware', async () => {
			let value = false;
			let options = {
				requestMiddleware(request) {
					value = true;
					return request;
				}
			};
			let api = new Api(options);
			api.get('/test', () => {
				return { statusCode: 200 };
			});

			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/test',
				path: '/test'
			});
			assert.strictEqual(output.statusCode, 200, 'Status code should be 200');
			assert.isTrue(value);
		});

		it('responseMiddleware', async () => {
			let value = false;
			let options = {
				responseMiddleware(request, response) {
					value = true;
					return response;
				}
			};
			let api = new Api(options, () => {});
			api.get('/test', () => {
				return { statusCode: 200 };
			});

			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/test',
				path: '/test'
			});
			assert.strictEqual(output.statusCode, 200, 'Status code should be 200');
			assert.isTrue(value);
		});

		it('errorMiddleware', async () => {
			let value = false;
			let testError = { title: 'This is an error' };
			let options = {
				errorMiddleware(request, error) {
					value = true;
					return error;
				}
			};
			let api = new Api(options, () => {});
			api.get('/test', () => {
				throw testError;
			});

			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/test',
				path: '/test'
			});
			assert.strictEqual(output.statusCode, 500, 'Status code should be 500');
			assert.isTrue(value);
		});

		it('errorMiddleware throws itself', async () => {
			let value = false;
			let testError = { title: 'This is an error' };
			let options = {
				errorMiddleware(request, error) {
					value = true;
					throw error;
				}
			};
			let api = new Api(options, () => {});
			api.get('/test', () => {
				throw testError;
			});

			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/test',
				path: '/test'
			});
			assert.strictEqual(output.statusCode, 500, 'Status code should be 500');
			assert.isTrue(value);
		});

		it('bothMiddleware', async () => {
			let value = 0;
			let options = {
				requestMiddleware(request) {
					value++;
					return request;
				},
				responseMiddleware(request, response) {
					value++;
					return response;
				}
			};
			let api = new Api(options, () => {});
			api.get('/test', () => {
				return { statusCode: 200 };
			});

			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/test',
				path: '/test'
			});
			assert.strictEqual(output.statusCode, 200, 'Status code should be 200');
			assert.strictEqual(value, 2);
		});
	});
	describe('methods', () => {
		it('Check expected API Methods', () => {
			let api = new Api(null, () => {});
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
			let api = new Api(null, () => {});
			assert(api.Authorizer === null);
		});
		it('check call to false authorizerFunc', () => {
			try {
				let api = new Api(null, () => {});
				api.SetAuthorizer(() => false);
				let result = api.Authorizer();
				//result should be false;
				assert(!result);
			} catch (e) {
				console.error(e);
				assert(false, e.toString());
			}
		});
		it('check call to false authorizerFunc', async () => {
			let api = new Api(null, () => {});
			api.SetAuthorizer(() => {
				return Promise.reject('Unauthorized');
			});
			try {
				await api.Authorizer();
				throw 'Should have failed';
			} catch (e) {
				return;
			}
		});
		it('check call to success authorizerFunc', async () => {
			let api = new Api(null, () => {});
			api.SetAuthorizer(() => {
				return Promise.resolve();
			});
			await api.Authorizer();
		});
		it('check call to success authorizer', async () => {
			let api = new Api(null, () => {});
			api.SetAuthorizer(() => {
				return Promise.resolve();
			});
			await api.Authorizer();
		});
		it('check call to failure authorizer', async () => {
			let api = new Api(null, () => {});
			api.SetAuthorizer(() => {
				return Promise.reject('Fail this test');
			});
			
			try {
				let result = await api.Authorizer();
				throw `Should not have passed: ${result}`;
			} catch (e) {
				return;
			}
		});
		it('check call to failure authorizer handler', async () => {
			let api = new Api(null, () => {});
			try {
				await api.handler({
					type: 'REQUEST',
					methodArn: 'authorizationHandlerTest'
				});
				throw 'This test should have failed';
			} catch (e) {
				return;
			}
		});
		it('check call to failure when no authorizer defined', async () => {
			try {
				let api = new Api(null, () => {});
				await api.handler({
					type: 'REQUEST',
					methodArn: 'authorizationHandlerTest'
				});
				throw 'This test should have failed';
			} catch (e) {
				return;
			}
		});
	});
	describe('handler', () => {
		it('check call to ANY handler', async () => {
			let pathResolverMock = sandbox.mock(PathResolver.prototype);
			pathResolverMock.expects('storePath').returns({});
			pathResolverMock.expects('resolvePath').returns(null);
			let expectedResult = { value: 5 };
			let api = new Api(null, () => {});
			api.any('/test', () => {
				return new Response(expectedResult);
			});

			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/test',
				path: '/test'
			});
			
			assert.deepEqual(JSON.parse(output.body), expectedResult, 'Output data does not match expected.');
			assert.strictEqual(output.statusCode, 200, 'Status code should be 200');
		});
		it('check call to GET handler', async () => {
			let pathResolverMock = sandbox.mock(PathResolver.prototype);
			pathResolverMock.expects('storePath').returns({});
			pathResolverMock.expects('resolvePath').returns(null);

			let expectedResult = { value: 5 };
			let api = new Api(null, () => {});
			api.get('/test', () => {
				return new Response(expectedResult);
			});

			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/test',
				path: '/test'
			});
			assert.deepEqual(JSON.parse(output.body), expectedResult, 'Output data does not match expected.');
			assert.strictEqual(output.statusCode, 200, 'Status code should be 200');
		});
		it('check promise result to GET handler', async () => {
			let pathResolverMock = sandbox.mock(PathResolver.prototype);
			pathResolverMock.expects('storePath').returns({});
			pathResolverMock.expects('resolvePath').returns(null);
			let expectedResult = { value: 5 };
			let api = new Api(null, () => {});
			api.get('/test', () => {
				return Promise.resolve(new Response(expectedResult));
			});

			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/test',
				path: '/test'
			});
			assert.deepEqual(JSON.parse(output.body), expectedResult, 'Output data does not match expected.');
			assert.strictEqual(output.statusCode, 200, 'Status code should be 200');
		});
		it('check promise result to GET handler with object', async () => {
			let expectedResult = { value: 5 };
			let api = new Api(null, () => {});
			api.get('/test', () => {
				return Promise.resolve({ body: expectedResult, statusCode: 201 });
			});

			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/test',
				path: '/test'
			});

			assert.deepEqual(JSON.parse(output.body), expectedResult, 'Output data does not match expected.');
			assert.strictEqual(output.statusCode, 201, 'Status code should be 200');
		});
		it('check promise rejection to GET handler', async () => {
			let pathResolverMock = sandbox.mock(PathResolver.prototype);
			pathResolverMock.expects('storePath').returns({});
			pathResolverMock.expects('resolvePath').returns(null);

			let expectedResult = { value: 5 };
			let api = new Api(null, () => {});
			api.get('/test', () => {
				return Promise.reject(expectedResult);
			});

			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/test',
				path: '/test'
			});

			assert.deepEqual(JSON.parse(output.body), expectedResult, 'Output data does not match expected.');
			assert.strictEqual(output.statusCode, 500, 'Promise rejections should be 500');
		});
		it('check promise rejection to GET handler with object', async () => {
			let expectedResult = { value: 5 };
			let api = new Api(null, () => {});
			api.get('/test', () => {
				throw { body: expectedResult, statusCode: 500 };
			});

			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/test',
				path: '/test'
			});
			assert.deepEqual(JSON.parse(output.body), expectedResult, 'Output data does not match expected.');
			assert.strictEqual(output.statusCode, 500, 'Promise rejections should be 500');
		});
		it('check exception in GET handler', async () => {
			let pathResolverMock = sandbox.mock(PathResolver.prototype);
			pathResolverMock.expects('storePath').returns({});
			pathResolverMock.expects('resolvePath').returns(null);
			let expectedResult = { value: 5 };
			let api = new Api(null, () => {});
			api.get('/test', () => {
				throw expectedResult;
			});

			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/test',
				path: '/test'
			});
			assert.deepEqual(JSON.parse(output.body), expectedResult, 'Output data does not match expected.');
			assert.strictEqual(output.statusCode, 500, 'Error should be a 500 on a throw');
		});
		it('check exception in GET handler with object', async () => {
			let pathResolverMock = sandbox.mock(PathResolver.prototype);
			pathResolverMock.expects('storePath').returns({});
			pathResolverMock.expects('resolvePath').returns(null);

			let expectedResult = { value: 5 };
			let api = new Api(null, () => {});
			api.get('/test', () => {
				throw { body: expectedResult, statusCode: 401 };
			});

			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/test',
				path: '/test'
			});
			assert.deepEqual(JSON.parse(output.body), expectedResult, 'Output data does not match expected.');
			assert.strictEqual(output.statusCode, 401, 'Error should be a 401 on a throw that matches response object');
		});
		it('validate default parameters', async () => {
			let expectedResult = { value: 5 };
			let api = new Api(null, () => {});
			api.get('/test', request => {
				assert.isNotNull(request.pathParameters);
				assert.isNotNull(request.stageVariables);
				assert.isNotNull(request.queryStringParameters);
				return Promise.resolve({ body: expectedResult, statusCode: 201 });
			});

			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/test',
				path: '/test'
			});
			assert.deepEqual(JSON.parse(output.body), expectedResult, 'Output data does not match expected.');
			assert.strictEqual(output.statusCode, 201, 'Status code should be 200');
		});
		it('validate default parameters when api gateways are null', async () => {
			let expectedResult = { value: 5 };
			let api = new Api(null, () => {});
			api.get('/test', request => {
				assert.isNotNull(request.path);
				assert.isNotNull(request.stage);
				assert.isNotNull(request.query);
				return { body: expectedResult, statusCode: 201 };
			});

			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/test',
				stageVariables: null,
				pathParameters: null,
				path: '/test',
				queryStringParameters: null
			});
			assert.deepEqual(JSON.parse(output.body), expectedResult, 'Output data does not match expected.');
			assert.strictEqual(output.statusCode, 201, 'Status code should be 200');
		});
		it('validate default parameters do not override', async () => {
			let expectedQueryStringParameters = { h: 1 };
			let expectedPathParameters = { h: 2 };
			let expcetedStageVariables = { h: 3 };

			let expectedResult = { value: 5 };
			let api = new Api(null, () => {});
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
				path: '/test',
				queryStringParameters: expectedQueryStringParameters
			}, {});
			assert.deepEqual(JSON.parse(output.body), expectedResult, 'Output data does not match expected.');
			assert.strictEqual(output.statusCode, 201, 'Status code should be 200');
		});
		it('check for well proxy path change', async () => {
			let pathResolverMock = sandbox.mock(PathResolver.prototype);
			let expectedResult = { value: 5 };
			pathResolverMock.expects('storePath').returns({});
			pathResolverMock.expects('resolvePath').returns({
				value: {
					Handler() {
						return new Response(expectedResult);
					},
					Options: {}
				}
			});

			let api = new Api(null, () => {});
			api.get('/test', () => {
				return new Response(expectedResult);
			});

			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/{proxy+}',
				pathParameters: {
					proxy: 'test'
				},
				path: '/test-stage/test'
			});
			assert.deepEqual(JSON.parse(output.body), expectedResult, 'Output data does not match expected.');
			assert.strictEqual(output.statusCode, 200, 'Status code should be 200');
		});
		it('check for authorizer proxy path change', async () => {
			let api = new Api(null, () => {});
			api.setAuthorizer(request => {
				return request.path === '/test';
			});

			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/{proxy+}',
				pathParameters: {
					proxy: 'test'
				},
				path: '/test-stage/test',
				type: 'REQUEST',
				methodArn: 'methodArn'
			});
			assert.deepEqual(output, true, 'Output data does not match expected.');
		});
		it('check proxy path with prefix resolves correctly', async () => {
			let api = new Api(null, () => {});
			api.get('/v1/resource', () => {
				return true;
			});
			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/v1/{proxy+}',
				pathParameters: {
					proxy: 'resource'
				},
				path: '/test-stage/v1/resource'
			});
			assert.deepEqual(output.body, 'true', 'Output data does not match expected.');
		});
		it('check proxy path without prefix resolves correctly', async () => {
			let api = new Api(null, () => {});
			api.get('/resource', () => {
				return true;
			});
			let output = await api.handler({
				httpMethod: 'GET',
				resource: '/{proxy+}',
				pathParameters: {
					proxy: 'resource'
				},
				path: '/test-stage/v1/resource'
			});
			assert.deepEqual(output.body, 'true', 'Output data does not match expected.');
		});
	});
});
