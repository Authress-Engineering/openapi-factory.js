function Response(body, statusCode, headers) {
	if (!(this instanceof Response)) {
		return new Response(body, statusCode, headers);
	}

	this.statusCode = statusCode || 200;
	if (body && body instanceof Buffer) {
		this.body = body;
		this.headers = headers || {
			'Content-Type': 'application/octet-stream'
		};
	}
	else {
		this.body = JSON.stringify(body || {});
		this.headers = headers || {
			'Content-Type': 'application/json'
		};
	}
}

module.exports = Response;