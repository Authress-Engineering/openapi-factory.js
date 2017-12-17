function MapExpander() {}

MapExpander.prototype.expandMap = function(currentMap, pathString, mapValue) {
    let pathTokens = pathString.split('/');
    if (pathTokens[0] === '') {
        pathTokens = pathTokens.slice(1);
    }
    let mapIteration = currentMap;
    pathTokens.map((token, index) => {
        let updatedToken = token;
        if (token[0] === '{' && token[token.length - 1] === '}') {
            updatedToken = '*';
        }

        if (!mapIteration[updatedToken]) {
            mapIteration[updatedToken] = {};
        }

        if (index === pathTokens.length -1) {
            mapIteration[updatedToken]._value = mapValue;
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
    let mapIteration = currentMap;
    pathTokens.map(token => {
        mapIteration = mapIteration ? (mapIteration[token] || mapIteration['*']) : null;
    });
    return mapIteration ? mapIteration._value : null;
}

module.exports = MapExpander;