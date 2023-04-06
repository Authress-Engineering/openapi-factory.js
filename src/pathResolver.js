/* eslint-disable no-underscore-dangle */

const decodeURIComponentSafe = val => {
  try {
    return decodeURIComponent(val);
  } catch (error) {
    return val;
  }
};

class PathResolver {
  storePath(currentMap, method, pathString, mapValue) {
    let pathTokens = pathString.split('/');
    if (pathTokens[0] === '') {
      pathTokens = pathTokens.slice(1);
    }
    if (pathTokens.length > 1 && pathTokens[pathTokens.length - 1] === '') {
      pathTokens = pathTokens.slice(0, -1);
    }
    let mapIteration = currentMap;
    let tokenNames = [];
    let greedy = false;
    pathTokens.map((token, index) => {
      let updatedToken = token;
      if (token[0] === '{' && token[token.length - 1] === '}') {
        updatedToken = '*';
        greedy = token[token.length - 2] === '+';
        tokenNames.push(token.substring(1, token.length - (greedy ? 2 : 1)));
      }

      if (!mapIteration[updatedToken]) {
        mapIteration[updatedToken] = { };
      }

      if (index === pathTokens.length - 1 || greedy) {
        if (mapIteration[updatedToken]._methods && mapIteration[updatedToken]._methods[method]) {
          throw new Error(`Path already exists: ${pathString}`);
        }
        if (!mapIteration[updatedToken]._methods) {
          mapIteration[updatedToken]._methods = {};
        }
        mapIteration[updatedToken]._methods[method] = mapValue;
        mapIteration[updatedToken]._tokens = tokenNames;
        if (greedy) { mapIteration[updatedToken]._greedy = greedy; }
      } else {
        mapIteration = mapIteration[updatedToken];
      }
    });
    return currentMap;
  }

  resolvePath(currentMap, method, pathString) {
    let pathTokens = (pathString || '/').split('/');
    if (pathTokens[0] === '') {
      pathTokens = pathTokens.slice(1);
    }
    if (pathTokens.length > 1 && pathTokens[pathTokens.length - 1] === '') {
      pathTokens = pathTokens.slice(0, -1);
    }

    let tokenList = [];
    let currentPointerInMapHierarchy = currentMap;
    for (const token of pathTokens) {
      //
      if (!currentPointerInMapHierarchy) {
        break;
      }

      if (token !== '*' && currentPointerInMapHierarchy[token]) {
        currentPointerInMapHierarchy = currentPointerInMapHierarchy[token];
        continue;
      }

      if (currentPointerInMapHierarchy._greedy) {
        break;
      }

      if (currentPointerInMapHierarchy['*']) {
        tokenList.push(token === '' ? null : decodeURIComponentSafe(token));
        currentPointerInMapHierarchy = currentPointerInMapHierarchy['*'];
        continue;
      }
      currentPointerInMapHierarchy = null;
    }

    if (!currentPointerInMapHierarchy) {
      return null;
    }

    let tokenMap = {};
    currentPointerInMapHierarchy._tokens ? currentPointerInMapHierarchy._tokens.map((token, index) => {
      tokenMap[token] = tokenList[index];
    }) : [];

    if (currentPointerInMapHierarchy && currentPointerInMapHierarchy._methods) {
      return {
        value: currentPointerInMapHierarchy._methods[method] || currentPointerInMapHierarchy._methods.ANY,
        methods: Object.keys(currentPointerInMapHierarchy._methods).filter(m => !m.match('ANY')),
        tokens: tokenMap
      };
    }

    return null;
  }
}

module.exports = PathResolver;
