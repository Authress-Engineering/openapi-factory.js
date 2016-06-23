function Response(body, headers, statusCode) {
	if (!(this instanceof Response)) {
		throw new Error('Responses must be instantiated.');
	}

	this.body = body || {};
	this.headers = headers || {};
	this.statusCode = statusCode || 200;
}

module.exports = Response;