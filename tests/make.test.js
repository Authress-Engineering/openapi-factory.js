const { describe, it } = require('mocha');

describe('make.js', () => {
  describe('Syntax', () => {
    it('Should be valid node', () => {
      require('../make');
    });
  });
});
