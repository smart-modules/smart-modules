/**
 * @file Utility functions
 */
'use strict'

const { PassThrough } = require('readable-stream')
const { extname } = require('path')
const qs = require('querystring')
const zlib = require('zlib')
const mime = require('mime')
const msgpack = require('msgpack5')()
const SmartStreamError = require('./error')

/**
 * Serializes an object into a buffer
 *
 * @param {String} type The MIME type of the serialization algorithm
 * @param {Object} data The object to be serialized
 * @returns {Buffer} The serialized representation of the object
 * @private
 */
function serialize (type, data) {
  switch (type) {
    case 'application/json':
      return Buffer.from(JSON.stringify(data))

    case 'application/msgpack':
      return msgpack.encode(data)

    case 'application/x-www-form-urlencoded':
      return Buffer.from(qs.stringify(data))
  }

  // istanbul ignore next
  throw SmartStreamError.Unexpected(`unknown MIME-type "${type}"!`)
}

/**
 * Deserializes a buffer into an object
 *
 * @param {String} type The MIME type of the serialization algorithm
 * @param {Buffer} data The serialized representation of the object
 * @returns {Object} The POJO representation of the serialized data
 * @private
 */
function deserialize (type, data) {
  switch (type) {
    case 'application/json': {
      const val = JSON.parse(data.toString('utf8'))
      return (val === 'null') ? null : val
    }

    case 'application/msgpack':
      return msgpack.decode(data)

    case 'application/x-www-form-urlencoded':
      return qs.parse(data.toString('utf8'))
  }

  // istanbul ignore next
  throw SmartStreamError.Unexpected(`unknown MIME-type "${type}"!`)
}

/**
 * Compresses a stream/buffer
 *
 * @param {String} type The type of compression
 * @param {Buffer|Readable} data The data to be compressed
 * @returns {Readable}
 * @private
 */
function compress (type, data) {
  let stream

  if (type === 'deflate') {
    stream = zlib.createDeflate()
  } else if (type === 'gzip') {
    stream = zlib.createGzip()
  } else if (type === 'identity') {
    stream = Buffer.isBuffer(data) ? new PassThrough() : data
  } else {
    // istanbul ignore next
    throw SmartStreamError.Unexpected(`unknown compression "${type}"!`)
  }

  // istanbul ignore if
  if (Buffer.isBuffer(data)) {
    stream.end(data)
  } else if (data !== stream) {
    data.pipe(stream)
  }

  return stream
}

/**
 * Decompresses a stream/buffer
 *
 * @param {String} type The type of compression
 * @param {Buffer|Readable} data The data to be decompressed
 * @returns {Readable}
 * @private
 */
function decompress (type, data) {
  let stream

  if (type === 'deflate') {
    stream = zlib.createInflate()
  } else if (type === 'gzip') {
    stream = zlib.createGunzip()
  } else if (type === 'identity') {
    stream = Buffer.isBuffer(data) ? new PassThrough() : data
  } else {
    // istanbul ignore next
    throw SmartStreamError.Unexpected(`unknown compression "${type}"!`)
  }

  // istanbul ignore if
  if (Buffer.isBuffer(data)) {
    stream.end(data)
  } else if (data !== stream) {
    data.pipe(stream)
  }

  return stream
}

/**
 * Collects a stream into a buffer
 *
 * @param {Readable} stream The stream to collect
 * @returns {Promise<Buffer>}
 * @private
 */
function streamToBuffer (stream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    stream
      .on('data', c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
      .once('end', () => resolve(Buffer.concat(chunks)))
      .once('error', err => err.isSmartStreamError
        ? reject(err)
        : reject(SmartStreamError.Unexpected({ stream }, err)))
  })
}

/**
 * Returns the MIME-type of the specified file
 * @param {String} path Path to the file whose MIME-type is to be retrived
 * @returns {String}
 */
function getContentType (path) {
  const extension = extname(path)
  switch (extension) {
    case '.gz':
    case '.deflate':
      return mime.getType(path.slice(0, -extension.length))

    default:
      return mime.getType(path)
  }
}

/**
 * Returns the encoding of the specified file
 * @param {String} path Path to the file whose encoding is to be retrived
 * @returns {String}
 */
function getContentEncoding (path) {
  switch (extname(path)) {
    case '.gz': return 'gzip'
    case '.deflate': return 'deflate'
    default: return 'identity'
  }
}

/**
 * Export all utlity functions
 * @type {Object}
 */
module.exports = {
  serialize,
  deserialize,
  compress,
  decompress,
  streamToBuffer,
  getContentType,
  getContentEncoding
}
