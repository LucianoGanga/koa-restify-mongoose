'use strict';

const _ = require('lodash');

module.exports = function(options) {

  return function*(next) {
    let restifyContext = this.state.restifyContext;

    let postMiddleware;
    switch (this.method.toLowerCase()) {
      case 'get':
        postMiddleware = options.postRead;
        break
      case 'post':
        if (restifyContext.statusCode === 201) {
          postMiddleware = options.postCreate;
        } else {
          postMiddleware = options.postUpdate;
        }
        break
      case 'put':
      case 'patch':
        postMiddleware = options.postUpdate;
        break
      case 'delete':
        postMiddleware = options.postDelete;
        break
    }

    // TODO: Fix the call to postMiddleware 
    // yield postMiddleware(next);

    if (options.totalCountHeader && restifyContext.totalCount) {
      this.set(_.isString(options.totalCountHeader) ? options.totalCountHeader : 'X-Total-Count', restifyContext.totalCount);
    }

    yield options.outputFn(this, {
      result: restifyContext.result,
      statusCode: restifyContext.statusCode
    });

    if (options.postProcess) {
      options.postProcess(next)
    }

  }
}
