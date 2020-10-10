class Response {
  constructor(body, statusCode, headers) {
    let pullBody = body && (body.body || body.statusCode || body.headers);
    this.body = pullBody ? body.body : body;
    this.statusCode = (pullBody ? body.statusCode : statusCode) || 200;
    let populatedHeaders = (pullBody ? body.headers : headers) || {};

    if (!this.body) {
      delete this.body;
      populatedHeaders = Object.assign({ 'Access-Control-Allow-Origin': '*' }, populatedHeaders);
    } else if (this.body && this.body instanceof Buffer) {
      populatedHeaders = Object.assign({ 'Content-Type': 'application/octet-stream', 'Access-Control-Allow-Origin': '*' }, populatedHeaders);
    } else {
      this.body = JSON.stringify(this.body);
      populatedHeaders = Object.assign({ 'Content-Type': 'application/links+json', 'Access-Control-Allow-Origin': '*' }, populatedHeaders);
    }

    this.multiValueHeaders = Object.keys(populatedHeaders).reduce((agg, h) => {
      agg[h] = Array.isArray(populatedHeaders[h]) ? populatedHeaders[h] : [populatedHeaders[h]].filter(v => v);
      return agg;
    }, {});
  }
}

module.exports = Response;
