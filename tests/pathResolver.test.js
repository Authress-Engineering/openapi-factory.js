require('error-object-polyfill');
const { describe, it } = require('mocha');
const { expect } = require('chai');

const PathResolver = require('../src/pathResolver');

const method = 'METHOD';
const otherMethod = 'OTHER';

describe('pathResolver.js', () => {
  describe('storePath', () => {
    const testValue = 'test-value';
    const tests = {};
    tests[Symbol.iterator] = function* () {
      yield {
        name: 'empty map',
        inputMap: {},
        path: '/',
        expectedOutputMap: {
          '': {
            _tokens: [],
            _methods: { [method]: testValue }
          }
        }
      };

      yield {
        name: 'add items to map',
        inputMap: {},
        path: '/items',
        expectedOutputMap: {
          items: {
            _tokens: [],
            _methods: { [method]: testValue }
          }
        }
      };

      yield {
        name: 'strip trailing slash',
        inputMap: {},
        path: '/items/',
        expectedOutputMap: {
          items: {
            _tokens: [],
            _methods: { [method]: testValue }
          }
        }
      };

      yield {
        name: 'merge maps',
        inputMap: {
          items: {
            _methods: { [method]: 'items-value' }
          }
        },
        path: '/resource',
        expectedOutputMap: {
          items: {
            _methods: { [method]: 'items-value' }
          },
          resource: {
            _tokens: [],
            _methods: { [method]: testValue }
          }
        }
      };

      yield {
        name: 'throw exception on duplicate item',
        inputMap: {
          items: {
            _methods: { [method]: 'items-value' }
          }
        },
        path: '/items',
        expectedError: new Error('Path already exists: /items'),
        expectedOutputMap: null
      };

      yield {
        name: 'sub resources with wild cards',
        inputMap: {},
        path: '/resource/{resource}/subResource/{subResource}',
        expectedOutputMap: {
          resource: {
            '*': {
              subResource: {
                '*': {
                  _tokens: ['resource', 'subResource'],
                  _methods: { [method]: testValue }
                }
              }
            }
          }
        }
      };

      yield {
        name: 'sub resources with greedy matcher',
        inputMap: {},
        path: '/resource/{resource}/subResources/{proxy+}',
        expectedOutputMap: {
          resource: {
            '*': {
              subResources: {
                '*': {
                  _tokens: ['resource', 'proxy'],
                  _methods: { [method]: testValue },
                  _greedy: true
                }
              }
            }
          }
        }
      };

      yield {
        name: 'multiple resources with the same top level paths',
        inputMap: {
          resource: {
            _methods: { [method]: 'resource-value' },
            subpath1: {
              _tokens: [],
              _methods: { [method]: 'subValue1' }
            }

          }
        },
        path: '/resource/subpath2',
        expectedOutputMap: {
          resource: {
            _methods: { [method]: 'resource-value' },
            subpath1: {
              _tokens: [],
              _methods: { [method]: 'subValue1' }
            },
            subpath2: {
              _tokens: [],
              _methods: { [method]: testValue }
            }
          }
        }
      };

      yield {
        name: 'multiple wildcard resources with the different low level paths',
        inputMap: {
          resource: {
            '*': {
              subpath1: {
                _methods: { [method]: 'subValue1' },
                _tokens: ['subToken1']
              }
            }
          }
        },
        path: '/resource/{subToken2}/subpath2',
        expectedOutputMap: {
          resource: {
            '*': {
              subpath1: {
                _methods: { [method]: 'subValue1' },
                _tokens: ['subToken1']
              },
              subpath2: {
                _methods: { [method]: testValue },
                _tokens: ['subToken2']
              }
            }
          }
        }
      };
    };

    for (let test of tests) {
      it(test.name, () => {
        let pathResolver = new PathResolver();
        let resultMap = null;
        try {
          resultMap = pathResolver.storePath(test.inputMap, method, test.path, testValue);
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
    }
  });
  describe('resolvePath', () => {
    const expectedValue = 'mapObject-preset-test-value-{}';
    const tests = {};
    tests[Symbol.iterator] = function* () {
      yield {
        name: 'get route function',
        path: '/',
        inputMap: {
          '': {
            _methods: { [method]: expectedValue }
          }
        },
        expectedValue: {
          tokens: {},
          methods: [method],
          value: expectedValue
        }
      };

      yield {
        name: 'ignore trailing slash',
        path: '/resource/',
        inputMap: {
          resource: {
            _methods: { [method]: expectedValue }
          }
        },
        expectedValue: {
          tokens: {},
          methods: [method],
          value: expectedValue
        }
      };

      yield {
        name: 'first level map',
        path: '/resource',
        inputMap: {
          resource: {
            _methods: { [method]: expectedValue }
          }
        },
        expectedValue: {
          tokens: {},
          methods: [method],
          value: expectedValue
        }
      };
      yield {
        name: 'dynamic value',
        path: '/resource/resourceId',
        inputMap: {
          resource: {
            '*': {
              _methods: { [method]: expectedValue },
              _tokens: ['token1']
            }
          }
        },
        expectedValue: {
          value: expectedValue,
          methods: [method],
          tokens: {
            token1: 'resourceId'
          }
        }
      };
      yield {
        name: 'dynamic value as null',
        path: '/resource//',
        inputMap: {
          resource: {
            '*': {
              _methods: { [method]: expectedValue },
              _tokens: ['token1']
            }
          }
        },
        expectedValue: {
          value: expectedValue,
          methods: [method],
          tokens: {
            token1: null
          }
        }
      };
      yield {
        name: 'prefer non-null match',
        path: '/resource/',
        inputMap: {
          resource: {
            '_methods': { [method]: expectedValue },
            '*': {
              _methods: { [method]: 'INVALID' },
              _tokens: ['token1']
            }
          }
        },
        expectedValue: {
          value: expectedValue,
          methods: [method],
          tokens: {}
        }
      };
      const rawResourceTokenValue = 'foo&bar|path:&-/some-more-encoded-stuff';
      yield {
        name: 'dynamic value with url encoded component',
        path: `/resource/${encodeURIComponent(rawResourceTokenValue)}`,
        inputMap: {
          resource: {
            '*': {
              _methods: { [method]: expectedValue },
              _tokens: ['token1']
            }
          }
        },
        expectedValue: {
          value: expectedValue,
          methods: [method],
          tokens: {
            token1: rawResourceTokenValue
          }
        }
      };

      yield {
        name: 'multiple dynamic values',
        path: '/resource/resourceId/subResource/subId',
        inputMap: {
          resource: {
            '*': {
              subResource: {
                '*': {
                  _tokens: ['token1', 'token2'],
                  _methods: { [method]: expectedValue }
                }
              }
            }
          }
        },
        expectedValue: {
          value: expectedValue,
          methods: [method],
          tokens: {
            token1: 'resourceId',
            token2: 'subId'
          }
        }
      };
      yield {
        name: 'multiple dynamic values as empty value',
        path: '/resource//subResource/subId',
        inputMap: {
          resource: {
            '*': {
              subResource: {
                '*': {
                  _tokens: ['token1', 'token2'],
                  _methods: { [method]: expectedValue }
                }
              }
            }
          }
        },
        expectedValue: {
          value: expectedValue,
          methods: [method],
          tokens: {
            token1: null,
            token2: 'subId'
          }
        }
      };
      yield {
        name: 'match explicit before wild card',
        path: '/resource/resourceId',
        inputMap: {
          resource: {
            'resourceId': {
              _methods: { [method]: expectedValue }
            },
            '*': {
              _methods: { [method]: 'bad-value' }
            }
          }
        },
        expectedValue: {
          methods: [method],
          tokens: {},
          value: expectedValue
        }
      };
      yield {
        name: 'path not found',
        path: '/items/itemId/subItem',
        inputMap: {
          resource: {
            '*': {
              _methods: { [method]: 'bad-value' }
            }
          }
        },
        expectedValue: null
      };
      yield {
        name: 'proxy path is null',
        path: null,
        inputMap: {
          '': {
            _methods: { [method]: expectedValue }
          }
        },
        expectedValue: {
          methods: [method],
          tokens: {},
          value: expectedValue
        }
      };
      yield {
        name: 'top level check',
        path: '/',
        inputMap: {
          '': {
            _methods: { [method]: expectedValue }
          }
        },
        expectedValue: {
          methods: [method],
          tokens: {},
          value: expectedValue
        }
      };
      yield {
        name: 'multiple wildcards at the same level',
        path: '/resource/resourceId/subResource1',
        inputMap: {
          resource: {
            '*': {
              subResource1: {
                _tokens: ['token1'],
                _methods: { [method]: expectedValue }
              },
              subResource2: {
                _tokens: ['token2'],
                _methods: { [method]: 'bad-value' }
              }
            }
          }
        },
        expectedValue: {
          value: expectedValue,
          methods: [method],
          tokens: {
            token1: 'resourceId'
          }
        }
      };
      yield {
        name: 'multiple wildcards at the same level second one check',
        path: '/resource/resourceId/subResource2',
        inputMap: {
          resource: {
            '*': {
              subResource1: {
                _tokens: ['token1'],
                _methods: { [method]: 'bad-value' }
              },
              subResource2: {
                _tokens: ['token2'],
                _methods: { [method]: expectedValue }
              }
            }
          }
        },
        expectedValue: {
          value: expectedValue,
          methods: [method],
          tokens: {
            token2: 'resourceId'
          }
        }
      };
      yield {
        name: 'Greedy wildcard',
        path: '/resource/resourceId/subResources/subResource1/lowerResource',
        inputMap: {
          resource: {
            '*': {
              subResources: {
                '*': {
                  _tokens: ['token1', 'proxy'],
                  _methods: { [method]: expectedValue },
                  _greedy: true
                }
              }
            }
          }
        },
        expectedValue: {
          value: expectedValue,
          methods: [method],
          tokens: {
            token1: 'resourceId',
            proxy: 'subResource1'
          }
        }
      };
      yield {
        name: 'path with stage should return null',
        path: 'test/resource/resourceId/subResource1',
        inputMap: {
          resource: {
            '*': {
              subResource1: {
                _tokens: ['token1'],
                _methods: { [method]: 'bad-value' }
              },
              subResource2: {
                _tokens: ['token2'],
                _methods: { [method]: expectedValue }
              }
            }
          }
        },
        expectedValue: null
      };

      yield {
        name: 'path with * as resource should work as normal',
        path: '/resource/*/subResource/*',
        inputMap: {
          resource: {
            '*': {
              subResource: {
                '*': {
                  _tokens: ['token1', 'token2'],
                  _methods: { [method]: expectedValue }
                }
              }
            }
          }
        },
        expectedValue: {
          value: expectedValue,
          methods: [method],
          tokens: {
            token1: '*',
            token2: '*'
          }
        }
      };

      yield {
        name: 'path with adjacent verb should return value null, but still return methods',
        path: '/resource/*/subResource/*',
        inputMap: {
          resource: {
            '*': {
              subResource: {
                '*': {
                  _tokens: ['token1', 'token2'],
                  _methods: { [otherMethod]: expectedValue }
                }
              }
            }
          }
        },
        expectedValue: {
          value: undefined,
          methods: [otherMethod],
          tokens: {
            token1: '*',
            token2: '*'
          }
        }
      };
    };
    for (let test of tests) {
      it(test.name, () => {
        let pathResolver = new PathResolver();
        let resultValue = pathResolver.resolvePath(test.inputMap, method, test.path);
        expect(resultValue).to.eql(test.expectedValue);
      });
    }
  });
});
