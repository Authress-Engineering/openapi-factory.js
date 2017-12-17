function MapExpander() {}

MapExpander.prototype.expandMap = function(currentMap, pathString, mapValue) {
    let pathTokens = pathString.split('/');
    if (pathTokens[0] === '') {
        pathTokens = pathTokens.slice(1);
    }
    let mapIteration = currentMap;
    let tokenNames = [];
    pathTokens.map((token, index) => {
        let updatedToken = token;
        if (token[0] === '{' && token[token.length - 1] === '}') {
            updatedToken = '*';
            tokenNames.push(token.substring(1, token.length - 1));
        }

        if (!mapIteration[updatedToken]) {
            mapIteration[updatedToken] = {};
        }

        if (index === pathTokens.length -1) {
            mapIteration[updatedToken]._value = mapValue;
            mapIteration[updatedToken]._tokens = tokenNames;
        } else {
            mapIteration = mapIteration[updatedToken];
        }
    });
    return currentMap;
}

MapExpander.prototype.getMapValue = function(currentMap, pathString) {
    let pathTokens = (pathString || '/').split('/');
    if (pathTokens[0] === '') {
        pathTokens = pathTokens.slice(1);
    }

    let tokenList = [];
    let mapIteration = pathTokens.reduce((acc, token) => {
        if (!acc) {
            return null;
        } else if (acc[token]) {
            return acc[token];
        } else if (acc['*']) {
            tokenList.push(token);
            return acc['*'];
        } else {
            return null;
        }
    }, currentMap);

    if (!mapIteration) {
        return null;
    }

    let tokenMap = {};
    mapIteration._tokens ? mapIteration._tokens.map((token, index) => {
        tokenMap[token] = tokenList[index];
    }): [];
    return mapIteration ? {
        value: mapIteration._value,
        tokens: tokenMap
    } : null;
}

module.exports = MapExpander;