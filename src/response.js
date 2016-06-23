function Response(body, headers, statusCode) {
	if (!(this instanceof Response)) {
		return new Response(body, headers, statusCode);
	}

	this.body = body || {};
	this.headers = headers || {};
	this.statusCode = statusCode || 200;
}

module.exports = Response;