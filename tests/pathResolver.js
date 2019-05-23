require('error-object-polyfill');
const { describe, it } = require('mocha');
const { expect } = require('chai');

const PathResolver = require('../src/pathResolver');

describe('pathResolver.js', () => {
	describe('storePath', () => {
		const testValue = 'test-value';
		let testCases = [
			{
				name: 'empty map',
				inputMap: {},
				path: '/',
				expectedOutputMap: {
					'': {
						_tokens: [],
						_value: testValue
					}
				}
			},
			{
				name: 'add items to map',
				inputMap: {},
				path: '/items',
				expectedOutputMap: {
					items: {
						_tokens: [],
						_value: testValue
					}
				}
			},
			{
				name: 'merge maps',
				inputMap: {
					items: {
						_value: 'items-value'
					}
				},
				path: '/resource',
				expectedOutputMap: {
					items: {
						_value: 'items-value'
					},
					resource: {
						_tokens: [],
						_value: testValue
					}
				}
			},
			{
				name: 'throw exception on duplicate item',
				inputMap: {
					items: {
						_value: 'items-value'
					}
				},
				path: '/items',
				expectedError: new Error('Path already exists: /items'),
				expectedOutputMap: null
			},
			{
				name: 'sub resources with wild cards',
				inputMap: {},
				path: '/resource/{resource}/subresource/{subresource}',
				expectedOutputMap: {
					resource: {
						'*': {
							subresource: {
								'*': {
									_tokens: ['resource', 'subresource'],
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
					resource: {
						_value: 'resource-value',
						subpath1: {
							_tokens: [],
							_value: 'subvalue1'
						}

					}
				},
				path: '/resource/subpath2',
				expectedOutputMap: {
					resource: {
						_value: 'resource-value',
						subpath1: {
							_tokens: [],
							_value: 'subvalue1'
						},
						subpath2: {
							_tokens: [],
							_value: testValue
						}
					}
				}
			},
			{
				name: 'multiple wildcard resources with the different low level paths',
				inputMap: {
					resource: {
						'*': {
							subpath1: {
								_value: 'subvalue1',
								_tokens: ['subtoken1']
							}
						}
					}
				},
				path: '/resource/{subtoken2}/subpath2',
				expectedOutputMap: {
					resource: {
						'*': {
							subpath1: {
								_value: 'subvalue1',
								_tokens: ['subtoken1']
							},
							subpath2: {
								_value: testValue,
								_tokens: ['subtoken2']
							}
						}
					}
				}
			}
		];
		testCases.map(test => {
			it(test.name, () => {
				let pathResolver = new PathResolver();
				let resultMap = null;
				try {
					resultMap = pathResolver.storePath(test.inputMap, test.path, testValue);
					expect(resultMap).to.eql(test.expectedOutputMap);
					expect(!!test.expectedError).to.eql(false);
				} catch (error) {
					if (test.expectedError) {
						expect(error.message).to.eql(test.expectedError.message);
					} else {
						throw error;
					}
				}
			});
		});
	});
	describe('resolvePath', () => {
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
				expectedValue: {
					tokens: {},
					value: expectedValue
				}
			},
			{
				name: 'first level map',
				path: '/resource',
				inputMap: {
					resource: {
						_value: expectedValue
					}
				},
				expectedValue: {
					tokens: {},
					value: expectedValue
				}
			},
			{
				name: 'dynamic value',
				path: '/resource/resourceId',
				inputMap: {
					resource: {
						'*': {
							_value: expectedValue,
							_tokens: ['token1']
						}
					}
				},
				expectedValue: {
					value: expectedValue,
					tokens: {
						token1: 'resourceId'
					}
				}
			},
			{
				name: 'multiple dynamic values',
				path: '/resource/resourceId/subresource/subId',
				inputMap: {
					resource: {
						'*': {
							subresource: {
								'*': {
									_tokens: ['token1', 'token2'],
									_value: expectedValue
								}
							}
						}
					}
				},
				expectedValue: {
					value: expectedValue,
					tokens: {
						token1: 'resourceId',
						token2: 'subId'
					}
				}
			},
			{
				name: 'multiple dynamic values as empty value',
				path: '/resource//subresource/subId',
				inputMap: {
					resource: {
						'*': {
							subresource: {
								'*': {
									_tokens: ['token1', 'token2'],
									_value: expectedValue
								}
							}
						}
					}
				},
				expectedValue: {
					value: expectedValue,
					tokens: {
						token1: null,
						token2: 'subId'
					}
				}
			},
			{
				name: 'match explicit before wild card',
				path: '/resource/resourceId',
				inputMap: {
					resource: {
						'resourceId': {
							_value: expectedValue
						},
						'*': {
							_value: 'bad-value'
						}
					}
				},
				expectedValue: {
					tokens: {},
					value: expectedValue
				}
			},
			{
				name: 'path not found',
				path: '/items/itemId/subItem',
				inputMap: {
					resource: {
						'*': {
							_value: 'bad-value'
						}
					}
				},
				expectedValue: null
			},
			{
				name: 'proxy path is null',
				path: null,
				inputMap: {
					'': {
						_value: expectedValue
					}
				},
				expectedValue: {
					tokens: {},
					value: expectedValue
				}
			},
			{
				name: 'top level check',
				path: '/',
				inputMap: {
					'': {
						_value: expectedValue
					}
				},
				expectedValue: {
					tokens: {},
					value: expectedValue
				}
			},
			{
				name: 'multiple wildcards at the same level',
				path: '/resource/resourceId/subresource1',
				inputMap: {
					resource: {
						'*': {
							subresource1: {
								_tokens: ['token1'],
								_value: expectedValue
							},
							subresource2: {
								_tokens: ['token2'],
								_value: 'bad-value'
							}
						}
					}
				},
				expectedValue: {
					value: expectedValue,
					tokens: {
						token1: 'resourceId'
					}
				}
			},
			{
				name: 'multiple wildcards at the same level second one check',
				path: '/resource/resourceId/subresource2',
				inputMap: {
					resource: {
						'*': {
							subresource1: {
								_tokens: ['token1'],
								_value: 'bad-value'
							},
							subresource2: {
								_tokens: ['token2'],
								_value: expectedValue
							}
						}
					}
				},
				expectedValue: {
					value: expectedValue,
					tokens: {
						token2: 'resourceId'
					}
				}
			},
			{
				name: 'path with stage should return null',
				path: 'test/resource/resourceId/subresource1',
				inputMap: {
					resource: {
						'*': {
							subresource1: {
								_tokens: ['token1'],
								_value: 'bad-value'
							},
							subresource2: {
								_tokens: ['token2'],
								_value: expectedValue
							}
						}
					}
				},
				expectedValue: null
			}
		];
		testCases.map(test => {
			it(test.name, () => {
				let pathResolver = new PathResolver();
				let resultValue = pathResolver.resolvePath(test.inputMap, test.path);
				expect(resultValue).to.eql(test.expectedValue);
			});
		});
	});
});
