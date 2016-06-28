function Response(body, statusCode) {
	if (!(this instanceof Response)) {
		return new Response(body, statusCode);
	}

	this.body = body || {};
	this.statusCode = statusCode || 200;
}

module.exports = Response;