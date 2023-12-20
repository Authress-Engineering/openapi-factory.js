require('error-object-polyfill');
const { describe, it, beforeEach, afterEach } = require('mocha');
const chai = require('chai');
const { assert, expect } = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

const Api = require('../index');

chai.use(sinonChai);

let sandbox;
const spyMap = {};
beforeEach(() => {
  sandbox = sinon.createSandbox();
});
afterEach(() => {
  sandbox.restore();
});

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noopFunction = () => {};
function getApi() {
  const api = new Api(null, noopFunction);

  api.get('/', { anonymous: true }, spyMap['/'] = sinon.spy(() => 'TOP'));
  api.head('/', { anonymous: true }, spyMap['HEAD-/'] = sinon.spy(() => 'TOP-HEAD'));
  api.get('/livecheck', { anonymous: true }, spyMap.MATCH = sinon.spy(() => 'MATCH'));

  // same route different methods
  api.get('/v1/users/{userId}', spyMap['GET-USER'] = sinon.spy(() => 'GET-USER'));
  api.delete('/v1/users/{userId}', spyMap['DELETE-USER'] = sinon.spy(() => 'DELETE-USER'));
  api.any('/v1/users/{userId}', spyMap['ANY-USER'] = sinon.spy(() => 'ANY-USER'));

  // sub routes all same method
  api.get('/v1/users/{userId}/resources', spyMap.PATH = sinon.spy(() => 'PATH'));
  api.get('/v1/users/{userId}/resources/{resourceUri}/permissions', spyMap.SUBPATH = sinon.spy(() => 'SUBPATH'));
  api.get('/v1/users/{userId}/resources/{resourceUri}/permissions/{permission}', spyMap['SUB-SUB-PATH'] = sinon.spy(() => 'SUB-SUB-PATH'));
  api.get('/v1/users/{userId}/resources/{resourceUri}/roles', spyMap['ALTERNATE-PATH'] = sinon.spy(() => 'ALTERNATE-PATH'));

  // Different method on sub route
  api.get('/v1/resources', spyMap['GET-PATH'] = sinon.spy(() => 'GET-PATH'));
  api.put('/v1/resources/{resourceUri}', spyMap['PUT-PATH'] = sinon.spy(() => 'PUT-PATH'));
  api.get('/v1/resources/{resourceUri}/users', spyMap['GET-SUBPATH'] = sinon.spy(() => 'GET-SUBPATH'));
  api.get('/v1/resources/{altKey}/users/alt', spyMap['GET-ALT-KEY'] = sinon.spy(() => 'GET-ALT-KEY'));

  // Greedy match on the top for different method
  api.options('/accounts', spyMap['ABOVE-GREEDY'] = sinon.spy(() => 'ABOVE-GREEDY'));
  api.options('/accounts/{accountId+}', spyMap['GREEDY-OPTIONS'] = sinon.spy(() => 'GREEDY-OPTIONS'));
  api.get('/accounts/{accountId+}', spyMap.GREEDY = sinon.spy(() => 'GREEDY'));
  api.get('/accounts/{accountId}/domains', spyMap['MORE-SPECIFIC-THAN-GREEDY'] = sinon.spy(() => 'MORE-SPECIFIC-THAN-GREEDY'));

  // Handle explicit before variable
  api.get('/route', spyMap.ROUTE = sinon.spy(() => 'ROUTE'));
  api.get('/route/explicit', spyMap['ROUTE-EXPLICIT'] = sinon.spy(() => 'ROUTE-EXPLICIT'));
  api.get('/route/{variable}', spyMap['ROUTE-VARIABLE'] = sinon.spy(() => 'ROUTE-VARIABLE'));
  api.get('/route/explicit-AFTER', spyMap['ROUTE-EXPLICIT-REVERSE-ORDER'] = sinon.spy(() => 'ROUTE-EXPLICIT-REVERSE-ORDER'));

  // Validate some top level proxies
  api.any('/partial/do/not/match', spyMap['FULL-PART-OF-PROXY'] = sinon.spy(() => 'FULL-PART-OF-PROXY'));
  api.get('/partial/{collector+}', spyMap['PARTIAL-PROXY'] = sinon.spy(() => 'PARTIAL-PROXY'));
  api.options('/{proxy+}', { anonymous: true }, spyMap.PROXY = sinon.spy(() => 'PROXY'));
  api.any('/{proxy+}', { anonymous: true }, spyMap['ANY-PROXY'] = sinon.spy(() => 'ANY-PROXY'));

  return api;
}

