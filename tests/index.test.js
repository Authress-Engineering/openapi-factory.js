'use strict';
const esprima = require('esprima');
const mocha = require('mocha');
const chai = require('chai');
const fs = require('fs');
const path = require('path');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

const MapExpander = require('../src/mapExpander');

const assert = chai.assert;
const expect = chai.expect;
chai.use(sinonChai);

let sandbox;
beforeEach(() => { sandbox = sinon.sandbox.create(); });
afterEach(() => sandbox.restore());

describe('index.js', function() {
	describe('Syntax', function() {
		it('Should be valid Javascript', function() {
			try {
				let userStringToTest = fs.readFileSync(path.resolve('index.js'));
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
			assert.isFunction(api.any, 'ANY has not been defined.');
		});
	});
	describe('authorizer', function() {
		it('check call to default authorizerFunc', function() {
			try {
				var Api = require('../index');
				var api = new Api();
				assert(api.Authorizer.AuthorizerFunc === null);
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
		it('check call to false authorizerFunc', function(done) {
			try {
				var Api = require('../index');
				var api = new Api();
				api.SetAuthorizer(() => {
					return Promise.reject('Unauthorized');
				});
				var result = api.Authorizer.AuthorizerFunc()
				.then(bad => {
					done('Should have failed');
				}, correctFailure => {
					done();
				});
			}
			catch(e) {
				console.error(e);
				assert(false, e.toString());
			}
		});
		it('check call to success authorizerFunc', function(done) {
			try {
				var Api = require('../index');
				var api = new Api();
				api.SetAuthorizer(() => {
					return Promise.resolve();
				});
				var result = api.Authorizer.AuthorizerFunc()
				.then(success => {
					done();
				}, correctFailure => {
					done(`Should not have failed: ${correctFailure}`);
				});
			}
			catch(e) {
				console.error(e);
				assert(false, e.toString());
			}
		});
		it('check call to success authorizer', function(done) {
			try {
				var Api = require('../index');
				var api = new Api();
				api.SetAuthorizer(() => {
					return Promise.resolve();
				});
				var result = api.Authorizer.AuthorizerFunc()
				.then(success => {
					done();
				}, incorrectFailure => {
					done(`Should not have failed: ${incorrectFailure}`);
				});
			}
			catch(e) {
				console.error(e);
				assert(false, e.toString());
			}
		});
		it('check call to failure authorizer', function(done) {
			try {
				var Api = require('../index');
				var api = new Api();
				api.SetAuthorizer(() => {
					return Promise.reject('Fail this test');
				});
				api.Authorizer.AuthorizerFunc()
				.then(incorrectSuccess => {
					done(`Should not have passed: ${incorrectSuccess}`);
				}, correctFailure => {
					done();
				});
			}
			catch(e) {
				console.error(e);
				assert(false, e.toString());
			}
		});
		it('check call to failure authorizer handler', function(done) {
			try {
				var Api = require('../index');
				var api = new Api();
				api.SetAuthorizer(() => {
					return Promise.reject('Fail this test');
				});
				api.handler({
					type: 'TOKEN',
					authorizationToken: 'token',
					methodArn: 'authorizationHandlerTest'
				}, {}, (successfulFailure, incorrectSuccess) => { incorrectSuccess ? done('This test should have failed') : done(); });
			}
			catch(e) {
				console.error(e);
				assert(false, e.toString());
			}
		});
	});
	describe('handler', function() {
		it('check call to ANY handler', function(done) {
			let mapExpanderMock = sandbox.mock(MapExpander.prototype);
			mapExpanderMock.expects('expandMap').returns({});
			mapExpanderMock.expects('getMapValue').returns(null);
			try {
				var expectedResult = {'Value': 5};
				var Api = require('../index');
				var api = new Api();
				api.any('/test', (request) => {
					return new Api.Response(expectedResult);
				});

				api.handler({
					httpMethod: 'GET',
					resource: '/test'
				}, {}, (_, x) => x)
				.then(output => {
					assert.deepEqual(JSON.parse(output.body), expectedResult, `Output data does not match expected.`);
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
		it('check call to GET handler', function(done) {
			let mapExpanderMock = sandbox.mock(MapExpander.prototype);
			mapExpanderMock.expects('expandMap').returns({});
			mapExpanderMock.expects('getMapValue').returns(null);
			try {
				var expectedResult = {'Value': 5};
				var Api = require('../index');
				var api = new Api();
				api.get('/test', (request) => {
					return new Api.Response(expectedResult);
				});

				api.handler({
					httpMethod: 'GET',
					resource: '/test'
				}, {}, (_, x) => x)
				.then(output => {
					assert.deepEqual(JSON.parse(output.body), expectedResult, `Output data does not match expected.`);
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
			let mapExpanderMock = sandbox.mock(MapExpander.prototype);
			mapExpanderMock.expects('expandMap').returns({});
			mapExpanderMock.expects('getMapValue').returns(null);
			try {
				var expectedResult = {'Value': 5};
				var Api = require('../index');
				var api = new Api();
				api.get('/test', (request) => {
					return Promise.resolve(new Api.Response(expectedResult));
				});

				api.handler({
					httpMethod: 'GET',
					resource: '/test'
				}, {}, (_, x) => x)
				.then(output => {
					assert.deepEqual(JSON.parse(output.body), expectedResult, `Output data does not match expected.`);
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
			let mapExpanderMock = sandbox.mock(MapExpander.prototype);
			mapExpanderMock.expects('expandMap').returns({});
			mapExpanderMock.expects('getMapValue').returns(null);
			try {
				var expectedResult = {'Value': 5};
				var Api = require('../index');
				var api = new Api();
				api.get('/test', (request) => {
					return Promise.reject(expectedResult);
				});

				api.handler({
					httpMethod: 'GET',
					resource: '/test'
				}, {}, (_, x) => x)
				.then(output => {
					assert.deepEqual(JSON.parse(output.body), expectedResult, `Output data does not match expected.`);
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
			let mapExpanderMock = sandbox.mock(MapExpander.prototype);
			mapExpanderMock.expects('expandMap').returns({});
			mapExpanderMock.expects('getMapValue').returns(null);
			try {
				var expectedResult = {'Value': 5};
				var Api = require('../index');
				var api = new Api();
				api.get('/test', (request) => {
					throw expectedResult;
				});

				api.handler({
					httpMethod: 'GET',
					resource: '/test'
				}, {}, (_, x) => x)
				.then(output => {
					assert.deepEqual(JSON.parse(output.body), expectedResult, `Output data does not match expected.`);
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
	});
});