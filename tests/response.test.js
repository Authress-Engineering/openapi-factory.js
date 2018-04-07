'use strict';
const { describe, it } = require('mocha');
const assert = require('chai').assert;

const responsePath = '../src/response.js';

describe('response.js', function() {
	describe('validate contructor', function() {
		it('body is json string when null', function() {
			let Response = require(responsePath);
			let response = new Response();
			assert.equal(response.body, JSON.stringify({}));
		});
		it('body is json string', function() {
			let Response = require(responsePath);
			let testObject = {field: 'value'};
			let response = new Response(testObject);
			assert.equal(response.body, JSON.stringify(testObject));
			assert.equal(response.headers['Content-Type'], 'application/json');
		});
		it('body is json binary', function() {
			let Response = require(responsePath);
			let stringTest = 'unit test';
			let response = new Response(Buffer.from(stringTest));
			assert.equal(response.body.toString('utf-8'), stringTest);
			assert.equal(response.headers['Content-Type'], 'application/octet-stream');
		});
		it('body is json full object is set as first parameter', function() {
			let Response = require(responsePath);
			let testObject = { field: 'value' };
			let testResponse = {
				body: testObject,
				statusCode: 201
			};
			let response = new Response(testResponse);
			assert.equal(response.body, JSON.stringify(testObject));
			assert.equal(response.statusCode, 201);
			assert.equal(response.headers['Content-Type'], 'application/json');
		});
	});
});