'use strict'

module.exports = function* output(context, response) {
	if (response.result) {
		context.body = response.result
		context.status = response.statusCode
	} else {
		context.status = response.statusCode
	}
}
