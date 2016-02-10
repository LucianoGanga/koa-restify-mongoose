'use strict'

const util = require('util')
const _ = require('lodash')
const Filter = require('./resource_filter')
const compose = require('koa-compose')

let customDefaults = null
let excludedMap = {}

function getDefaults() {
	return _.defaults(customDefaults || {}, {
		prefix: '/api',
		version: '/v1',
		idProperty: '_id',
		findOneAndUpdate: true,
		findOneAndRemove: true,
		lean: true,
		plural: true,
		restify: false,
		runValidators: false,
		private: [],
		protected: []
	})
}

const restify = function(app, model, opts) {

	// Set default options and assign the new options
	let options = {}
	_.assign(options, getDefaults(), opts || {})

	// Attach the restifyContext variable to Koa's this.state object
	app.use(function*(next) {

		if (!this.state.restifyContext) {
			this.state.restifyContext = {}
		}

		this.state.restifyContext.model = model;

		yield next

	});

	// Load all the middlewares
	const access = require('./middleware/access')
	const ensureContentType = require('./middleware/ensureContentType')(options)
	const filterAndFindById = require('./middleware/filterAndFindById')(model, options)
	const onError = require('./middleware/onError')
	const outputFn = require('./middleware/outputFn')
	const prepareQuery = require('./middleware/prepareQuery')(options)
	const prepareOutput = require('./middleware/prepareOutput')(options)

	// Check the protected and private options
	if (!_.isArray(options.private)) {
		throw new Error('"options.private" must be an array of fields')
	}

	if (!_.isArray(options.protected)) {
		throw new Error('"options.protected" must be an array of fields')
	}
	// Apply the protected and private fields to the model
	model.schema.eachPath((name, path) => {
		if (path.options.access) {
			switch (path.options.access.toLowerCase()) {
				case 'private':
					options.private.push(name)
					break
				case 'protected':
					options.protected.push(name)
					break
			}
		}
	})

	options.filter = new Filter({
		model, excludedMap, filteredKeys: {
			private: options.private,
			protected: options.protected
		}
	})
	excludedMap[model.modelName] = options.filter.filteredKeys

	// Normalize the middlewares. Check the middlewares received in the option object.
	require('./normalizeMiddlewares')(options)

	// Filter the context
	if (!options.contextFilter) {
		options.contextFilter = function*(model) {
			return model;
		}
	}

	if (!options.onError) {
		options.onError = onError
	}

	if (!options.outputFn) {
		options.outputFn = outputFn
	}

	options.name = options.name || model.modelName

	let ops = require('./operations')(model, options)

	let uri_item = `${options.prefix}${options.version}/${options.name}`
	if (uri_item.indexOf('/:id') === -1) {
		uri_item += '/:id'
	}

	const uri_items = uri_item.replace('/:id', '')
	const uri_count = uri_items + '/count'
	const uri_shallow = uri_item + '/shallow'

	if (_.isUndefined(app.delete)) {
		app.delete = app.del
	}

	const accessMiddleware = access(options)

	// Prepare all the URLs
	app.get(uri_items, prepareQuery, options.preMiddleware, options.preRead, accessMiddleware, ops.getItems, prepareOutput)
	app.get(uri_count, prepareQuery, options.preMiddleware, options.preRead, accessMiddleware, ops.getCount, prepareOutput)
	app.get(uri_item, prepareQuery, options.preMiddleware, options.preRead, accessMiddleware, ops.getItem, prepareOutput)
	app.get(uri_shallow, prepareQuery, options.preMiddleware, options.preRead, accessMiddleware, ops.getShallow, prepareOutput)

	app.post(uri_items, prepareQuery, ensureContentType, options.preMiddleware, options.preCreate, accessMiddleware, ops.createObject, prepareOutput)
	app.post(uri_item,
		util.deprecate(prepareQuery, 'Warning: in the next major version (3.0), the POST method to update resources will be removed. Use PATCH instead.'),
		ensureContentType,
		options.preMiddleware,
		compose(options.findOneAndUpdate ? [] : filterAndFindById),
		options.preUpdate,
		accessMiddleware,
		ops.modifyObject,
		prepareOutput)

	app.put(uri_item,
		util.deprecate(prepareQuery, 'Warning: in the next major version (3.0), the PUT method will replace rather than update a resource. Use PATCH instead.'),
		ensureContentType,
		options.preMiddleware,
		compose(options.findOneAndUpdate ? [] : filterAndFindById),
		options.preUpdate,
		accessMiddleware,
		ops.modifyObject,
		prepareOutput)

	app.patch(uri_item,
		prepareQuery,
		ensureContentType,
		options.preMiddleware,
		compose(options.findOneAndUpdate ? [] : filterAndFindById),
		options.preUpdate,
		accessMiddleware,
		ops.modifyObject,
		prepareOutput)

	app.delete(uri_items, prepareQuery, options.preMiddleware, options.preDelete, accessMiddleware, ops.deleteItems, prepareOutput)
	app.delete(uri_item, prepareQuery, options.preMiddleware, compose(options.findOneAndRemove ? [] : filterAndFindById), options.preDelete, accessMiddleware, ops.deleteItem, prepareOutput)

	return uri_items
}

module.exports = {
	defaults: function(options) {
		customDefaults = options
	},
	serve: restify
}
