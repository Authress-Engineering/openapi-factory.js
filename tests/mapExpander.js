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

describe('mapExpander.js', () => {
	describe('expandMap', () => {
		const testValue = 'test-value';
		let testCases = [
			{
				name: 'empty map',
				inputMap: {},
				path: '/',
				expectedOutputMap: {
					'': {
						_value: testValue 
					}
				}
			},
			{
				name: 'add items to map',
				inputMap: {},
				path: '/items',
				expectedOutputMap: {
					'items': {
						_value: testValue 
					}
				}
			},
			{
				name: 'merge maps',
				inputMap: {
					'items': {
						_value: 'items-value'
					}
				},
				path: '/resource',
				expectedOutputMap: {
					'items': {
						_value: 'items-value' 
					},
					'resource': {
						_value: testValue
					}
				}
			},
			{
				name: 'sub resources with wild cards',
				inputMap: {},
				path: '/resource/{resource}/subresource/{subresource}',
				expectedOutputMap: {
					'resource': {
						'*': {
							'subresource': {
								'*': {
									_value: testValue
								}
							}
						}
					}
				}
			},
			{
				name: 'multiple resources with the same top level paths',
				inputMap: {
					'resource': {
						_value: 'resource-value'
					}
				},
				path: '/resource/subpath',
				expectedOutputMap: {
					'resource': {
						_value: 'resource-value',
						'subpath': {
							_value: testValue
						}
					}
				}
			}
		];
		testCases.map(test => {
			it(test.name, () => {
				let mapExpander = new MapExpander();
				let resultmap = mapExpander.expandMap(test.inputMap, test.path, testValue);
				expect(resultmap).to.eql(test.expectedOutputMap);
			});
		});
	});
	describe('getMapValue', () => {
		const expectedValue = 'test-value';
		let testCases = [
			{
				name: 'get route function',
				path: '/',
				inputMap: {
					'': {
						_value: expectedValue
					}
				},
				expectedValue: expectedValue
			},
			{
				name: 'first level map',
				path: '/resource',
				inputMap: {
					'resource': {
						_value: expectedValue
					}
				},
				expectedValue: expectedValue
			},
			{
				name: 'dynamic value',
				path: '/resource/resourceId',
				inputMap: {
					'resource': {
						'*': {
							_value: expectedValue
						}
					}
				},
				expectedValue: expectedValue
			},
			{
				name: 'multiple dynamic values',
				path: '/resource/resourceId/subresource/subId',
				inputMap: {
					'resource': {
						'*': {
							'subresource': {
								'*': {
									_value: expectedValue
								}
							}
						}
					}
				},
				expectedValue: expectedValue
			},
			{
				name: 'match explicit before wild card',
				path: '/resource/resourceId',
				inputMap: {
					'resource': {
						'resourceId': {
							_value: expectedValue
						},
						'*': {
							_value: 'bad-value'
						}
					}
				},
				expectedValue: expectedValue
			},
			{
				name: 'path not found',
				path: '/items/itemId/subItem',
				inputMap: {
					'resource': {
						'*': {
							_value: 'bad-value'
						}
					}
				},
				expectedValue: null
			},
			{
				name: 'proxy path is null found',
				path: null,
				inputMap: {
					'': {
						_value: expectedValue
					}
				},
				expectedValue: expectedValue
			},
			{
				name: 'top level check',
				path: '/',
				inputMap: {
					'': {
						_value: expectedValue
					}
				},
				expectedValue: expectedValue
			}
		];
		testCases.map(test => {
			it(test.name, () => {
				let mapExpander = new MapExpander();
				let resultValue = mapExpander.getMapValue(test.inputMap, test.path);
				expect(resultValue).to.equal(test.expectedValue);
			});
		});
	});
});