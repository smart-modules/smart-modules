/**
 * @file Implements a base class for errors, allowing for wrapping underlying
 * causes with state to aid subsequent debugging.
 */
'use strict'

/**
 * This wrapper around the JavaScript `Error` class provides the means to
 * capture stack traces with additional metadata that would be useful for
 * subsequent debugging of the error.
 * @extends Error
 */
class SmartError extends Error {
  /**
   * Constructs an instance of `SmartError`
   *
   * NOTE: Not intended for direct use through `new`. Use the
   * {@link SmartError.create} instead.
   *
   * @param {String} message Human-readable description of the error
   * @param {Object} props Properties of the error
   * @param {String} [props.code] A unique error code
   * @param {*} [props.metadata] Optional metadata for the error
   * @param {Error} [props.cause] Optional error that was originally thrown
   * @param {String} [props.stack] Optional override stack trace for the error;
   * Useful for reconstructing error objects from logs
   */
  constructor (message, props) {
    /* istanbul ignore if */
    if (message == null || typeof message !== 'string') {
      throw new TypeError('`message` must be a valid human-readable string!')
    }

    /* istanbul ignore if */
    if (props.code != null &&
       (typeof props.code !== 'string' || props.code.length > 16)) {
      throw new TypeError('`code` must be a string of 16 characters or less!')
    }

    /* istanbul ignore if */
    if (props.cause != null && !(props.cause instanceof Error)) {
      throw new TypeError('`cause` must be a SmartError or Error instance!')
    }

    /* istanbul ignore if */
    if (props.metadata instanceof Error) {
      props.stack = props.cause
      props.cause = props.metadata
      props.metadata = undefined
    }

    /* istanbul ignore if */
    if (typeof props.cause === 'string') {
      props.stack = props.cause
      props.cause = undefined
    }

    super(message)

    /**
     * A human-readable description of the error
     * @type {String}
     */
    this.code = props.code

    /**
     * Optional metadata describing the error.
     * @type {*}
     */
    this.metadata = props.metadata

    /**
     * Optional error that was originally thrown
     * @type {Error}
     */
    this.cause = props.cause

    /* istanbul ignore if */
    if (typeof props.stack === 'string') {
      this.stack = props.stack
    } else {
      Error.captureStackTrace(this, this.constructor)
    }

    Object.freeze(this)
  }

  /**
   * Returns whether or not the instance is a SmartError
   * @returns {Boolean}
   */
  get isSmartError () {
    return this instanceof SmartError
  }

  /**
   * Returns the object representation of the error
   * @returns {Object}
   */
  toJSON () {
    const { name, message, code, metadata, cause, stack } = this
    const result = { name, message, code, stack }

    /* istanbul ignore else */
    if (metadata != null) {
      result.metadata = metadata
    }

    if (cause != null) {
      result.cause = (cause instanceof SmartError)
        ? cause.toJSON()
        : {
          code: cause.code,
          message: cause.message,
          stack: cause.stack
        }
    }

    return result
  }

  /**
   * Returns the string representation of the error
   * @returns {String}
   */
  toString () {
    const { name, code, message } = this
    return `${name}[${code}]: ${message}`
  }

  /**
   * Functional form of sub-classing a SmartError
   * @param {String} name The name of the new Error sub-class
   * @param {Object<String>} errors A list of error codes and messages
   * @returns {Function}
   */
  static create (name, errors) {
    if (typeof name !== 'string') {
      throw new TypeError('SmartError must have a valid name!')
    }

    if (typeof errors !== 'object' || Object.keys(errors).length === 0) {
      throw new TypeError(`${name} must have a valid list of errors!`)
    }

    for (const code in errors) {
      /* istanbul ignore if */
      if (typeof code !== 'string') {
        throw new TypeError(`Invalid code "${code}" for ${name}!`)
      } else if (typeof errors[code] !== 'string') {
        throw new TypeError(`Invalid message "${errors[code]}" for ${name}!`)
      }
    }

    class SmarterError extends SmartError {
      get name () {
        return name
      }

      static get ERRORS () {
        return errors
      }
    }

    Object.defineProperty(SmarterError.prototype, `is${name}`, {
      configurable: false,
      enumerable: true,
      writable: false,
      value: true
    })

    for (const code in errors) {
      // attach static helper method
      SmarterError[code] = (metadata, cause) => new SmarterError(errors[code], {
        code,
        metadata,
        cause
      })

      // attach instance helper property
      Object.defineProperty(SmarterError.prototype, `is${code}`, {
        configurable: false,
        enumerable: true,
        get: function () { return (this.code === code) }
      })
    }

    return SmarterError
  }
}

/**
 * Export the interface
 * @type {SmartError}
 */
module.exports = SmartError
