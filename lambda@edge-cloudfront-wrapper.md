## Cloudfront Lambda@Edge example wrapper to integrate with OpenAPI-Factory


```js
async function handler(trigger) {
  const records = trigger.Records;
  if (!records || !records.length) {
    logger.log({ title: 'Triggered work with no records or source', level: 'WARN' });
    return {};
  }

  // records are from CloudFront
  const cloudFrontData = trigger.Records[0].cf;
  if (cloudFrontData && cloudFrontData.config && cloudFrontData.config.eventType === 'origin-response') {
    // No host is available, no custom header is set for the origin and original host isn't present
    // const reportUrl = `https://${cloudFrontData.request.origin.s3.customHeaders['x-authress-host]}/.well-known/reports`;
    const reportUrl = 'https://HOST.DOMAIN.com/.well-known/reports';
    const defaultSrc = "'self'";
    const connectSrc = "https://rhosys.ch https://*.rhosys.ch https://*.authress.io 'self'";
    const fontSrc = "'self'";
    const frameSrc = "'none'";
    const imgSrc = "https://authress.io 'self' data:";
    const scriptSrc = "'self' 'unsafe-eval' 'unsafe-inline'";
    const styleSrc = "'unsafe-inline' 'self'";
    const objectSrc = "'none'";
    const newHeaders = {
      'content-security-policy': [{
        key: 'Content-Security-Policy',
        value: `default-src ${defaultSrc}; connect-src ${connectSrc}; font-src ${fontSrc}; frame-ancestors 'none'; frame-src ${frameSrc}; img-src ${imgSrc}; script-src ${scriptSrc}; style-src ${styleSrc}; object-src ${objectSrc}; upgrade-insecure-requests; report-uri ${reportUrl}; report-to default`
      }],
      'Report-To': [{ value: `[{ 'group': 'default', 'max_age': 86400, 'endpoints': [{ 'url': ${reportUrl} }], 'include_subdomains': true }]` }],
      'NEL': [{ value: "{ 'report_to': 'default', 'max_age': 86400, 'include_subdomains': true, 'success_fraction': 0.0, 'failure_fraction': 1.0 }" }],
      'strict-transport-security': [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains, preload' }],
      'x-content-type-options': [{ key: 'X-Content-Type-Options', value: 'nosniff' }],
      'x-frame-options': [{ key: 'X-Frame-Options', value: 'DENY' }],
      'referrer-policy': [{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }]
    };
    const response = cloudFrontData.response;
    Object.assign(response.headers, newHeaders);
    return response;
  }

  if (cloudFrontData) {
    const request = cloudFrontData.request;
    let body = request.body && request.body.data && Buffer.from(request.body.data, 'base64').toString() || null;
    try {
      body = body && JSON.parse(body);
    } catch (error) {
      /* */
    }

    const constructedRequest = {
      // used path
      path: request.uri.replace(/^\/api/, ''),
      // symbol path
      resource: '/{proxy+}',
      httpMethod: request.method,
      queryStringParameters: querystring.parse(request.querystring),
      pathParameters: {
        proxy: request.uri.replace(/^\/api/, '').slice(1)
      },
      headers: Object.keys(request.headers).reduce((agg, h) => {
        agg[h] = request.headers[h].length === 1 ? request.headers[h][0].value : request.headers[h].map(o => o.value);
        return agg;
      }, {}),
      body,
      requestContext: {
        requestId: request.config && request.config.requestId,
        stage: null
        // authorizer: {
        //   principalId: ''
        // }
      }
    };

    try {
      constructedRequest.requestContext.authorizer = await authorizer.extractRequestMetadata(constructedRequest);
    } catch (error) {
      if (error.message.statusCode) {
        return error.message;
      }
      logger.log({ title: 'Failed to handle authorize cloud front request', level: 'ERROR', constructedRequest, context, error });
      return {
        status: 500,
        headers: { 'access-control-allow-origin': [{ value: '*' }] },
        body: Buffer.from(JSON.stringify({ title: 'Unexpected error in authorization' })).toString('base64'),
        bodyEncoding: 'base64'
      };
    }

    try {
      const response = await apiHandler(constructedRequest, context);
      const responseHeaders = cloneDeep(response.headers || {});
      Object.keys(responseHeaders).forEach(h => {
        responseHeaders[h] = responseHeaders[h] ? [{ value: responseHeaders[h] }] : [];
      });
      const multiValueHeaders = cloneDeep(response.multiValueHeaders || {});
      Object.keys(multiValueHeaders).filter(h => multiValueHeaders[h]).forEach(h => {
        responseHeaders[h] = multiValueHeaders[h].filter(v => v).map(value => ({ value }));
      });

      const cloudFrontResponse = {
        status: `${response.statusCode}`,
        // statusDescription: 'OK',
        headers: responseHeaders,
        body: response.body ? Buffer.from(response.body).toString('base64') : undefined,
        bodyEncoding: response.body ? 'base64' : undefined
      };
      return cloudFrontResponse;
    } catch (error) {
      logger.log({ title: 'Failed to handle cloud front request, and it should have been caught', level: 'CRITICAL', constructedRequest, context, error });
      return {
        status: 500,
        headers: { 'access-control-allow-origin': [{ value: '*' }] },
        body: Buffer.from(JSON.stringify({ title: 'Unexpected error in with CDN', error: { code: error.code, message: error.message } })).toString('base64'),
        bodyEncoding: 'base64'
      };
    }
  }
}
```