describe('index.js', () => {
  describe('Ensure Prototype Pollution is blocked', () => {
    it('Validate __proto__ path property', async () => {
      try {
        await getApi().handler({
          httpMethod: 'GET',
          resource: '/v1/users/{userId}',
          path: '/v1/users/__proto__',
          pathParameters: { userId: '__proto__' }
        });
        throw Error('Expected test to throw an error');
      } catch (error) {
        expect(error.code || error.message).to.eql('PrototypePollutionAttack');
      }
    });
  });
  describe('Assuming everything is registered as a specific routes', () => {
    it('Validate / works', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/', path: '/' });
      assert.deepEqual(output.body, 'TOP');
    });
    it('Validate HEAD / works', async () => {
      const output = await getApi().handler({ httpMethod: 'HEAD', resource: '/', path: '/' });
      assert.deepEqual(output.body, 'TOP-HEAD');
    });
    it('Validate GET /v1/users/userId', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/v/users/{proxy+}', path: '/v1/users/userId', pathParameters: { userId: 'userId' } });
      expect(output.body).to.equal('GET-USER');
      expect(spyMap['GET-USER'].calledOnce).to.be.true;
      expect(spyMap['GET-USER'].getCall(0).args[0].httpMethod).to.eql('GET');
      expect(spyMap['GET-USER'].getCall(0).args[0].pathParameters).to.eql({ userId: 'userId' });
    });
    it('Validate DELETE /v1/users/userId', async () => {
      const output = await getApi().handler({ httpMethod: 'DELETE', resource: '/v1/users/{userId}', path: '/v1/users/userId', pathParameters: { userId: 'userId' } });
      expect(output.body).to.equal('DELETE-USER');
      expect(spyMap['DELETE-USER'].calledOnce).to.be.true;
      expect(spyMap['DELETE-USER'].getCall(0).args[0].httpMethod).to.eql('DELETE');
      expect(spyMap['DELETE-USER'].getCall(0).args[0].pathParameters).to.eql({ userId: 'userId' });
    });

    it('before GREEDY', async () => {
      const output = await getApi().handler({ httpMethod: 'OPTIONS', resource: '/accounts', path: '/accounts' });
      expect(output.body).to.equal('ABOVE-GREEDY');
      expect(spyMap['ABOVE-GREEDY'].calledOnce).to.be.true;
      expect(spyMap['ABOVE-GREEDY'].getCall(0).args[0].httpMethod).to.eql('OPTIONS');
      expect(spyMap['ABOVE-GREEDY'].getCall(0).args[0].pathParameters).to.eql({ });
    });

    it('GREEDY OPTIONS', async () => {
      const output = await getApi().handler({ httpMethod: 'OPTIONS', resource: '/accounts/{accountId+}', path: '/accounts/accountId', pathParameters: { accountId: 'accountId' } });
      expect(output.body).to.equal('GREEDY-OPTIONS');
      expect(spyMap['GREEDY-OPTIONS'].calledOnce).to.be.true;
      expect(spyMap['GREEDY-OPTIONS'].getCall(0).args[0].httpMethod).to.eql('OPTIONS');
      expect(spyMap['GREEDY-OPTIONS'].getCall(0).args[0].pathParameters).to.eql({ accountId: 'accountId' });
    });

    it('GREEDY OPTIONS additional', async () => {
      const output = await getApi().handler({ httpMethod: 'OPTIONS', resource: '/accounts/{accountId+}', path: '/accounts/accountId/and/thing', pathParameters: { accountId: 'accountId' } });
      expect(output.body).to.equal('GREEDY-OPTIONS');
      expect(spyMap['GREEDY-OPTIONS'].calledOnce).to.be.true;
      expect(spyMap['GREEDY-OPTIONS'].getCall(0).args[0].httpMethod).to.eql('OPTIONS');
      expect(spyMap['GREEDY-OPTIONS'].getCall(0).args[0].pathParameters).to.eql({ accountId: 'accountId' });
    });

    it('GREEDY GET additional', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/accounts/{accountId+}', path: '/accounts/accountId/and/thing', pathParameters: { accountId: 'accountId' } });
      expect(output.body).to.equal('GREEDY');
      expect(spyMap.GREEDY.calledOnce).to.be.true;
      expect(spyMap.GREEDY.getCall(0).args[0].httpMethod).to.eql('GET');
      expect(spyMap.GREEDY.getCall(0).args[0].pathParameters).to.eql({ accountId: 'accountId' });
    });

    it('MORE-SPECIFIC-THAN-GREEDY', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/accounts/{accountId}/domains', path: '/accounts/accountId/domains', pathParameters: { accountId: 'accountId' } });
      expect(output.body).to.equal('MORE-SPECIFIC-THAN-GREEDY');
      expect(spyMap['MORE-SPECIFIC-THAN-GREEDY'].calledOnce).to.be.true;
      expect(spyMap['MORE-SPECIFIC-THAN-GREEDY'].getCall(0).args[0].httpMethod).to.eql('GET');
      expect(spyMap['MORE-SPECIFIC-THAN-GREEDY'].getCall(0).args[0].pathParameters).to.eql({ accountId: 'accountId' });
    });

    it('ROUTE-EXPLICIT', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/route/explicit', path: '/route/explicit' });
      expect(output.body).to.equal('ROUTE-EXPLICIT');
      expect(spyMap['ROUTE-EXPLICIT'].calledOnce).to.be.true;
      expect(spyMap['ROUTE-EXPLICIT'].getCall(0).args[0].httpMethod).to.eql('GET');
      expect(spyMap['ROUTE-EXPLICIT'].getCall(0).args[0].pathParameters).to.eql({ });
    });

    it('ROUTE-VARIABLE', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/route/{variable}', path: '/route/variable-thing', pathParameters: { variable: 'variable-thing' } });
      expect(output.body).to.equal('ROUTE-VARIABLE');
      expect(spyMap['ROUTE-VARIABLE'].calledOnce).to.be.true;
      expect(spyMap['ROUTE-VARIABLE'].getCall(0).args[0].httpMethod).to.eql('GET');
      expect(spyMap['ROUTE-VARIABLE'].getCall(0).args[0].pathParameters).to.eql({ variable: 'variable-thing' });
    });

    it('ROUTE-EXPLICIT-REVERSE-ORDER', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/route/explicit-AFTER', path: '/route/explicit-AFTER' });
      expect(output.body).to.equal('ROUTE-EXPLICIT-REVERSE-ORDER');
      expect(spyMap['ROUTE-EXPLICIT-REVERSE-ORDER'].calledOnce).to.be.true;
      expect(spyMap['ROUTE-EXPLICIT-REVERSE-ORDER'].getCall(0).args[0].httpMethod).to.eql('GET');
      expect(spyMap['ROUTE-EXPLICIT-REVERSE-ORDER'].getCall(0).args[0].pathParameters).to.eql({ });
    });

    it('Validate /v1/users/{userId}/resources', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/v1/users/{userId}/resources', path: '/v1/users/userId/resources', pathParameters: { userId: 'userId' } });
      expect(output.body).to.equal('PATH');
      expect(spyMap.PATH.calledOnce).to.be.true;
      expect(spyMap.PATH.getCall(0).args[0].httpMethod).to.eql('GET');
      expect(spyMap.PATH.getCall(0).args[0].pathParameters).to.eql({ userId: 'userId' });
    });

    it('Validate /v1/users/{userId}/resources/{resourceUri}/permissions', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/v1/users/{userId}/resources/{resourceUri}/permissions', path: '/v1/users/userId/resources/resource/permissions',
        pathParameters: { userId: 'userId', resourceUri: 'resource' } });
      expect(output.body).to.equal('SUBPATH');
      expect(spyMap.SUBPATH.calledOnce).to.be.true;
      expect(spyMap.SUBPATH.getCall(0).args[0].httpMethod).to.eql('GET');
      expect(spyMap.SUBPATH.getCall(0).args[0].pathParameters).to.eql({ userId: 'userId', resourceUri: 'resource' });
    });

    it('Validate /v1/users/{userId}/resources/{resourceUri}/roles', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/v1/users/{userId}/resources/{resourceUri}/roles', path: '/v1/users/userId/resources/resource/roles',
        pathParameters: { userId: 'userId', resourceUri: 'resource' } });
      expect(output.body).to.equal('ALTERNATE-PATH');
      expect(spyMap['ALTERNATE-PATH'].calledOnce).to.be.true;
      expect(spyMap['ALTERNATE-PATH'].getCall(0).args[0].httpMethod).to.eql('GET');
      expect(spyMap['ALTERNATE-PATH'].getCall(0).args[0].pathParameters).to.eql({ userId: 'userId', resourceUri: 'resource' });
    });

    it('Validate /v1/resources', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/v1/resources', path: '/v1/resources' });
      expect(output.body).to.equal('GET-PATH');
      expect(spyMap['GET-PATH'].calledOnce).to.be.true;
      expect(spyMap['GET-PATH'].getCall(0).args[0].httpMethod).to.eql('GET');
      expect(spyMap['GET-PATH'].getCall(0).args[0].pathParameters).to.eql({ });
    });

    it('Validate PUT /v1/resources/resource', async () => {
      const output = await getApi().handler({ httpMethod: 'PUT', resource: '/v1/resources/{resourceUri}', path: '/v1/resources/resourceUri',
        pathParameters: { resourceUri: 'resourceUri' } });
      expect(output.body).to.equal('PUT-PATH');
      expect(spyMap['PUT-PATH'].calledOnce).to.be.true;
      expect(spyMap['PUT-PATH'].getCall(0).args[0].httpMethod).to.eql('PUT');
      expect(spyMap['PUT-PATH'].getCall(0).args[0].pathParameters).to.eql({ resourceUri: 'resourceUri' });
    });

    it('Validate GET /v1/resources/resource/users', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/v1/resources/{resourceUri}/users', path: '/v1/resources/resourceUri/users',
        pathParameters: { resourceUri: 'resourceUri' } });
      expect(output.body).to.equal('GET-SUBPATH');
      expect(spyMap['GET-SUBPATH'].calledOnce).to.be.true;
      expect(spyMap['GET-SUBPATH'].getCall(0).args[0].httpMethod).to.eql('GET');
      expect(spyMap['GET-SUBPATH'].getCall(0).args[0].pathParameters).to.eql({ resourceUri: 'resourceUri' });
    });
    it('Validate GET /v1/resources/altKey/users/alt', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/{proxy+}', path: '/v1/resources/altKey/users/alt',
        pathParameters: { proxy: '/v1/resources/altKey/users/alt' } });
      expect(output.body).to.equal('GET-ALT-KEY');
      expect(spyMap['GET-ALT-KEY'].calledOnce).to.be.true;
      expect(spyMap['GET-ALT-KEY'].getCall(0).args[0].httpMethod).to.eql('GET');
      expect(spyMap['GET-ALT-KEY'].getCall(0).args[0].pathParameters).to.eql({ altKey: 'altKey' });
    });
    it('PARTIAL-PROXY', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/partial/{collector+}', path: '/partial/lower/match', pathParameters: { collector: 'lower' } });
      expect(output.body).to.equal('PARTIAL-PROXY');
      expect(spyMap['PARTIAL-PROXY'].calledOnce).to.be.true;
      expect(spyMap['PARTIAL-PROXY'].getCall(0).args[0].httpMethod).to.eql('GET');
      expect(spyMap['PARTIAL-PROXY'].getCall(0).args[0].pathParameters).to.eql({ collector: 'lower' });
    });
    it('Validate ANY works', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/test', path: '/test' });
      expect(output.body).to.equal('ANY-PROXY');
      expect(spyMap['ANY-PROXY'].calledOnce).to.be.true;
      expect(spyMap['ANY-PROXY'].getCall(0).args[0].httpMethod).to.eql('GET');
      expect(spyMap['ANY-PROXY'].getCall(0).args[0].path).to.eql('/test');
      expect(spyMap['ANY-PROXY'].getCall(0).args[0].pathParameters).to.eql({ proxy: 'test' });
    });
  });

  describe('Assuming everything is registered as a /{proxy+}', () => {
    it('Validate / works', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/{proxy+}', path: '/' });
      assert.deepEqual(output.body, 'TOP');
    });
    it('Validate HEAD / works', async () => {
      const output = await getApi().handler({ httpMethod: 'HEAD', resource: '/{proxy+}', path: '/' });
      assert.deepEqual(output.body, 'TOP-HEAD');
    });
    it('Validate GET /v1/users/userId', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/{proxy+}', path: '/v1/users/userId' });
      expect(output.body).to.equal('GET-USER');
      expect(spyMap['GET-USER'].calledOnce).to.be.true;
      expect(spyMap['GET-USER'].getCall(0).args[0].httpMethod).to.eql('GET');
      expect(spyMap['GET-USER'].getCall(0).args[0].pathParameters).to.eql({ userId: 'userId' });
    });
    it('Validate DELETE /v1/users/userId', async () => {
      const output = await getApi().handler({ httpMethod: 'DELETE', resource: '/{proxy+}', path: '/v1/users/userId' });
      expect(output.body).to.equal('DELETE-USER');
      expect(spyMap['DELETE-USER'].calledOnce).to.be.true;
      expect(spyMap['DELETE-USER'].getCall(0).args[0].httpMethod).to.eql('DELETE');
      expect(spyMap['DELETE-USER'].getCall(0).args[0].pathParameters).to.eql({ userId: 'userId' });
    });

    it('before GREEDY', async () => {
      const output = await getApi().handler({ httpMethod: 'OPTIONS', resource: '/{proxy+}', path: '/accounts' });
      expect(output.body).to.equal('ABOVE-GREEDY');
      expect(spyMap['ABOVE-GREEDY'].calledOnce).to.be.true;
      expect(spyMap['ABOVE-GREEDY'].getCall(0).args[0].httpMethod).to.eql('OPTIONS');
      expect(spyMap['ABOVE-GREEDY'].getCall(0).args[0].pathParameters).to.eql({ });
    });

    it('GREEDY OPTIONS', async () => {
      const output = await getApi().handler({ httpMethod: 'OPTIONS', resource: '/{proxy+}', path: '/accounts/accountId' });
      expect(output.body).to.equal('GREEDY-OPTIONS');
      expect(spyMap['GREEDY-OPTIONS'].calledOnce).to.be.true;
      expect(spyMap['GREEDY-OPTIONS'].getCall(0).args[0].httpMethod).to.eql('OPTIONS');
      expect(spyMap['GREEDY-OPTIONS'].getCall(0).args[0].pathParameters).to.eql({ accountId: 'accountId' });
    });

    it('GREEDY OPTIONS additional', async () => {
      const output = await getApi().handler({ httpMethod: 'OPTIONS', resource: '/{proxy+}', path: '/accounts/accountId/and/thing' });
      expect(output.body).to.equal('GREEDY-OPTIONS');
      expect(spyMap['GREEDY-OPTIONS'].calledOnce).to.be.true;
      expect(spyMap['GREEDY-OPTIONS'].getCall(0).args[0].httpMethod).to.eql('OPTIONS');
      expect(spyMap['GREEDY-OPTIONS'].getCall(0).args[0].pathParameters).to.eql({ accountId: 'accountId' });
    });

    it('GREEDY GET additional', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/{proxy+}', path: '/accounts/accountId/and/thing' });
      expect(output.body).to.equal('GREEDY');
      expect(spyMap.GREEDY.calledOnce).to.be.true;
      expect(spyMap.GREEDY.getCall(0).args[0].httpMethod).to.eql('GET');
      expect(spyMap.GREEDY.getCall(0).args[0].pathParameters).to.eql({ accountId: 'accountId' });
    });

    it('MORE-SPECIFIC-THAN-GREEDY', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/{proxy+}', path: '/accounts/accountId/domains' });
      expect(output.body).to.equal('MORE-SPECIFIC-THAN-GREEDY');
      expect(spyMap['MORE-SPECIFIC-THAN-GREEDY'].calledOnce).to.be.true;
      expect(spyMap['MORE-SPECIFIC-THAN-GREEDY'].getCall(0).args[0].httpMethod).to.eql('GET');
      expect(spyMap['MORE-SPECIFIC-THAN-GREEDY'].getCall(0).args[0].pathParameters).to.eql({ accountId: 'accountId' });
    });

    it('ROUTE-EXPLICIT', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/{proxy+}', path: '/route/explicit' });
      expect(output.body).to.equal('ROUTE-EXPLICIT');
      expect(spyMap['ROUTE-EXPLICIT'].calledOnce).to.be.true;
      expect(spyMap['ROUTE-EXPLICIT'].getCall(0).args[0].httpMethod).to.eql('GET');
      expect(spyMap['ROUTE-EXPLICIT'].getCall(0).args[0].pathParameters).to.eql({ });
    });

    it('ROUTE-VARIABLE', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/{proxy+}', path: '/route/variable-thing' });
      expect(output.body).to.equal('ROUTE-VARIABLE');
      expect(spyMap['ROUTE-VARIABLE'].calledOnce).to.be.true;
      expect(spyMap['ROUTE-VARIABLE'].getCall(0).args[0].httpMethod).to.eql('GET');
      expect(spyMap['ROUTE-VARIABLE'].getCall(0).args[0].pathParameters).to.eql({ variable: 'variable-thing' });
    });

    it('ROUTE-EXPLICIT-REVERSE-ORDER', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/{proxy+}', path: '/route/explicit-AFTER' });
      expect(output.body).to.equal('ROUTE-EXPLICIT-REVERSE-ORDER');
      expect(spyMap['ROUTE-EXPLICIT-REVERSE-ORDER'].calledOnce).to.be.true;
      expect(spyMap['ROUTE-EXPLICIT-REVERSE-ORDER'].getCall(0).args[0].httpMethod).to.eql('GET');
      expect(spyMap['ROUTE-EXPLICIT-REVERSE-ORDER'].getCall(0).args[0].pathParameters).to.eql({ });
    });

    it('Validate /v1/users/{userId}/resources', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/{proxy+}', path: '/v1/users/userId/resources' });
      expect(output.body).to.equal('PATH');
      expect(spyMap.PATH.calledOnce).to.be.true;
      expect(spyMap.PATH.getCall(0).args[0].httpMethod).to.eql('GET');
      expect(spyMap.PATH.getCall(0).args[0].pathParameters).to.eql({ userId: 'userId' });
    });

    it('Validate /v1/users/{userId}/resources/{resourceUri}/permissions', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/{proxy+}', path: '/v1/users/userId/resources/resource/permissions' });
      expect(output.body).to.equal('SUBPATH');
      expect(spyMap.SUBPATH.calledOnce).to.be.true;
      expect(spyMap.SUBPATH.getCall(0).args[0].httpMethod).to.eql('GET');
      expect(spyMap.SUBPATH.getCall(0).args[0].pathParameters).to.eql({ userId: 'userId', resourceUri: 'resource' });
    });

    it('Validate /v1/users/{userId}/resources/{resourceUri}/roles', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/{proxy+}', path: '/v1/users/userId/resources/resource/roles' });
      expect(output.body).to.equal('ALTERNATE-PATH');
      expect(spyMap['ALTERNATE-PATH'].calledOnce).to.be.true;
      expect(spyMap['ALTERNATE-PATH'].getCall(0).args[0].httpMethod).to.eql('GET');
      expect(spyMap['ALTERNATE-PATH'].getCall(0).args[0].pathParameters).to.eql({ userId: 'userId', resourceUri: 'resource' });
    });

    it('Validate /v1/resources', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/{proxy+}', path: '/v1/resources' });
      expect(output.body).to.equal('GET-PATH');
      expect(spyMap['GET-PATH'].calledOnce).to.be.true;
      expect(spyMap['GET-PATH'].getCall(0).args[0].httpMethod).to.eql('GET');
      expect(spyMap['GET-PATH'].getCall(0).args[0].pathParameters).to.eql({ });
    });

    it('Validate PUT /v1/resources/resource', async () => {
      const output = await getApi().handler({ httpMethod: 'PUT', resource: '/{proxy+}', path: '/v1/resources/resourceUri' });
      expect(output.body).to.equal('PUT-PATH');
      expect(spyMap['PUT-PATH'].calledOnce).to.be.true;
      expect(spyMap['PUT-PATH'].getCall(0).args[0].httpMethod).to.eql('PUT');
      expect(spyMap['PUT-PATH'].getCall(0).args[0].pathParameters).to.eql({ resourceUri: 'resourceUri' });
    });

    it('Validate GET /v1/resources/resource/users', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/{proxy+}', path: '/v1/resources/resourceUri/users' });
      expect(output.body).to.equal('GET-SUBPATH');
      expect(spyMap['GET-SUBPATH'].calledOnce).to.be.true;
      expect(spyMap['GET-SUBPATH'].getCall(0).args[0].httpMethod).to.eql('GET');
      expect(spyMap['GET-SUBPATH'].getCall(0).args[0].pathParameters).to.eql({ resourceUri: 'resourceUri' });
    });
    it('Validate GET /v1/resources/altKey/users/alt', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/v1/resources/{altKey}/users/alt', path: '/v1/resources/altKey/users/alt',
        pathParameters: { altKey: 'altKey' } });
      expect(output.body).to.equal('GET-ALT-KEY');
      expect(spyMap['GET-ALT-KEY'].calledOnce).to.be.true;
      expect(spyMap['GET-ALT-KEY'].getCall(0).args[0].httpMethod).to.eql('GET');
      expect(spyMap['GET-ALT-KEY'].getCall(0).args[0].pathParameters).to.eql({ altKey: 'altKey' });
    });
    it('PARTIAL-PROXY', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/{proxy+}', path: '/partial/lower/match' });
      expect(output.body).to.equal('PARTIAL-PROXY');
      expect(spyMap['PARTIAL-PROXY'].calledOnce).to.be.true;
      expect(spyMap['PARTIAL-PROXY'].getCall(0).args[0].httpMethod).to.eql('GET');
      expect(spyMap['PARTIAL-PROXY'].getCall(0).args[0].pathParameters).to.eql({ collector: 'lower' });
    });
    it('Validate ANY works', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/test', path: '/test' });
      expect(output.body).to.equal('ANY-PROXY');
      expect(spyMap['ANY-PROXY'].calledOnce).to.be.true;
      expect(spyMap['ANY-PROXY'].getCall(0).args[0].httpMethod).to.eql('GET');
      expect(spyMap['ANY-PROXY'].getCall(0).args[0].path).to.eql('/test');
      expect(spyMap['ANY-PROXY'].getCall(0).args[0].pathParameters).to.eql({ proxy: 'test' });
    });

    it('Validate ANY works when the wrong method is picked', async () => {
      const output = await getApi().handler({ httpMethod: 'GET', resource: '/{proxy+}', path: '/v1/resources/resourceUri' });
      expect(output.body).to.equal('ANY-PROXY');
      expect(spyMap['ANY-PROXY'].calledOnce).to.be.true;
      expect(spyMap['ANY-PROXY'].getCall(0).args[0].openApiOptions).to.eql({ definedMethods: ['PUT'], anonymous: true });
      expect(spyMap['ANY-PROXY'].getCall(0).args[0].httpMethod).to.eql('GET');
      expect(spyMap['ANY-PROXY'].getCall(0).args[0].path).to.eql('/v1/resources/resourceUri');
      expect(spyMap['ANY-PROXY'].getCall(0).args[0].pathParameters).to.eql({ resourceUri: 'resourceUri' });
    });

    it('Validate ANY works', async () => {
      const output = await getApi().handler({ httpMethod: 'PUT', resource: '/{proxy+}', path: '/v1/users/userId' });
      expect(output.body).to.equal('ANY-USER');
      expect(spyMap['ANY-USER'].calledOnce).to.be.true;
      expect(spyMap['ANY-USER'].getCall(0).args[0].openApiOptions).to.eql({ definedMethods: ['GET', 'DELETE'] });
      expect(spyMap['ANY-USER'].getCall(0).args[0].httpMethod).to.eql('PUT');
      expect(spyMap['ANY-USER'].getCall(0).args[0].path).to.eql('/v1/users/userId');
      expect(spyMap['ANY-USER'].getCall(0).args[0].pathParameters).to.eql({ userId: 'userId' });
    });
  });
});
