'use strict;'
const esprima = require('esprima');
const mocha = require('mocha');
const assert = require('chai').assert;
const fs = require('fs');
const path = require('path');

const responsePath = '../src/response.js';

describe('response.js', function() {
	describe('Syntax', function() {
		it('Should be valid Javascript', function() {
			try {
				let userStringToTest = fs.readFileSync(path.resolve('src/response.js'));
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
				let response = require(responsePath);
				assert(true);
			}
			catch(e) {
				console.error(e);
				assert(false, JSON.stringify(e, null, 2));
			}
		});
	});
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
	});
});