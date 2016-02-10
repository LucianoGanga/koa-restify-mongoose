'use strict'

const _ = require('lodash')

module.exports = function(options) {
	return function*(next) {

		// Get the module context
		let restifyContext = this.state.restifyContext

		// If the option.access is not an array, just skip it this middleware
		if (!_.isArray(options.access)) {
			restifyContext.access = []
			yield next
			return
		}

		// Check the access type passed as an option
		if (['public', 'private', 'protected'].indexOf(options.access) < 0) {
			throw new Error('Unsupported access, must be "private", "protected" or "public"')
		}

		// Append the access to the context
		restifyContext.access = options.access
		yield next
	}
}
