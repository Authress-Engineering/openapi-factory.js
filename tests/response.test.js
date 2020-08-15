const { describe, it } = require('mocha');
const { expect } = require('chai');
const Response = require('../src/response');

describe('response.js', () => {
	describe('constructor()', async () => {
		let tests = {};
		tests[Symbol.iterator] = function* () {
			let testObject = { field: 'value' };
			let stringValue = 'unit-test-string';
			let bufferObject = Buffer.from(stringValue);
			yield {
				name: 'body is json string when null',
				params: [],
				expectedResultObject: {
					statusCode: 200,
					headers: {
						'Access-Control-Allow-Origin': '*'
					},
					multiValueHeaders: {}
				}
			};

			yield {
				name: 'body is json string',
				params: [testObject],
				expectedResultObject: {
					body: JSON.stringify(testObject),
					statusCode: 200,
					headers: {
						'Content-Type': 'application/links+json',
						'Access-Control-Allow-Origin': '*'
					},
					multiValueHeaders: {}
				}
			};

			yield {
				name: 'body is binary',
				params: [bufferObject],
				expectedResultObject: {
					body: bufferObject,
					statusCode: 200,
					headers: {
						'Content-Type': 'application/octet-stream',
						'Access-Control-Allow-Origin': '*'
					},
					multiValueHeaders: {}
				}
			};

			yield {
				name: 'body is json full object is set as first parameter',
				params: [testObject, 201],
				expectedResultObject: {
					body: JSON.stringify(testObject),
					statusCode: 201,
					headers: {
						'Content-Type': 'application/links+json',
						'Access-Control-Allow-Origin': '*'
					},
					multiValueHeaders: {}
				}
			};

			yield {
				name: 'No body set with status code',
				params: [{
					statusCode: 400
				}],
				expectedResultObject: {
					statusCode: 400,
					headers: {
						'Access-Control-Allow-Origin': '*'
					},
					multiValueHeaders: {}
				}
			};

			yield {
				name: 'No body set with headers',
				params: [{
					headers: {
						'Key': 'Value',
						'Content-Type': 'Override'
					}
				}],
				expectedResultObject: {
					statusCode: 200,
					headers: {
						'Access-Control-Allow-Origin': '*'
					},
					multiValueHeaders: {
						'Content-Type': ['Override'],
						'Key': ['Value']
					}
				}
			};
		};
		for (let test of tests) {
			it(test.name, () => {
				let response = new Response(...test.params);
				expect(response).to.eql(test.expectedResultObject);
			});
		}
	});
});
