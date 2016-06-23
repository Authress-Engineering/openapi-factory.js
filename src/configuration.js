var path = require('path');

function Configuration(options, lambdaFileName) {
	if (!(this instanceof Configuration)) {
		throw new Error('Configurations must be instantiated.');
	}

	this.FunctionName = options.functionName;
	this.Handler = options.handler || `${path.basename(lambdaFileName, '.js')}.handler`;
	this.Role = options.role;
	this.Runtime = options.runtime || 'nodejs4.3';
	this.Description = options.description || options.functionName;
	this.MemorySize = options.memorySize || 128;
	this.Publish = options.publish || true;
	this.Timeout = options.timeout || 3;
}

module.exports = Configuration;