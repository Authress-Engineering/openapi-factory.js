class Response {
	constructor(body, statusCode, headers) {
		let pullBody = body && (body.body || body.statusCode || body.headers);
		this.body = pullBody ? body.body : body;
		this.statusCode = (pullBody ? body.statusCode : statusCode) || 200;
		const populatedHeaders = (pullBody ? body.headers : headers) || {};
		this.multiValueHeaders = Object.keys(populatedHeaders).reduce((agg, h) => {
			agg[h] = Array.isArray(populatedHeaders[h]) ? populatedHeaders[h] : [populatedHeaders[h]];
			return agg;
		}, {});

		if (!this.body) {
			delete this.body;
			this.headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Credentials': true };
		} else if (this.body && this.body instanceof Buffer) {
			this.headers = { 'Content-Type': 'application/octet-stream', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Credentials': true };
		} else {
			this.body = JSON.stringify(this.body);
			this.headers = { 'Content-Type': 'application/links+json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Credentials': true };
		}
	}
}

module.exports = Response;
