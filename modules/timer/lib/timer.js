/**
 * @file A timer that avoids frequently polling the clock
 */
'use strict'

const { EventEmitter } = require('events')

/**
 * Default properties for the constructor
 * @type {Object}
 * @private
 */
const DEFAULT_PROPS = {
  timeout: 30000,
  interval: 1000
}

/**
 * Implements a smart-timer that checks for timeout at the specified inverval,
 * calling the optional timeout handler when the timeout occurs.
 * @extends {EventEmitter}
 */
class SmartTimer extends EventEmitter {
  /**
   * Constructs a `SmartTimer` instance and starts it immediately.
   * @param {Object} [props] Properties of the timer
   * @param {Number} [props.timeout=30000] The timeout for the timer (in ms)
   * @param {Number} [props.interval=1000] Interval between checks for timeouts (in ms)
   * @param {Function} [callback] Optional timeout event handler
   * @returns {SmartTimer}
   */
  constructor (props, callback) {
    if (typeof props === 'function') {
      callback = props
      props = DEFAULT_PROPS
    } else if (props != null) {
      if (+props.timeout < 0) {
        throw new TypeError(`"${props.timeout}" is an invalid timeout!`)
      } else if (+props.interval < 0) {
        throw new TypeError(`"${props.interval}" is an invalid interval!`)
      }
    } else {
      props = DEFAULT_PROPS
    }

    const { timeout, interval } = props = Object.assign({}, DEFAULT_PROPS, props)
    if (interval > timeout) {
      throw new Error(`interval (${interval}) exceeds timeout (${timeout})!`)
    }

    super()

    this.timeout = timeout
    this.interval = interval
    this._timeoutTimer = setTimeout(() => this._onTimeout(), timeout)
    this._intervalTimer = setInterval(() => this._onInterval(), interval)
    this._hadActivity = false
    this._lastActivity = Date.now()
    this._destroyed = false

    if (typeof callback === 'function') {
      this.once('timeout', callback)
    }
  }

  /**
   * Handles the interval timer
   * @private
   */
  _onInterval () {
    if (this._hadActivity) {
      this._lastActivity = Date.now()
      this._hadActivity = false
    }
  }

  /**
   * Handles the timeout timer
   * @private
   */
  _onTimeout () {
    // Call this._onInterval() to account for any activity that might have
    // occurred since the last interval check and the timeout.
    this._onInterval()

    const timeSinceLastActivity = Date.now() - this._lastActivity
    if (timeSinceLastActivity < this.timeout) {
      const timeout = this.timeout - timeSinceLastActivity
      /* istanbul ignore next */
      const onTimeout = () => this._onTimeout()
      this._timeoutTimer = setTimeout(onTimeout, timeout)
    } else {
      this.destroy()
      this.emit('timeout', timeSinceLastActivity)
    }
  }

  /**
   * Touches the timer to indicate activity.
   * @throws {Error} The timer has already been destroyed.
   */
  touch () {
    if (!this._destroyed) {
      this._hadActivity = true
    } else {
      throw new Error('timer has already been destroyed!')
    }
  }

  /**
   * Destroys the timer instance.
   */
  destroy () {
    /* istanbul ignore else  */
    if (!this.destroyed) {
      if (this._timeoutTimer !== null) {
        clearTimeout(this._timeoutTimer)
        this._timeoutTimer = null
      }

      if (this._intervalTimer !== null) {
        clearInterval(this._intervalTimer)
        this._intervalTimer = null
      }

      this._destroyed = true
    }
  }

  /**
   * Functional form of instantiating a SmartTimer
   * @param {Object} [props] Properties of the timer
   * @param {Number} [props.timeout=30000] The timeout for the timer (ms)
   * @param {Number} [props.interval=1000] Interval between checks for timeouts (ms)
   * @param {Function} [callback] Timeout event handler
   * @returns {SmartTimer}
   */
  static create (props, callback) {
    return new SmartTimer(props, callback)
  }
}

/**
 * Export the class
 * @type {SmartTimer}
 */
module.exports = SmartTimer
