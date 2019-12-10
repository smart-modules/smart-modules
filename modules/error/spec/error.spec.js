/**
 * @file Unit tests for SmartError
 */
'use strict'

const { expect } = require('chai')
const SmartError = require('../lib/error')

describe('SmartError', function () {
  describe('inheritance', function () {
    it('must not create a subclass when given invalid arguments', function () {
      expect(() => SmartError.create()).to.throw('SmartError must have a valid name!')
      expect(() => SmartError.create(null)).to.throw('SmartError must have a valid name!')
      expect(() => SmartError.create('MyError')).to.throw('MyError must have a valid list of errors!')
      expect(() => SmartError.create(42)).to.throw('SmartError must have a valid name!')
      expect(() => SmartError.create({})).to.throw('SmartError must have a valid name!')
      expect(() => SmartError.create([])).to.throw('SmartError must have a valid name!')
      expect(() => SmartError.create(null, null)).to.throw('SmartError must have a valid name!')
      expect(() => SmartError.create('MyError', {})).to.throw('MyError must have a valid list of errors!')
      expect(() => SmartError.create('MyError', { 42: 42 })).to.throw('Invalid message "42" for MyError!')
    })
  })

  describe('instantiation', function () {
    const ERRORS = {
      Unexpected: 'An unexpected error has occurred.',
      TimedOut: 'The operation timed out.'
    }
    let MyError = null

    beforeEach(function () {
      MyError = SmartError.create('MyError', ERRORS)
    })

    function validateInstance (err, errJson, errString) {
      expect(err).to.be.an.instanceof(MyError)

      // instance properties
      expect(err).to.have.property('name')
      expect(err.name).to.equal('MyError')

      expect(err).to.have.property('isSmartError')
      expect(err.isSmartError).to.equal(true)

      expect(err).to.have.property('isMyError')
      expect(err.isMyError).to.be.true // eslint-disable-line no-unused-expressions

      expect(err).to.have.property('isUnexpected')
      expect(err.isUnexpected).to.be.true // eslint-disable-line no-unused-expressions

      expect(err).to.have.property('code')
      expect(err.code).to.equal('Unexpected')

      expect(err).to.have.property('metadata')
      expect(err.metadata).to.equal('foo')

      expect(err).to.have.property('stack')
      expect(err.stack).to.be.a('string')

      // .toJSON()
      expect(errJson).to.be.an('object')
      expect(errJson).to.have.property('name')
      expect(errJson.name).to.equal('MyError')
      expect(errJson).to.have.property('code')
      expect(errJson.code).to.equal('Unexpected')
      expect(errJson).to.have.property('message')
      expect(errJson.message).to.equal(ERRORS.Unexpected)
      expect(errJson).to.have.property('stack')
      expect(errJson.stack).to.be.a('string')

      // .toString()
      expect(errString).to.be.a('string')
      expect(errString).to.equal(`MyError[Unexpected]: ${ERRORS.Unexpected}`)
    }

    it('must attach static helpers for each error code', function () {
      expect(MyError).to.have.property('ERRORS')
      expect(MyError.ERRORS).to.deep.equal(ERRORS)

      for (const code in ERRORS) {
        expect(MyError[code]).to.be.a('function')
      }
    })

    context('when instantiated without underlying cause', function () {
      it('must have the expected properties on each MyError instance', function () {
        const err = MyError.Unexpected('foo')
        const errJson = err.toJSON()
        const errString = err.toString()

        validateInstance(err, errJson, errString)

        expect(err).to.have.property('cause')
        expect(err.cause).to.be.undefined // eslint-disable-line no-unused-expressions
        expect(errJson).to.not.have.property('cause')
      })
    })

    context('when instantiated with underlying cause', function () {
      context('SmartError', function () {
        it('must have the expected properties on each MyError instance', function () {
          const err = MyError.Unexpected('foo', MyError.TimedOut('bar'))
          const errJson = err.toJSON()
          const errString = err.toString()

          validateInstance(err, errJson, errString)

          expect(err).to.have.property('cause')
          expect(err.cause).to.be.an.instanceof(SmartError)
          expect(err.cause).to.have.property('code')
          expect(err.cause.code).to.equal('TimedOut')
          expect(err.cause).to.have.property('message')
          expect(err.cause.message).to.equal(ERRORS.TimedOut)
          expect(err.cause).to.have.property('stack')
          expect(err.cause.stack).to.be.a('string')

          expect(errJson).to.have.property('cause')
          expect(errJson.cause).to.be.an('object')
          expect(errJson.cause.code).to.equal('TimedOut')
          expect(errJson.cause.message).to.equal(ERRORS.TimedOut)
          expect(errJson.cause.stack).to.be.a('string')
        })
      })

      context('Error', function () {
        it('must have the expected properties on each MyError instance', function () {
          const err = MyError.Unexpected('foo', new Error('underlying cause'))
          const errJson = err.toJSON()
          const errString = err.toString()

          validateInstance(err, errJson, errString)

          expect(err).to.have.property('cause')
          expect(err.cause).to.be.an.instanceof(Error)
          expect(err.cause.message).to.equal('underlying cause')

          expect(errJson).to.have.property('cause')
          expect(errJson.cause).to.be.an('object')
          expect(errJson.cause.code).to.be.undefined // eslint-disable-line no-unused-expressions
          expect(errJson.cause.message).to.equal('underlying cause')
          expect(errJson.cause.stack).to.be.a('string')
        })
      })

      context('unknown/other', function () {
        it('must throw an error when the underlying cause is neither a SmartError nor an Error', function () {
          expect(() => MyError.Unexpected('foo', 'bar')).to.throw('`cause` must be a SmartError or Error instance!')
          expect(() => MyError.Unexpected('foo', 42)).to.throw('`cause` must be a SmartError or Error instance!')
          expect(() => MyError.Unexpected('foo', {})).to.throw('`cause` must be a SmartError or Error instance!')
          expect(() => MyError.Unexpected('foo', [])).to.throw('`cause` must be a SmartError or Error instance!')
        })
      })
    })
  })
})
