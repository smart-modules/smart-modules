/**
 * @file Unit tests for `SmartStream`
 */
'use strict'

const { expect } = require('chai')
const { join } = require('path')
const { readFileSync } = require('fs')
const SmartStream = require('../lib/stream')

describe('SmartStream', function () {
  const props = {
    contentType: 'application/json',
    contentEncoding: 'identity'
  }

  describe('api', function () {
    describe('.create()', function () {
      it('creates a new instance with reasonable defaults', function () {
        let stream = null

        expect(function () { stream = SmartStream.create(props) }).to.not.throw()
        expect(stream.contentType).to.equal(props.contentType)
        expect(stream.contentEncoding).to.equal(props.contentEncoding)
        expect(stream.contentLength).to.be.undefined // eslint-disable-line no-unused-expressions
        expect(stream.size).to.equal(0)
        expect(stream.limit).to.equal(65536)
        expect(stream.timeout).to.equal(30000)
        expect(stream.interval).to.equal(1000)
        expect(stream.isCompressed).to.be.false // eslint-disable-line no-unused-expressions
        expect(stream.isDeserializable).to.be.true // eslint-disable-line no-unused-expressions
        expect(stream.isObjectStream).to.be.false // eslint-disable-line no-unused-expressions
        expect(stream.isAppSpecific).to.be.true // eslint-disable-line no-unused-expressions
        expect(stream.isAudio).to.be.false // eslint-disable-line no-unused-expressions
        expect(stream.isImage).to.be.false // eslint-disable-line no-unused-expressions
        expect(stream.isMultipart).to.be.false // eslint-disable-line no-unused-expressions
        expect(stream.isText).to.be.false // eslint-disable-line no-unused-expressions
        expect(stream.isVideo).to.be.false // eslint-disable-line no-unused-expressions
        stream.destroy() // cleanup
      })

      it('emits an error when instantiated incorrectly', function () {
        const create = props => () => new SmartStream(props)
        const contentType = 'application/json'
        const contentEncoding = 'identity'
        const contentLength = -1
        const limit = 'foo'
        const timeout = 1000
        const interval = 1001

        expect(create(undefined)).to.throw()
        expect(create(null)).to.throw()
        expect(create({})).to.throw()
        expect(create({ contentType })).to.throw()
        expect(create({ contentEncoding })).to.throw()
        expect(create({ contentType, contentEncoding, contentLength })).to.throw()
        expect(create({ contentType, contentEncoding, limit })).to.throw()
        expect(create({ contentType, contentEncoding, timeout, interval })).to.throw()
      })
    })

    describe('#toJSON()', function () {
      it('returns the JSON representation of the stream', function () {
        const stream = SmartStream.create(props)
        expect(stream.toJSON()).to.deep.equal(props)
        stream.destroy() // cleanup
      })
    })

    describe('#toContentEncoding()', function () {
      const ENCODINGS = {
        deflate: join(__dirname, 'fixtures', 'image.jpg.deflate'),
        gzip: join(__dirname, 'fixtures', 'image.jpg.gz'),
        identity: join(__dirname, 'fixtures', 'image.jpg')
      }

      for (const sourceEncoding of Object.keys(ENCODINGS)) {
        for (const targetEncoding of Object.keys(ENCODINGS)) {
          const testCase = sourceEncoding === targetEncoding
            ? `returns the same instance transcoding from ${sourceEncoding} to ${targetEncoding}`
            : `returns a new instance transcoding from ${sourceEncoding} to ${targetEncoding}`

          it(testCase, async function () {
            const source = SmartStream.fromFile(ENCODINGS[sourceEncoding])
            expect(source.contentType).to.equal('image/jpeg')
            expect(source.contentEncoding).to.equal(sourceEncoding)

            const target = source.toContentEncoding(targetEncoding)
            expect(target.contentType).to.equal('image/jpeg')
            expect(target.contentEncoding).to.equal(targetEncoding)

            sourceEncoding === targetEncoding
              ? expect(target).to.equal(source)
              : expect(target).to.not.equal(source)

            const actual = await target.toBuffer()
            expect(actual).to.deep.equal(readFileSync(ENCODINGS[targetEncoding]))
          })
        }
      }
    })

    describe('.fromBuffer(), #toBuffer()', function () {
      context('without auto-decompression', function () {
        it('serializes/deserializes a stream from/to a buffer', function (done) {
          const filePath = join(__dirname, 'fixtures', 'image.jpg.gz')
          const fileContents = readFileSync(filePath)
          const props = { contentType: 'image/jpeg', contentEncoding: 'gzip' }

          SmartStream
            .fromBuffer(fileContents, props)
            .toBuffer()
            .then(buf => expect(buf).to.deep.equal(fileContents))
            .then(() => done())
            .catch(done)
        })
      })

      context('with auto-decompression', function () {
        it('must automatically decompress a compressed stream', function (done) {
          const filePath = join(__dirname, 'fixtures', 'image.jpg.gz')
          const fileContents = readFileSync(filePath)
          const props = { contentType: 'image/jpeg', contentEncoding: 'gzip' }

          SmartStream
            .fromBuffer(fileContents, props)
            .toBuffer()
            .then(buf => expect(buf).to.deep.equal(fileContents))
            .then(() => done())
            .catch(done)
        })
      })
    })

    describe('.fromObject(), #toObject()', function () {
      const SUPPORTED_MIME_TYPES = [
        'application/json',
        'application/msgpack',
        'application/x-www-form-urlencoded'
      ]
      const UNSUPPORTED_MIME_TYPES = [
        'application/octet-stream',
        'text/plain'
      ]
      const obj = { foo: 'bar', bar: 'baz' }

      SUPPORTED_MIME_TYPES.forEach(contentType => {
        it(`serializes/deserializes an object using ${contentType}`, function (done) {
          SmartStream
            .fromObject(obj, { contentType })
            .toObject()
            .then(streamObj => expect(streamObj).to.deep.equal(obj))
            .then(() => done())
            .catch(done)
        })
      })

      it('throws an error for unsupported MIME-types', function () {
        UNSUPPORTED_MIME_TYPES.forEach(contentType => {
          const testFn = () => SmartStream.fromObject(obj, { contentType })
          expect(testFn).to.throw(`unknown MIME-type "${contentType}"!`)
        })
      })
    })

    describe('.fromFile()', function () {
      it('creates a stream from the specified file', function (done) {
        const filePath = join(__dirname, 'fixtures', 'image.jpg')
        const fileContents = readFileSync(filePath)
        const stream = SmartStream.fromFile(filePath)

        expect(stream.contentType).to.equal('image/jpeg')
        expect(stream.contentEncoding).to.equal('identity')

        stream
          .toBuffer(true)
          .then(buf => expect(buf).to.deep.equal(fileContents))
          .then(() => done())
          .catch(done)
      })
    })

    describe('.fromFileWithLength()', function () {
      it('creates a stream from the specified file, including its length', function (done) {
        const filePath = join(__dirname, 'fixtures', 'image.jpg')
        const fileContents = readFileSync(filePath)

        SmartStream.fromFileWithLength(filePath)
          .then(stream => {
            expect(stream.contentType).to.equal('image/jpeg')
            expect(stream.contentEncoding).to.equal('identity')
            expect(stream.contentLength).to.equal(1723373)

            stream
              .toBuffer(true)
              .then(buf => expect(buf).to.deep.equal(fileContents))
              .then(() => done())
              .catch(done)
          })
          .catch(done)
      })
    })
  })

  describe('behavior', function () {
    it('disables the limit/timeout when created from another SmartStream instance', function () {
      const source = SmartStream.fromFile(__filename)
      expect(source.limit).to.be.a('number').to.equal(10485760)
      expect(source.timeout).to.be.a('number').to.equal(30000)
      expect(source.interval).to.be.a('number').to.equal(1000)

      const target = SmartStream.fromStream(source)
      expect(target.limit).to.be.a('number').to.equal(Infinity)
      expect(target.timeout).to.be.a('number').to.equal(0)
      expect(target.interval).to.be.a('number').to.equal(0)

      target.destroy() // cleanup
    })

    it('emits an error immediately if the content-length is greater than the predefined limit', function (done) {
      // Default size is 10mB
      SmartStream.fromFile(__filename, {
        contentLength: 1024 * 1024 * 10 + 1 // set to trigger error
      })
        .once('data', () => done(new Error('stream did not error as expected!')))
        .once('end', () => done(new Error('stream did not error as expected!')))
        .once('error', err => {
          expect(err).to.be.an.instanceof(Error)
          expect(err.isSmartError).to.be.true // eslint-disable-line no-unused-expressions
          expect(err.isSmartStreamError).to.be.true // eslint-disable-line no-unused-expressions
          expect(err.isTooLarge).to.be.true // eslint-disable-line no-unused-expressions
          expect(err.code).to.equal('TooLarge')
          expect(err.metadata).to.deep.equal({
            contentType: 'application/javascript',
            contentEncoding: 'identity',
            contentLength: 10485761
          })
          expect(err.cause).to.be.undefined // eslint-disable-line no-unused-expressions
          done()
        })
    })

    it('emits an error after receiving the predefined limit of data', function (done) {
      SmartStream.fromFile(__filename, { limit: 10 })
        .once('error', err => {
          expect(err).to.be.an.instanceof(Error)
          expect(err.isSmartError).to.be.true // eslint-disable-line no-unused-expressions
          expect(err.isTooLarge).to.be.true // eslint-disable-line no-unused-expressions
          expect(err.code).to.equal('TooLarge')
          expect(err.cause).to.be.undefined // eslint-disable-line no-unused-expressions
          done()
        })
        .once('end', () => done(new Error('stream did not error as expected!')))
        .resume()
    })

    it('emits an error if no data is received within the timeout period', function (done) {
      SmartStream.create({ ...props, timeout: 500, interval: 100 })
        .once('error', err => {
          expect(err).to.be.an.instanceof(Error)
          expect(err.isSmartError).to.be.true // eslint-disable-line no-unused-expressions
          expect(err.isTimedOut).to.be.true // eslint-disable-line no-unused-expressions
          expect(err.code).to.equal('TimedOut')
          expect(err.metadata).to.be.an('object')
          expect(err.metadata.duration).to.be.a('number').at.least(500)
          done()
        })
        .once('data', () => done(new Error('stream did not error as expected!')))
        .once('end', () => done(new Error('stream did not error as expected!')))
    })
  })
})
