/* eslint camelcase: 0 */
'use strict'

const util = require('util');
const _ = require('lodash');
const inflection = require('inflection');
const customDefaults = null;
const compose = require('koa-compose');

function getDefaults() {
	return _.defaults(customDefaults || {}, {
		prefix: '/api',
		version: '/v1',
		idProperty: '_id',
		findOneAndUpdate: true,
		findOneAndRemove: true,
		lean: true,
		lowercase: false,
		plural: true,
		restify: false,
		runValidators: false,
		private: [],
		protected: []
	});
}

const restify = function(app, model, opts) {

	// Attach the restifyContext variable to Koa's this.state object
	app.use(function*(next) {

		if (!this.state.restifyContext) {
			this.state.restifyContext = {};
		}

		this.state.restifyContext.model = model;

		yield next;

	});

	const options = {};
	_.assign(options, getDefaults(), opts || {});

	let ensureContentType = require('./middleware/ensureContentType')(options);
	let filterAndFindById = require('./middleware/filterAndFindById')(model, options);
	let onError = require('./middleware/onError');
	let outputFn = require('./middleware/outputFn');
	let prepareQuery = require('./middleware/prepareQuery')(options);
	let prepareOutput = require('./middleware/prepareOutput')(options);

	let normalizeMiddlewares = require('./normalizeMiddlewares');

	// Check the middlewares received in the option object.
	normalizeMiddlewares(options);

	// Filter the context
	if (!options.contextFilter) {
		options.contextFilter = function*(model) {
			return model;
		}
	}

	if (!options.onError) {
		options.onError = onError;
	}

	if (!options.outputFn) {
		options.outputFn = outputFn;
	}

	options.name = options.name || model.modelName

	if (options.plural) {
		options.name = inflection.pluralize(options.name)
	}

	if (options.lowercase) {
		options.name = options.name.toLowerCase()
	}

	let ops = require('./operations')(model, options);

	let uri_item = util.format('%s%s/%s', options.prefix, options.version, options.name);

	if (uri_item.indexOf('/:id') === -1) {
		uri_item += '/:id'
	}

	let uri_items = uri_item.replace('/:id', '');
	let uri_count = uri_items + '/count';
	let uri_shallow = uri_item + '/shallow';

	if (undefined === app.delete) {
		app.delete = app.del
	}

	app.get(uri_items, prepareQuery, options.preMiddleware, options.preRead, ops.getItems, prepareOutput);
	app.get(uri_count, prepareQuery, options.preMiddleware, options.preRead, ops.getCount, prepareOutput);
	app.get(uri_item, prepareQuery, options.preMiddleware, options.preRead, ops.getItem, prepareOutput);
	app.get(uri_shallow, prepareQuery, options.preMiddleware, options.preRead, ops.getShallow, prepareOutput);

	app.post(uri_items, prepareQuery, ensureContentType, options.preMiddleware, options.preCreate, ops.createObject, prepareOutput);
	app.post(uri_item,
		util.deprecate(prepareQuery, 'Warning: in the next major version (3.0), the POST method to update resources will be removed. Use PATCH instead.'),
		ensureContentType,
		options.preMiddleware,
		compose(options.findOneAndUpdate ? [] : filterAndFindById),
		options.preUpdate,
		ops.modifyObject,
		prepareOutput);

	app.put(uri_item,
		util.deprecate(prepareQuery, 'Warning: in the next major version (3.0), the PUT method will replace rather than update a resource. Use PATCH instead.'),
		ensureContentType,
		options.preMiddleware,
		compose(options.findOneAndUpdate ? [] : filterAndFindById),
		options.preUpdate,
		ops.modifyObject,
		prepareOutput);

	app.patch(uri_item,
		prepareQuery,
		ensureContentType,
		options.preMiddleware,
		compose(options.findOneAndUpdate ? [] : filterAndFindById),
		options.preUpdate,
		ops.modifyObject,
		prepareOutput);

	app.delete(uri_items, prepareQuery, options.preMiddleware, options.preDelete, ops.deleteItems, prepareOutput);
	app.delete(uri_item, prepareQuery, options.preMiddleware, compose(options.findOneAndRemove ? [] : filterAndFindById), options.preDelete, ops.deleteItem, prepareOutput);

	return uri_items;
}

module.exports = {
	defaults: function(options) {
		customDefaults = options
	},
	serve: restify
}
