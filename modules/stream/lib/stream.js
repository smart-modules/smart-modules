/**
 * @file Implements a byte-stream that is bound by size and time
 */
'use strict'

const SmartStreamError = require('./error')
const Util = require('./util')
const SmartTimer = require('@smart-modules/timer')
const { createReadStream, stat } = require('fs')
const { Transform } = require('stream')

/**
 * A regular expression for valid content types
 * @type {RegExp}
 * @private
 */
const CONTENT_TYPES = /^((application|audio|image|multipart|text|video)\/([\w-]+));?.*$/

/**
 * A regular expression for valid content encodings
 * @type {RegExp}
 * @private
 */
const CONTENT_ENCODINGS = /^(identity|gzip|deflate)$/

/**
 * A list of MIME types that can be deserialized into an object
 * @type {RegExp}
 * @private
 */
const DESERIALIZABLE_TYPES = /^application\/(json|msgpack|x-www-form-urlencoded)$/

/**
 * A list of MIME types that can be (de)serialized to/from an object stream
 * @type {Array}
 * @private
 */
const OBJECT_STREAM_TYPES = ['application/ndjson', 'text/event-stream']

/**
 * A list of compressed encodings
 * @type {RegExp}
 * @private
 */
const COMPRESSED_ENCODINGS = /^(gzip|deflate)$/

/**
 * A no-op function
 * @type {Function}
 * @private
 */
const NOOP = () => {}

/**
 * A `SmartStream` is a stream that is bounded by size and time by default and
 * exposes 3 primary properties
 *
 * - `contentType`: specifies the MIME type of the stream
 * - `contentEncoding`: specifies the encoding of the stream
 * - `contentLength`: specifies the size of the stream in bytes (optional)
 *
 * Every `SmartStream` instance accepts a pre-defined number of bytes that MUST
 * be received within the specified timeout duration. The timeout resets
 * whenever new data is received by the stream.
 */
class SmartStream extends Transform {
  /**
   * Constructs an instance of a `SmartStream`
   *
   * @param {Object} props Properties of the instance
   * @param {String} props.contentType The MIME type of the stream
   * @param {String} props.contentEncoding The encoding of the stream
   * @param {Number} [props.contentLength] The length (in bytes) of the stream
   * @param {Number} [props.limit] The maximum number of bytes accepted before terminating the input
   * @param {Number} [props.timeout] The timeout (ms) for receiving the incoming data; 0 to disable
   * @param {Number} [props.interval] The interval (ms) to check for timeouts
   * @returns {SmartStream}
   */
  constructor (props) {
    if (props == null) {
      throw new TypeError('props is a required argument!')
    } else if (!CONTENT_TYPES.test(props.contentType)) {
      throw new TypeError(`"${props.contentType}" is not a valid MIME type!`)
    } else if (!CONTENT_ENCODINGS.test(props.contentEncoding)) {
      throw new TypeError(`"${props.contentEncoding}" is not a valid encoding!`)
    } else if (+props.contentLength <= 0) {
      throw new TypeError(`${props.contentLength} is an invalid content-length!`)
    } else if (props.limit != null && (isNaN(+props.limit) || +props.limit <= 0)) {
      throw new TypeError(`${props.limit} is an invalid limit!`)
    } else if (+props.timeout < +props.interval) {
      throw new TypeError(`"timeout (${props.timeout}ms) must be higher than the interval (${props.interval}ms)`)
    }

    super({
      transform: (chunk, encoding, cb) => {
        this._size += Buffer.byteLength(chunk)

        if (this._size > this._limit) {
          return cb(SmartStreamError.TooLarge(this.toJSON()))
        }

        this._timer.touch()
        cb(null, chunk)
      },
      flush: (cb) => {
        this._timer == null || this._timer.destroy()

        // If no content-length was provided, populate the value
        if (this._contentLength == null) {
          this._contentLength = this._size
        }

        cb()
      },
      destroy: (err, cb) => {
        this._timer == null || this._timer.destroy(err)

        // If no content-length was provided, populate the value
        if (this._contentLength == null) {
          this._contentLength = this._size
        }

        cb(err == null
          ? null
          : err.isSmartStreamError
            ? err
            // istanbul ignore next
            : SmartStreamError.Unexpected(err))
      }
    })

    // This is NOT a mistake! `contentTypeRaw` is expected to hold the raw
    // content-type as it was received. `contentType` is simply the MIME-type,
    // but `contentTypeRaw` may include other parameters (from the HTTP Content-
    // Type header)
    this._contentTypeRaw = props.contentType
    this._contentType = CONTENT_TYPES.exec(props.contentType)[1]
    this._contentEncoding = props.contentEncoding
    this._contentLength = +props.contentLength || undefined
    this._size = 0
    this._limit = +props.limit || (this.isDeserializable
      ? 1024 * 64
      : 1024 * 1024 * 10)
    this._timeout = +props.timeout >= 0 ? +props.timeout : 30000
    this._interval = +props.interval >= 0 ? +props.interval : 1000

    if (+this._contentLength > this._limit) {
      setImmediate(() => this.destroy(SmartStreamError.TooLarge(this.toJSON())))
    } else {
      this._timer = this._timeout === 0
        ? { touch: NOOP, destroy: NOOP }
        : new SmartTimer({
          timeout: this._timeout,
          interval: this._interval
        }, duration => this.destroy(SmartStreamError.TimedOut({ duration })))
    }
  }

