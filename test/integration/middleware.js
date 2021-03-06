const assert = require('assert')
const mongoose = require('mongoose')
const request = require('request')
const sinon = require('sinon')
const util = require('util')

module.exports = function (createFn, setup, dismantle) {
  const erm = require('../../lib/express-restify-mongoose')
  const db = require('./setup')()

  const testPort = 30023
  const testUrl = `http://localhost:${testPort}`
  const invalidId = 'invalid-id'
  const randomId = mongoose.Types.ObjectId().toHexString()

  describe('preMiddleware/Create/Read/Update/Delete - null', () => {
    let app = createFn()
    let server
    let customer

    beforeEach((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, {
          preMiddleware: null,
          preCreate: null,
          preRead: null,
          preUpdate: null,
          preDelete: null,
          restify: app.isRestify
        })

        db.models.Customer.create({
          name: 'Bob'
        }).then((createdCustomer) => {
          customer = createdCustomer
          server = app.listen(testPort, done)
        }, (err) => {
          done(err)
        })
      })
    })

    afterEach((done) => {
      dismantle(app, server, done)
    })

    it('POST /Customer 201', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer`,
        json: {
          name: 'John'
        }
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 201)
        done()
      })
    })

    it('GET /Customer 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        done()
      })
    })

    it('POST /Customer/:id 200', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        json: {
          name: 'Bobby'
        }
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        done()
      })
    })

    it('PUT /Customer/:id 200', (done) => {
      request.put({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        json: {
          name: 'Bobby'
        }
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        done()
      })
    })

    it('DELETE /Customer/:id 204', (done) => {
      request.del({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 204)
        done()
      })
    })
  })

  describe('preMiddleware', () => {
    let app = createFn()
    let server
    let customer
    let options = {
      preMiddleware: sinon.spy((req, res, next) => {
        next()
      }),
      restify: app.isRestify
    }

    beforeEach((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, options)

        db.models.Customer.create({
          name: 'Bob'
        }).then((createdCustomer) => {
          customer = createdCustomer
          server = app.listen(testPort, done)
        }, (err) => {
          done(err)
        })
      })
    })

    afterEach((done) => {
      options.preMiddleware.reset()
      dismantle(app, server, done)
    })

    it('GET /Customer 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.preMiddleware)
        let args = options.preMiddleware.args[0]
        assert.equal(args.length, 3)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('GET /Customer/:id 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.preMiddleware)
        let args = options.preMiddleware.args[0]
        assert.equal(args.length, 3)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('POST /Customer 201', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer`,
        json: {
          name: 'Pre'
        }
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 201)
        sinon.assert.calledOnce(options.preMiddleware)
        let args = options.preMiddleware.args[0]
        assert.equal(args.length, 3)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('POST /Customer 400 - not called (missing content type)', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer`
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.notCalled(options.preMiddleware)
        done()
      })
    })

    it('POST /Customer 400 - not called (invalid content type)', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer`,
        formData: {}
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.notCalled(options.preMiddleware)
        done()
      })
    })

    it('POST /Customer/:id 200', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        json: {}
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.preMiddleware)
        let args = options.preMiddleware.args[0]
        assert.equal(args.length, 3)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('POST /Customer/:id 400 - not called (missing content type)', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer/${customer._id}`
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.notCalled(options.preMiddleware)
        done()
      })
    })

    it('POST /Customer/:id 400 - not called (invalid content type)', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        formData: {}
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.notCalled(options.preMiddleware)
        done()
      })
    })

    it('PUT /Customer/:id 200', (done) => {
      request.put({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        json: {}
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.preMiddleware)
        let args = options.preMiddleware.args[0]
        assert.equal(args.length, 3)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('PUT /Customer/:id 400 - not called (missing content type)', (done) => {
      request.put({
        url: `${testUrl}/api/v1/Customer/${customer._id}`
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.notCalled(options.preMiddleware)
        done()
      })
    })

    it('PUT /Customer/:id 400 - not called (invalid content type)', (done) => {
      request.put({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        formData: {}
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.notCalled(options.preMiddleware)
        done()
      })
    })

    it('DELETE /Customer 204', (done) => {
      request.del({
        url: `${testUrl}/api/v1/Customer`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 204)
        sinon.assert.calledOnce(options.preMiddleware)
        let args = options.preMiddleware.args[0]
        assert.equal(args.length, 3)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('DELETE /Customer/:id 204', (done) => {
      request.del({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 204)
        sinon.assert.calledOnce(options.preMiddleware)
        let args = options.preMiddleware.args[0]
        assert.equal(args.length, 3)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })
  })

  describe('preCreate', () => {
    let app = createFn()
    let server
    let options = {
      preCreate: sinon.spy((req, res, next) => {
        next()
      }),
      restify: app.isRestify
    }

    beforeEach((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, options)

        server = app.listen(testPort, done)
      })
    })

    afterEach((done) => {
      options.preCreate.reset()
      dismantle(app, server, done)
    })

    it('POST /Customer 201', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer`,
        json: {
          name: 'Bob'
        }
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 201)
        sinon.assert.calledOnce(options.preCreate)
        let args = options.preCreate.args[0]
        assert.equal(args.length, 3)
        assert.equal(args[0].erm.result.name, 'Bob')
        assert.equal(args[0].erm.statusCode, 201)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })
  })

  describe('preRead', () => {
    let app = createFn()
    let server
    let customer
    let options = {
      preRead: sinon.spy((req, res, next) => {
        next()
      }),
      restify: app.isRestify
    }

    beforeEach((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, options)

        db.models.Customer.create({
          name: 'Bob'
        }).then((createdCustomer) => {
          customer = createdCustomer
          server = app.listen(testPort, done)
        }, (err) => {
          done(err)
        })
      })
    })

    afterEach((done) => {
      options.preRead.reset()
      dismantle(app, server, done)
    })

    it('GET /Customer 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.preRead)
        let args = options.preRead.args[0]
        assert.equal(args.length, 3)
        assert.equal(args[0].erm.result[0].name, 'Bob')
        assert.equal(args[0].erm.statusCode, 200)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('GET /Customer/count 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer/count`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.preRead)
        let args = options.preRead.args[0]
        assert.equal(args.length, 3)
        assert.equal(args[0].erm.result.count, 1)
        assert.equal(args[0].erm.statusCode, 200)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('GET /Customer/:id 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.preRead)
        let args = options.preRead.args[0]
        assert.equal(args.length, 3)
        assert.equal(args[0].erm.result.name, 'Bob')
        assert.equal(args[0].erm.statusCode, 200)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('GET /Customer/:id/shallow 200', (done) => {
      request.get({
        url: util.format('%s/api/v1/Customer/%s/shallow', testUrl, customer._id),
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.preRead)
        let args = options.preRead.args[0]
        assert.equal(args.length, 3)
        assert.equal(args[0].erm.result.name, 'Bob')
        assert.equal(args[0].erm.statusCode, 200)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })
  })

  describe('preUpdate', () => {
    let app = createFn()
    let server
    let customer
    let options = {
      preUpdate: sinon.spy((req, res, next) => {
        next()
      }),
      restify: app.isRestify
    }

    beforeEach((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, options)

        db.models.Customer.create({
          name: 'Bob'
        }).then((createdCustomer) => {
          customer = createdCustomer
          server = app.listen(testPort, done)
        }, (err) => {
          done(err)
        })
      })
    })

    afterEach((done) => {
      options.preUpdate.reset()
      dismantle(app, server, done)
    })

    it('POST /Customer/:id 200', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        json: {
          name: 'Bobby'
        }
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.preUpdate)
        let args = options.preUpdate.args[0]
        assert.equal(args.length, 3)
        assert.equal(args[0].erm.result.name, 'Bobby')
        assert.equal(args[0].erm.statusCode, 200)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('POST /Customer/:id 400 - not called (missing content type)', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer/${customer._id}`
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.notCalled(options.preUpdate)
        done()
      })
    })

    it('POST /Customer/:id 400 - not called (invalid content type)', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        formData: {}
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.notCalled(options.preUpdate)
        done()
      })
    })

    it('PUT /Customer/:id 200', (done) => {
      request.put({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        json: {
          name: 'Bobby'
        }
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.preUpdate)
        let args = options.preUpdate.args[0]
        assert.equal(args.length, 3)
        assert.equal(args[0].erm.result.name, 'Bobby')
        assert.equal(args[0].erm.statusCode, 200)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('PUT /Customer/:id 400 - not called (missing content type)', (done) => {
      request.put({
        url: `${testUrl}/api/v1/Customer/${customer._id}`
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.notCalled(options.preUpdate)
        done()
      })
    })

    it('PUT /Customer/:id 400 - not called (invalid content type)', (done) => {
      request.put({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        formData: {}
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.notCalled(options.preUpdate)
        done()
      })
    })
  })

  describe('preDelete', () => {
    let app = createFn()
    let server
    let customer
    let options = {
      preDelete: sinon.spy((req, res, next) => {
        next()
      }),
      restify: app.isRestify
    }

    beforeEach((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, options)

        db.models.Customer.create({
          name: 'Bob'
        }).then((createdCustomer) => {
          customer = createdCustomer
          server = app.listen(testPort, done)
        }, (err) => {
          done(err)
        })
      })
    })

    afterEach((done) => {
      options.preDelete.reset()
      dismantle(app, server, done)
    })

    it('DELETE /Customer 204', (done) => {
      request.del({
        url: `${testUrl}/api/v1/Customer`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 204)
        sinon.assert.calledOnce(options.preDelete)
        let args = options.preDelete.args[0]
        assert.equal(args.length, 3)
        assert.equal(args[0].erm.result, undefined)
        assert.equal(args[0].erm.statusCode, 204)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('DELETE /Customer/:id 204', (done) => {
      request.del({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 204)
        sinon.assert.calledOnce(options.preDelete)
        let args = options.preDelete.args[0]
        assert.equal(args.length, 3)
        assert.equal(args[0].erm.result, undefined)
        assert.equal(args[0].erm.statusCode, 204)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })
  })

  describe('postCreate/Read/Update/Delete - null', () => {
    let app = createFn()
    let server
    let customer

    beforeEach((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, {
          postCreate: null,
          postRead: null,
          postUpdate: null,
          postDelete: null,
          restify: app.isRestify
        })

        db.models.Customer.create({
          name: 'Bob'
        }).then((createdCustomer) => {
          customer = createdCustomer
          server = app.listen(testPort, done)
        }, (err) => {
          done(err)
        })
      })
    })

    afterEach((done) => {
      dismantle(app, server, done)
    })

    it('POST /Customer 201', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer`,
        json: {
          name: 'John'
        }
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 201)
        done()
      })
    })

    it('GET /Customer 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        done()
      })
    })

    it('POST /Customer/:id 200', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        json: {
          name: 'Bobby'
        }
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        done()
      })
    })

    it('PUT /Customer/:id 200', (done) => {
      request.put({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        json: {
          name: 'Bobby'
        }
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        done()
      })
    })

    it('DELETE /Customer/:id 204', (done) => {
      request.del({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 204)
        done()
      })
    })
  })

  describe('postCreate', () => {
    let app = createFn()
    let server
    let options = {
      postCreate: sinon.spy((req, res, next) => {
        next()
      }),
      restify: app.isRestify
    }

    beforeEach((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, options)

        server = app.listen(testPort, done)
      })
    })

    afterEach((done) => {
      options.postCreate.reset()
      dismantle(app, server, done)
    })

    it('POST /Customer 201', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer`,
        json: {
          name: 'Bob'
        }
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 201)
        sinon.assert.calledOnce(options.postCreate)
        let args = options.postCreate.args[0]
        assert.equal(args.length, 3)
        assert.equal(args[0].erm.result.name, 'Bob')
        assert.equal(args[0].erm.statusCode, 201)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('POST /Customer 400 - missing required field', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer`,
        json: {
          comment: 'Bar'
        }
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.notCalled(options.postCreate)
        done()
      })
    })
  })

  describe('postRead', () => {
    let app = createFn()
    let server
    let customer
    let options = {
      postRead: sinon.spy((req, res, next) => {
        next()
      }),
      restify: app.isRestify
    }

    beforeEach((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, options)

        db.models.Customer.create({
          name: 'Bob'
        }).then((createdCustomer) => {
          customer = createdCustomer
          server = app.listen(testPort, done)
        }, (err) => {
          done(err)
        })
      })
    })

    afterEach((done) => {
      options.postRead.reset()
      dismantle(app, server, done)
    })

    it('GET /Customer 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.postRead)
        let args = options.postRead.args[0]
        assert.equal(args.length, 3)
        assert.equal(args[0].erm.result[0].name, 'Bob')
        assert.equal(args[0].erm.statusCode, 200)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('GET /Customer/count 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer/count`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.postRead)
        let args = options.postRead.args[0]
        assert.equal(args.length, 3)
        assert.equal(args[0].erm.result.count, 1)
        assert.equal(args[0].erm.statusCode, 200)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('GET /Customer/:id 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.postRead)
        let args = options.postRead.args[0]
        assert.equal(args.length, 3)
        assert.equal(args[0].erm.result.name, 'Bob')
        assert.equal(args[0].erm.statusCode, 200)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('GET /Customer/:id 404', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer/${randomId}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 404)
        sinon.assert.notCalled(options.postRead)
        done()
      })
    })

    it('GET /Customer/:id 400', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer/${invalidId}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.notCalled(options.postRead)
        done()
      })
    })

    it('GET /Customer/:id/shallow 200', (done) => {
      request.get({
        url: util.format('%s/api/v1/Customer/%s/shallow', testUrl, customer._id),
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.postRead)
        let args = options.postRead.args[0]
        assert.equal(args.length, 3)
        assert.equal(args[0].erm.result.name, 'Bob')
        assert.equal(args[0].erm.statusCode, 200)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })
  })

  describe('postUpdate', () => {
    let app = createFn()
    let server
    let customer
    let options = {
      postUpdate: sinon.spy((req, res, next) => {
        next()
      }),
      restify: app.isRestify
    }

    beforeEach((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, options)

        db.models.Customer.create({
          name: 'Bob'
        }).then((createdCustomer) => {
          customer = createdCustomer
          server = app.listen(testPort, done)
        }, (err) => {
          done(err)
        })
      })
    })

    afterEach((done) => {
      options.postUpdate.reset()
      dismantle(app, server, done)
    })

    it('POST /Customer/:id 200', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        json: {
          name: 'Bobby'
        }
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.postUpdate)
        let args = options.postUpdate.args[0]
        assert.equal(args.length, 3)
        assert.equal(args[0].erm.result.name, 'Bobby')
        assert.equal(args[0].erm.statusCode, 200)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('POST /Customer/:id 404 - random id', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer/${randomId}`,
        json: {
          name: 'Bobby'
        }
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 404)
        sinon.assert.notCalled(options.postUpdate)
        done()
      })
    })

    it('POST /Customer/:id 400 - invalid id', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer/${invalidId}`,
        json: {
          name: 'Bobby'
        }
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.notCalled(options.postUpdate)
        done()
      })
    })

    it('POST /Customer/:id 400 - not called (missing content type)', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer/${customer._id}`
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.notCalled(options.postUpdate)
        done()
      })
    })

    it('POST /Customer/:id 400 - not called (invalid content type)', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        formData: {}
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.notCalled(options.postUpdate)
        done()
      })
    })

    it('PUT /Customer/:id 200', (done) => {
      request.put({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        json: {
          name: 'Bobby'
        }
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.postUpdate)
        let args = options.postUpdate.args[0]
        assert.equal(args.length, 3)
        assert.equal(args[0].erm.result.name, 'Bobby')
        assert.equal(args[0].erm.statusCode, 200)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('PUT /Customer/:id 404 - random id', (done) => {
      request.put({
        url: `${testUrl}/api/v1/Customer/${randomId}`,
        json: {
          name: 'Bobby'
        }
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 404)
        sinon.assert.notCalled(options.postUpdate)
        done()
      })
    })

    it('PUT /Customer/:id 400 - invalid id', (done) => {
      request.put({
        url: `${testUrl}/api/v1/Customer/${invalidId}`,
        json: {
          name: 'Bobby'
        }
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.notCalled(options.postUpdate)
        done()
      })
    })

    it('PUT /Customer/:id 400 - not called (missing content type)', (done) => {
      request.put({
        url: `${testUrl}/api/v1/Customer/${customer._id}`
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.notCalled(options.postUpdate)
        done()
      })
    })

    it('PUT /Customer/:id 400 - not called (invalid content type)', (done) => {
      request.put({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        formData: {}
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.notCalled(options.postUpdate)
        done()
      })
    })
  })

  describe('postDelete', () => {
    let app = createFn()
    let server
    let customer
    let options = {
      postDelete: sinon.spy((req, res, next) => {
        next()
      }),
      restify: app.isRestify
    }

    beforeEach((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, options)

        db.models.Customer.create({
          name: 'Bob'
        }).then((createdCustomer) => {
          customer = createdCustomer
          server = app.listen(testPort, done)
        }, (err) => {
          done(err)
        })
      })
    })

    afterEach((done) => {
      options.postDelete.reset()
      dismantle(app, server, done)
    })

    it('DELETE /Customer 204', (done) => {
      request.del({
        url: `${testUrl}/api/v1/Customer`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 204)
        sinon.assert.calledOnce(options.postDelete)
        let args = options.postDelete.args[0]
        assert.equal(args.length, 3)
        assert.equal(args[0].erm.result, undefined)
        assert.equal(args[0].erm.statusCode, 204)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('DELETE /Customer/:id 204', (done) => {
      request.del({
        url: `${testUrl}/api/v1/Customer/${customer._id}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 204)
        sinon.assert.calledOnce(options.postDelete)
        let args = options.postDelete.args[0]
        assert.equal(args.length, 3)
        assert.equal(args[0].erm.result, undefined)
        assert.equal(args[0].erm.statusCode, 204)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('DELETE /Customer/:id 404', (done) => {
      request.del({
        url: `${testUrl}/api/v1/Customer/${randomId}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 404)
        sinon.assert.notCalled(options.postDelete)
        done()
      })
    })

    it('DELETE /Customer/:id 400', (done) => {
      request.del({
        url: `${testUrl}/api/v1/Customer/${invalidId}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.notCalled(options.postDelete)
        done()
      })
    })
  })

  describe('postCreate yields an error', () => {
    let app = createFn()
    let server
    let options = {
      postCreate: sinon.spy((req, res, next) => {
        let err = new Error('Something went wrong')
        err.statusCode = 400
        next(err)
      }),
      postProcess: sinon.spy(),
      restify: app.isRestify
    }

    beforeEach((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, options)

        server = app.listen(testPort, done)
      })
    })

    afterEach((done) => {
      options.postCreate.reset()
      dismantle(app, server, done)
    })

    it('POST /Customer 201', (done) => {
      request.post({
        url: `${testUrl}/api/v1/Customer`,
        json: {
          name: 'Bob'
        }
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.calledOnce(options.postCreate)
        let args = options.postCreate.args[0]
        assert.equal(args.length, 3)
        assert.equal(args[0].erm.result.name, 'Bob')
        assert.equal(args[0].erm.statusCode, 201)
        assert.equal(typeof args[2], 'function')
        sinon.assert.notCalled(options.postProcess)
        done()
      })
    })
  })

  describe('postProcess', () => {
    let app = createFn()
    let server
    let options = {
      postProcess: sinon.spy((req, res, next) => {
        next()
      }),
      restify: app.isRestify
    }

    beforeEach((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, options)

        server = app.listen(testPort, done)
      })
    })

    afterEach((done) => {
      options.postProcess.reset()
      dismantle(app, server, done)
    })

    it('GET /Customer 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.postProcess)
        let args = options.postProcess.args[0]
        assert.equal(args.length, 3)
        assert.deepEqual(args[0].erm.result, [])
        assert.equal(args[0].erm.statusCode, 200)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })
  })
}
