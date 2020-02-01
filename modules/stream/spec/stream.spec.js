/**
 * @file Behavioral specification for the `SmartStream` class
 */
'use strict'

const { expect } = require('chai')
const { join } = require('path')
const { createReadStream, readFileSync } = require('fs')
const SmartStream = require('../lib/stream')

describe('SmartStream', function () {
  let stream = null
  const create = props => () => { stream = new SmartStream(props) }
  const props = {
    contentType: 'application/json',
    contentEncoding: 'identity'
  }

  describe('api', function () {
    describe('.create()', function () {
      it('creates a new instance with reasonable defaults', function () {
        /* eslint-disable no-unused-expressions */
        expect(create(props)).to.not.throw()
        expect(stream.contentType).to.equal(props.contentType)
        expect(stream.contentEncoding).to.equal(props.contentEncoding)
        expect(stream.contentLength).to.be.undefined
        expect(stream.size).to.equal(0)
        expect(stream.limit).to.equal(65536)
        expect(stream.timeout).to.equal(30000)
        expect(stream.interval).to.equal(1000)
        expect(stream.isCompressed).to.be.false
        expect(stream.isDeserializable).to.be.true
        expect(stream.isObjectStream).to.be.false
        expect(stream.isAppSpecific).to.be.true
        expect(stream.isAudio).to.be.false
        expect(stream.isImage).to.be.false
        expect(stream.isMultipart).to.be.false
        expect(stream.isText).to.be.false
        expect(stream.isVideo).to.be.false
        /* eslint-enable no-unused-expressions */

        stream.destroy() // cleanup
      })

      it('emits an error when instantiated incorrectly', function () {
        const contentType = 'application/json'
        const contentEncoding = 'identity'
        const props = { contentType, contentEncoding }
        const contentLength = -1
        const limit = 'foo'
        const timeout = 1000
        const interval = 1001

        expect(create(undefined)).to.throw()
        expect(create(null)).to.throw()
        expect(create({})).to.throw()
        expect(create({ contentType })).to.throw()
        expect(create({ contentEncoding })).to.throw()
        expect(create({ ...props, contentLength })).to.throw()
        expect(create({ ...props, limit })).to.throw()
        expect(create({ ...props, timeout, interval })).to.throw()
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
          const instance = sourceEncoding === targetEncoding
            ? 'the same instance'
            : 'a new instance'
          const fromTo = `from ${sourceEncoding} to ${targetEncoding}`

          it(`returns ${instance} transcoding ${fromTo}`, async function () {
            const source = SmartStream.fromFile(ENCODINGS[sourceEncoding])
            expect(source.contentType).to.equal('image/jpeg')
            expect(source.contentEncoding).to.equal(sourceEncoding)

            const target = source.toContentEncoding(targetEncoding)
            expect(target.contentType).to.equal('image/jpeg')
            expect(target.contentEncoding).to.equal(targetEncoding)

            sourceEncoding === targetEncoding
              ? expect(target).to.equal(source)
              : expect(target).to.not.equal(source)

            source.destroy() // cleanup
          })
        }
      }
    })

    describe('.fromBuffer(), #toBuffer()', function () {
      context('without auto-decompression', function () {
        it('creates a stream/buffer from/to a buffer/stream', function (done) {
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
        it('decompresses a compressed stream to a buffer', function (done) {
          const filePath = join(__dirname, 'fixtures', 'image.jpg.gz')
          const fileContents = readFileSync(filePath)
          const props = { contentType: 'image/jpeg', contentEncoding: 'gzip' }

          SmartStream
            .fromBuffer(fileContents, props)
            .toBuffer(true)
            .then(buf => expect(buf.length).to.be.at.least(fileContents.length))
            .then(() => done())
            .catch(done)
        })
      })
    })

    describe('.fromObject(), #toObject()', function () {
      const SUPPORTED_TYPES = [
        'application/json',
        'application/msgpack',
        'application/x-www-form-urlencoded'
      ]
      const UNSUPPORTED_TYPES = [
        'application/octet-stream',
        'text/plain'
      ]
      const obj = { foo: 'bar', bar: 'baz' }

      SUPPORTED_TYPES.forEach(contentType => {
        it(`(de)serializes an object using ${contentType}`, function (done) {
          SmartStream
            .fromObject(obj, { contentType })
            .toObject()
            .then(parsedObj => expect(parsedObj).to.deep.equal(obj))
            .then(() => done())
            .catch(err => done(err))
        })
      })

      it('throws an error for unsupported MIME-types', function () {
        UNSUPPORTED_TYPES.forEach(contentType => {
          const testFn = () => SmartStream.fromObject(obj, { contentType })
          expect(testFn).to.throw(`unknown MIME-type "${contentType}"!`)
        })
      })
    })

    describe('.fromFile()', function () {
      it('creates a stream a file', function (done) {
        const filePath = join(__dirname, 'fixtures', 'image.jpg')
        const fileContents = readFileSync(filePath)
        const stream = SmartStream.fromFile(filePath)

        expect(stream.contentType).to.equal('image/jpeg')
        expect(stream.contentEncoding).to.equal('identity')

        stream
          .toBuffer(true)
          .then(buf => expect(buf).to.deep.equal(fileContents))
          .then(() => done())
          .catch(err => done(err))
      })
    })

    describe('.fromFileWithLength()', function () {
      it('creates a stream from a file, including its length', function (done) {
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
              .catch(err => done(err))
          })
          .catch(done)
      })
    })

    describe('.fromStream()', function () {
      it('creates a stream from another stream', function () {
        const source = createReadStream(__filename, {
          contentType: 'application/javascript',
          contentEncoding: 'identity'
        })
        const target = SmartStream.fromStream(source)

        expect(target.limit).to.be.a('number').to.equal(10485760)
        expect(target.timeout).to.be.a('number').to.equal(30000)
        expect(target.interval).to.be.a('number').to.equal(1000)

        target.destroy() // cleanup
      })

      it('disables `limit/timeout` when created from another SmartStream', function () {
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
    })
  })

  describe('behavior', function () {
    it('emits an error when the content-length > limit', function (done) {
      // Default size is 10mB
      SmartStream.fromFile(__filename, {
        contentLength: 1024 * 1024 * 10 + 1 // set to trigger error
      })
        .once('data', () => done(new Error('did not error as expected!')))
        .once('end', () => done(new Error('did not error as expected!')))
        .once('error', err => {
          /* eslint-disable no-unused-expressions */
          expect(err).to.be.an.instanceof(Error)
          expect(err.isSmartError).to.be.true
          expect(err.isSmartStreamError).to.be.true
          expect(err.isTooLarge).to.be.true
          expect(err.code).to.equal('TooLarge')
          expect(err.metadata).to.deep.equal({
            contentType: 'application/javascript',
            contentEncoding: 'identity',
            contentLength: 10485761
          })
          expect(err.cause).to.be.undefined
          /* eslint-enable no-unused-expressions */
          done()
        })
    })

    it('emits an error after receiving `limit` bytes of data', function (done) {
      SmartStream.fromFile(__filename, { limit: 10 })
        .once('error', err => {
          /* eslint-disable no-unused-expressions */
          expect(err).to.be.an.instanceof(Error)
          expect(err.isSmartError).to.be.true
          expect(err.isTooLarge).to.be.true
          expect(err.code).to.equal('TooLarge')
          expect(err.cause).to.be.undefined
          /* eslint-enable no-unused-expressions */
          done()
        })
        .once('end', () => done(new Error('did not error as expected!')))
        .resume()
    })

    it('emits an error after `timeout` ms of no data', function (done) {
      SmartStream.create({ ...props, timeout: 500, interval: 100 })
        .once('error', err => {
          /* eslint-disable no-unused-expressions */
          expect(err).to.be.an.instanceof(Error)
          expect(err.isSmartError).to.be.true
          expect(err.isTimedOut).to.be.true
          expect(err.code).to.equal('TimedOut')
          expect(err.metadata).to.be.an('object')
          expect(err.metadata.duration).to.be.a('number').at.least(500)
          /* eslint-enable no-unused-expressions */

          done()
        })
        .once('data', () => done(new Error('did not error as expected!')))
        .once('end', () => done(new Error('did not error as expected!')))
    })
  })
})