  /**
   * Returns the MIME type of the stream
   * @returns {String}
   */
  get contentType () {
    return this._contentType
  }

  /**
   * Returns the encoding of the stream
   * @returns {String}
   */
  get contentEncoding () {
    return this._contentEncoding
  }

  /**
   * Returns the length (in bytes) of the stream
   * @returns {Number}
   */
  get contentLength () {
    return this._contentLength
  }

  /**
   * Returns the number of bytes received/processed by the stream
   * @returns {Number}
   */
  get size () {
    return this._size
  }

  /**
   * Returns the number of bytes the stream will receive/process before
   * terminating
   * @returns {Number}
   */
  get limit () {
    return this._limit
  }

  /**
   * Returns the timeout (in ms) for receiving the incoming data
   * @returns {Number}
   */
  get timeout () {
    return this._timeout
  }

  /**
   * Returns the interval (in ms) to check for timeouts
   * @returns {Number}
   */
  get interval () {
    return this._interval
  }

  /**
   * Returns whether or not the stream is compressed
   * @name {SmartStream#isCompressed}
   * @type {Boolean}
   */
  get isCompressed () {
    return COMPRESSED_ENCODINGS.test(this._contentEncoding)
  }

  /**
   * Returns whether or not the stream is deserializable
   * @name {SmartStream#isDeserializable}
   * @type {Boolean}
   */
  get isDeserializable () {
    return DESERIALIZABLE_TYPES.test(this._contentType)
  }

  /**
   * Returns whether or not the stream of serialized objects
   * @returns {Boolean}
   */
  get isObjectStream () {
    return OBJECT_STREAM_TYPES.includes(this._contentType)
  }

  /**
   * Returns whether or not the stream is an application-specific stream
   * @returns {Boolean}
   */
  get isAppSpecific () {
    return this._contentType.startsWith('application/')
  }

  /**
   * Returns whether or not the stream is an audio stream
   * @returns {Boolean}
   */
  get isAudio () {
    return this._contentType.startsWith('audio/')
  }

  /**
   * Returns whether or not the stream is an image stream
   * @returns {Boolean}
   */
  get isImage () {
    return this._contentType.startsWith('image/')
  }

  /**
   * Returns whether or not the stream is a multi-part stream
   * @returns {Boolean}
   */
  get isMultipart () {
    return this._contentType.startsWith('multipart/')
  }

  /**
   * Returns whether or not the stream is a text stream
   * @returns {Boolean}
   */
  get isText () {
    return this._contentType.startsWith('text/')
  }

  /**
   * Returns whether or not the stream is a video stream
   * @returns {Boolean}
   */
  get isVideo () {
    return this._contentType.startsWith('video/')
  }

  /**
   * Returns the message header as an object
   *
   * The value returned by this method **MUST** be acceptable input as `props`
   * to the constructor of this instance. Failing this, any instances returned
   * by the {@link SmartStream#toContentEncoding} method will fail!
   * @returns {Object}
   */
  toJSON () {
    const obj = {
      contentType: this._contentTypeRaw,
      contentEncoding: this._contentEncoding
    }
    if (+this._contentLength > 0) obj.contentLength = this._contentLength
    return obj
  }

  /**
   * Returns `this` stream in a different encoding
   *
   * When the target encoding matches the source, `this` instance is returned.
   * Otherwise, a new SmartStream instance is created from the current instance.
   *
   * @param {String} contentEncoding The encoding of the stream
   * @returns {SmartStream}
   */
  toContentEncoding (contentEncoding) {
    const source = this.contentEncoding
    const target = contentEncoding

    if (source === target) {
      return this
    }

    const stream = (source === 'identity')
      // compress, if the source is identity-encoded
      ? Util.compress(target, this)
      : (target === 'identity')
        // decompress, if the target is identity-encoded
        ? Util.decompress(source, this)
        // otherwise, decompress and re-compress
        : Util.compress(target, Util.decompress(source, this))

    return this.constructor.fromStream(stream, Object.assign(this.toJSON(), {
      contentEncoding,
      limit: Infinity,
      timeout: 0,
      interval: 0
    }), this.constructor)
  }

  /**
   * Collects the incoming stream into a buffer
   * @param {Boolean} autoDecompress Whether or not to decompress the stream
   * @returns {Promise<Buffer>}
   */
  toBuffer (autoDecompress) {
    return (autoDecompress && this.isCompressed)
      ? Util.streamToBuffer(Util.decompress(this.contentEncoding, this))
      : Util.streamToBuffer(this)
  }

