'use strict'

const http = require('http')

module.exports = function(model, options) {
  return function*(next) {

    if (!this.params.id) {
      return yield next
    }
    // Get the module context and the query options
    let restifyContext = this.state.restifyContext

    // Apply a context filter first, if it exists
    let filteredContext = yield options.contextFilter(model)

    let byId = {}
    byId[options.idProperty] = this.params.id

    // Build the query
    let doc = yield filteredContext.findOne().and(byId).lean(false).read(options.readPreference).exec()

    if (!doc) {
      let err = new Error(http.STATUS_CODES[404])
      err.statusCode = 404
      return options.onError(err)
    }

    restifyContext.document = doc

    yield next
  }
}
