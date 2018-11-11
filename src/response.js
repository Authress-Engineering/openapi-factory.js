class Response {
	constructor(body, statusCode, headers) {
		let pullBody = body && (body.body || body.statusCode || body.headers);
		this.body = pullBody ? body.body : body;
		this.statusCode = (pullBody ? body.statusCode : statusCode) || 200;
		this.headers = (pullBody ? body.headers : headers) || {};

		if (!this.body) {
			delete this.body;
			this.headers = Object.assign({ 'Access-Control-Allow-Origin': '*' }, this.headers);
		} else if (this.body && this.body instanceof Buffer) {
			this.headers = Object.assign({ 'Content-Type': 'application/octet-stream', 'Access-Control-Allow-Origin': '*' }, this.headers);
		} else {
			this.body = JSON.stringify(this.body);
			this.headers = Object.assign({ 'Content-Type': 'application/links+json', 'Access-Control-Allow-Origin': '*' }, this.headers);
		}
	}
}

module.exports = Response;