  /**
   * Parses a stream into an object
   * @returns {Promise<Object>}
   */
  toObject () {
    return this
      .toBuffer(true)
      .then(buf => Util.deserialize(this._contentType, buf))
  }

  /**
   * Creates a stream
   * @param {Object} props Properties of the stream
   * @returns {SmartStream}
   */
  static create (props, Ctor = SmartStream) {
    return new Ctor(Object.assign({
      contentType: 'application/octet-stream',
      contentEncoding: 'identity'
    }, props))
  }

  /**
   * Creates a SmartStream from another stream
   * @param {SmartStream|Readable} stream The stream to create the new one from
   * @param {Object} props Properties of the stream; overriding values if `stream` is a `SmartStream`
   * @param {String} [props.contentType='application/octet-stream'] The MIME-type of the stream
   * @param {String} [props.contentEncoding='identity'] The encoding of the stream
   * @param {Number} [props.contentLength] The length of the stream (in bytes)
   * @returns {SmartStream}
   */
  static fromStream (stream, props, Ctor = SmartStream) {
    props = Object.assign({
      contentType: 'application/octet-stream',
      contentEncoding: 'identity'
    }, props)

    // If the source stream is also a `SmartStream` instance, then this function
    // disables the size-limit and timeout checks, relying on the parent
    // `SmartStream` instance to handle those.
    if (stream instanceof SmartStream) {
      props.limit = Infinity
      props.timeout = 0
      props.interval = 0
    }

    const smartStream = Ctor.create(props, Ctor)
    return stream
      .once('error', err => smartStream.destroyed || smartStream.destroy(err))
      .pipe(smartStream)
      .once('error', err => stream.destroyed || stream.destroy(err))
  }

  /**
   * Creates a SmartStream from a file
   * @param {String} path Path to the file
   * @param {Object} props Properties of the stream
   * @param {String} props.contentType The MIME-type of the stream
   * @param {String} props.contentEncoding The encoding of the stream
   * @returns {SmartStream}
   */
  static fromFile (path, props, Ctor = SmartStream) {
    return Ctor.fromStream(createReadStream(path), Object.assign({
      contentType: Util.getContentType(path),
      contentEncoding: Util.getContentEncoding(path)
    }, props), Ctor)
  }

  /**
   * Creates a SmartStream from a file, including its file-size
   * @param {String} path Path to the file
   * @param {Object} [props] Properties of the stream
   * @param {String} [props.contentType] The MIME-type of the stream
   * @param {String} [props.contentEncoding] The encoding of the stream
   * @returns {Promise<SmartStream>}
   */
  static fromFileWithLength (path, props, Ctor = SmartStream) {
    return new Promise((resolve, reject) => stat(path, (err, stats) => {
      // istanbul ignore if
      if (err != null) {
        reject(err)
      } else {
        resolve(Ctor.fromFile(path, Object.assign({}, props, {
          contentLength: stats.size,
          limit: stats.size
        }), Ctor))
      }
    }))
  }

  /**
   * Creates a SmartStream from a buffer
   * @param {Buffer} buf The buffer to convert into a stream
   * @param {Object} [props] Properties of the stream
   * @param {String} [props.contentType='application/octet-stream'] The MIME-type of the stream
   * @param {String} [props.contentEncoding='identity'] The encoding of the stream
   * @param {Number} [props.timeout] The timeout (ms) for receiving the incoming data
   * @param {Number} [props.interval] The interval (ms) to check for timeouts
   * @returns {SmartStream}
   */
  static fromBuffer (buf, props, Ctor = SmartStream) {
    const stream = Ctor.create(Object.assign({
      contentType: 'application/octet-stream',
      contentEncoding: 'identity'
    }, props, {
      contentLength: Buffer.byteLength(buf),
      limit: Buffer.byteLength(buf)
    }))
    stream.end(buf)
    return stream
  }

  /**
   * Creates a SmartStream from an object
   * @param {String} obj The object to convert into a stream
   * @param {Object} [props] Properties of the stream
   * @param {String} [props.contentType='application/json'] The MIME-type of the stream
   * @param {String} [props.contentEncoding='identity'] The encoding of the stream
   * @returns {SmartStream}
   */
  static fromObject (obj, props, Ctor = SmartStream) {
    props = Object.assign({
      contentType: 'application/json',
      contentEncoding: 'identity'
    }, props)

    if (!DESERIALIZABLE_TYPES.test(props.contentType)) {
      throw new TypeError(`unknown MIME-type "${props.contentType}"!`)
    }

    return Ctor.fromBuffer(Util.serialize(props.contentType, obj), props)
  }
}

/**
 * Export the class
 * @type {SmartStream}
 */
module.exports = SmartStream
