'use strict';

const http = require('http');

module.exports = function(options) {
  return function* ensureContentType(next) {
    let ct = this.request.headers['content-type'];
    let err;

    if (!ct) {
      err = new Error(http.STATUS_CODES[400])
      err.description = 'missing_content_type';
      err.statusCode = 400;
      return options.onError(err);
    }

    if (ct.indexOf('application/json') === -1) {
      err = new Error(http.STATUS_CODES[400]);
      err.description = 'invalid_content_type';
      err.statusCode = 400;
      return options.onError(err);
    }

    yield next;
  }
}
