'use strict';

const _ = require('lodash')
const http = require('http')
const Filter = require('./resource_filter')

module.exports = function(model, options) {
	let buildQuery = require('./buildQuery')(options);
	let filter = new Filter(model, {
		private: options.private,
		protected: options.protected
	})

	function findById(filteredContext, id) {
		let byId = {}
		byId[options.idProperty] = id
		return filteredContext.findOne().and(byId)
	}

	function* getItems(next) {
		// Apply a context filter first, if it exists
		let filteredContext = yield options.contextFilter(model);

		// Get the module context and the query options
		let restifyContext = this.state.restifyContext;
		let queryOptions = restifyContext.queryOptions;

		// Build the query
		let query = buildQuery(filteredContext.find(), queryOptions);

		// Set read preference
		query.read(options.readPreference);

		let items = yield query.lean(options.lean).exec();

		// Find more parameters
		let populate = queryOptions.populate;
		let opts = {
			populate: populate,
			access: restifyContext.access
		};

		// Filter items
		items = filter.filterObject(items, opts);

		restifyContext.result = items;
		restifyContext.statusCode = 200;

		if (options.totalCountHeader) {
			restifyContext.totalCount = yield query.skip(0).limit(0).count().exec();
			yield next;
		} else {
			yield next;
		}
	}

	function* getCount(next) {
		// Apply a context filter first, if it exists
		let filteredContext = yield options.contextFilter(model);

		// Get the module context and the query options
		let restifyContext = this.state.restifyContext;
		let queryOptions = restifyContext.queryOptions;

		let count = yield buildQuery(filteredContext.count(), queryOptions).exec();

		restifyContext.result = {
			count: count
		};
		restifyContext.statusCode = 200;

		yield next;
	}

	function* getShallow(next) {
		// Apply a context filter first, if it exists
		let filteredContext = yield options.contextFilter(model);

		// Get the module context and the query options
		let restifyContext = this.state.restifyContext;
		let queryOptions = restifyContext.queryOptions;

		// Build the query
		let item = yield buildQuery(findById(filteredContext, this.params.id), queryOptions)
			.lean(options.lean)
			.read(options.readPreference)
			.exec();

		if (!item) {
			let err = new Error(http.STATUS_CODES[404])
			err.statusCode = 404
			return options.onError(err);
		}

		let populate = queryOptions.populate
		let opts = {
			populate: populate,
			access: restifyContext.access
		}

		item = filter.filterObject(item, opts)

		for (let prop in item) {
			item[prop] = typeof item[prop] === 'object' && prop !== '_id' ? true : item[prop]
		}

		restifyContext.result = item
		restifyContext.statusCode = 200

		yield next;

	}

	function* deleteItems(next) {
		// Apply a context filter first, if it exists
		let filteredContext = yield options.contextFilter(model);

		// Get the module context and the query options
		let restifyContext = this.state.restifyContext;
		let queryOptions = restifyContext.queryOptions;

		// Build and run the query
		yield buildQuery(filteredContext.find(), queryOptions).remove();

		restifyContext.statusCode = 204;

		yield next;
	}

	function* getItem(next) {
		// Apply a context filter first, if it exists
		let filteredContext = yield options.contextFilter(model);

		// Get the module context and the query options
		let restifyContext = this.state.restifyContext;
		let queryOptions = restifyContext.queryOptions;

		// Build the query
		let item = yield buildQuery(findById(filteredContext, this.params.id), queryOptions)
			.lean(options.lean)
			.read(options.readPreference)
			.exec();

		if (!item) {
			let err = new Error(http.STATUS_CODES[404]);
			err.statusCode = 404;
			return options.onError(err)
		}

		let populate = queryOptions.populate
		let opts = {
			populate: populate,
			access: restifyContext.access
		}

		item = filter.filterObject(item, opts);

		restifyContext.result = item;
		restifyContext.statusCode = 200;

		yield next;

	}

	function* deleteItem(next) {

		// Get the module context and the query options
		let restifyContext = this.state.restifyContext;

		let byId = {}
		byId[options.idProperty] = this.params.id

		if (options.findOneAndRemove) {
			// Apply a context filter first, if it exists
			let filteredContext = yield options.contextFilter(model);

			// Find the item and delete it
			let item = yield findById(filteredContext, this.params.id).findOneAndRemove();

			if (!item) {
				let err = new Error(http.STATUS_CODES[404]);
				err.statusCode = 404;
				return options.onError(err);
			}

			restifyContext.statusCode = 204

			yield next;

		} else {
			yield restifyContext.document.remove();
			yield next;
		}
	}

	function* createObject(next) {
		// Get the module context and the query options
		let restifyContext = this.state.restifyContext;
		let queryOptions = restifyContext.queryOptions;

		let filterOpts = {
			access: restifyContext.access,
			populate: queryOptions.populate
		};

		this.request.body = filter.filterObject(this.request.body || {}, filterOpts);

		if (model.schema.options._id) {
			delete this.request.body._id;
		}

		if (model.schema.options.versionKey) {
			delete this.request.body[model.schema.options.versionKey];
		}

		let item = model.create(this.request.body).then(function(item) {
			return model.populate(item, queryOptions.populate || []);
		});

		item = filter.filterObject(item, filterOpts);

		restifyContext.result = item;
		restifyContext.statusCode = 201;

		yield next;
	}

	function* modifyObject(next) {
		// Get the module context and the query options
		let restifyContext = this.state.restifyContext;
		let queryOptions = restifyContext.queryOptions;

		let filterOpts = {
			access: restifyContext.access,
			populate: queryOptions.populate
		};

		this.request.body = filter.filterObject(this.request.body || {}, filterOpts);
		delete this.request.body._id

		if (model.schema.options.versionKey) {
			delete this.request.body[model.schema.options.versionKey];
		}

		function depopulate(src) {
			let dst = {};

			for (let key in src) {
				let path = model.schema.path(key);

				if (path && path.caster && path.caster.instance === 'ObjectID') {
					if (_.isArray(src[key])) {
						for (let j = 0; j < src[key].length; ++j) {
							if (typeof src[key][j] === 'object') {
								dst[key] = dst[key] || {};
								dst[key][j] = src[key][j]._id;
							}
						}
					} else if (_.isPlainObject(src[key])) {
						dst[key] = src[key]._id;
					}
				} else if (_.isPlainObject(src[key])) {
					if (path && path.instance === 'ObjectID') {
						dst[key] = src[key]._id;
					} else {
						dst[key] = depopulate(src[key]);
					}
				}

				if (typeof dst[key] === 'undefined') {
					dst[key] = src[key];
				}
			}

			return dst;
		}

		/* Recursively converts objects to dot notation
		 * {
		 *   favorites: {
		 *     animal: 'Boar',
		 *     color: 'Black'
		 *   }
		 * }
		 * ...becomes:
		 * {
		 *   'favorites.animal': 'Boar',
		 *   'favorites.color': 'Black',
		 * }
		 */
		function flatten(src, dst, prefix) {
			dst = dst || {};
			prefix = prefix || '';

			for (let key in src) {
				if (_.isPlainObject(src[key])) {
					flatten(src[key], dst, prefix + key + '.');
				} else {
					dst[prefix + key] = src[key];
				}
			}

			return dst;
		}

		let cleanBody = flatten(depopulate(this.request.body))

		if (options.findOneAndUpdate) {

			// Apply a context filter first, if it exists
			let filteredContext = yield options.contextFilter(model);

			// Build the query
			let item = findById(filteredContext, this.params.id).findOneAndUpdate({}, {
				$set: cleanBody
			}, {
				new: true,
				runValidators: options.runValidators
			}).exec();

			item = yield model.populate(item, queryOptions.populate || []);

			if (!item) {
				let err = new Error(http.STATUS_CODES[404]);
				err.statusCode = 404;
				return options.onError(err);
			}

			item = filter.filterObject(item, filterOpts)

			restifyContext.result = item
			restifyContext.statusCode = 200

			yield next;

		} else {
			for (let key in cleanBody) {
				restifyContext.document.set(key, cleanBody[key]);
			}

			let item = yield restifyContext.document.save().then(function(item) {
				return model.populate(item, queryOptions.populate || []);
			});

			item = filter.filterObject(item, filterOpts);

			restifyContext.result = item;
			restifyContext.statusCode = 200;

			yield next;

		}
	}

	return {
		getItems: getItems,
		getCount: getCount,
		getItem: getItem,
		getShallow: getShallow,
		createObject: createObject,
		modifyObject: modifyObject,
		deleteItems: deleteItems,
		deleteItem: deleteItem
	}
}
