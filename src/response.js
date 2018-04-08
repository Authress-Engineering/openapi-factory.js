function Response(body, statusCode, headers) {
	if (body && (body.body || body.statusCode || body.headers) && !statusCode && !headers) {
		return new Response(body.body, body.statusCode, body.headers);
	}

	if (!(this instanceof Response)) {
		return new Response(body, statusCode, headers);
	}

	this.statusCode = statusCode || 200;
	if (body && body instanceof Buffer) {
		this.body = body;
		this.headers = Object.assign({ 'Content-Type': 'application/octet-stream', 'Access-Control-Allow-Origin': '*' }, headers);
	} else {
		this.body = JSON.stringify(body || {});
		this.headers = Object.assign({ 'Content-Type': 'application/links+json', 'Access-Control-Allow-Origin': '*' }, headers);
	}
}

module.exports = Response;
