'use strict'

const _ = require('lodash')
const compose = require('koa-compose')

/**
 * If there's an array of middlewares, we need to use "koa-compose", as koa-router
 * doesn't accept an array of middlewares as a parameter
 * @param  {object} options The options object containing all the middlewares received by parameter
 */

module.exports = function(options) {

	if (!_.isArray(options.preMiddleware)) {
		options.preMiddleware = compose(options.preMiddleware ? [options.preMiddleware] : [])
	}

	if (!_.isArray(options.preCreate)) {
		options.preCreate = compose(options.preCreate ? [options.preCreate] : [])
	}

	if (!_.isArray(options.preRead)) {
		options.preRead = compose(options.preRead ? [options.preRead] : [])
	}

	if (!_.isArray(options.preUpdate)) {
		options.preUpdate = compose(options.preUpdate ? [options.preUpdate] : [])
	}

	if (!_.isArray(options.preDelete)) {
		options.preDelete = compose(options.preDelete ? [options.preDelete] : [])
	}

	if (!_.isArray(options.postCreate)) {
		options.postCreate = compose(options.postCreate ? [options.postCreate] : [])
	}

	if (!_.isArray(options.postRead)) {
		options.postRead = compose(options.postRead ? [options.postRead] : [])
	}

	if (!_.isArray(options.postUpdate)) {
		options.postUpdate = compose(options.postUpdate ? [options.postUpdate] : [])
	}

	if (!_.isArray(options.postDelete)) {
		options.postDelete = compose(options.postDelete ? [options.postDelete] : [])
	}

}
