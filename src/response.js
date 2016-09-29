function Response(body, statusCode, headers) {
	if (!(this instanceof Response)) {
		return new Response(body, statusCode, headers);
	}

	this.body = JSON.stringify(body || {});
	this.statusCode = statusCode || 200;
	this.headers = headers || {
		'Content-Type': 'application/json'
	};
}

module.exports = Response;