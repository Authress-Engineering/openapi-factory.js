/* eslint-disable no-underscore-dangle */

const decodeURIComponentSafe = val => {
  try {
    return decodeURIComponent(val);
  } catch (error) {
    return val;
  }
};

class PathResolver {
  storePath(currentMap, pathString, mapValue) {
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
        mapIteration[updatedToken] = {};
      }

      if (index === pathTokens.length - 1 || greedy) {
        if (mapIteration[updatedToken]._value) {
          throw new Error(`Path already exists: ${pathString}`);
        }
        mapIteration[updatedToken]._value = mapValue;
        mapIteration[updatedToken]._tokens = tokenNames;
        if (greedy) { mapIteration[updatedToken]._greedy = greedy; }
      } else {
        mapIteration = mapIteration[updatedToken];
      }
    });
    return currentMap;
  }

  resolvePath(currentMap, pathString) {
    let pathTokens = (pathString || '/').split('/');
    if (pathTokens[0] === '') {
      pathTokens = pathTokens.slice(1);
    }
    if (pathTokens.length > 1 && pathTokens[pathTokens.length - 1] === '') {
      pathTokens = pathTokens.slice(0, -1);
    }

    let tokenList = [];
    let mapIteration = pathTokens.reduce((acc, token) => {
      if (!acc) {
        return null;
      } else if (acc[token] && token !== '*') {
        return acc[token];
      } else if (acc._greedy) {
        return acc;
      } else if (acc['*']) {
        tokenList.push(token === '' ? null : decodeURIComponentSafe(token));
        return acc['*'];
      }
      return null;
    }, currentMap);

    if (!mapIteration) {
      return null;
    }

    let tokenMap = {};
    mapIteration._tokens ? mapIteration._tokens.map((token, index) => {
      tokenMap[token] = tokenList[index];
    }) : [];
    return mapIteration ? {
      value: mapIteration._value,
      tokens: tokenMap
    } : null;
  }
}

module.exports = PathResolver;
