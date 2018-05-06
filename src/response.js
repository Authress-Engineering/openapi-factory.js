class Response {
	constructor(body, statusCode, headers) {
		this.body = body && body.body || body;
		this.statusCode = body && !statusCode && body.statusCode || statusCode || 200;
		this.headers = body && !headers && body.headers || headers;

		if (this.body && this.body instanceof Buffer) {
			this.headers = Object.assign({ 'Content-Type': 'application/octet-stream', 'Access-Control-Allow-Origin': '*' }, this.headers);
		} else {
			this.body = JSON.stringify(this.body || {});
			this.headers = Object.assign({ 'Content-Type': 'application/links+json', 'Access-Control-Allow-Origin': '*' }, this.headers);
		}
	}
}

module.exports = Response;
