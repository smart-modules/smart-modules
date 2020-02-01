/**
 * @file A queue implementation that supports multiple strategies for enqueueing
 * on a full queue.
 */
'use strict'

const { EventEmitter } = require('events')

/**
 * A list of strategies when enqueuing on a full queue
 * @type {Array}
 * @private
 */
const STRATEGIES = ['drop', 'overwrite', 'grow']

/**
 * Default properties for the constructor
 * @type {Object}
 * @private
 */
const DEFAULT_PROPS = {
  strategy: 'grow',
  size: Infinity
}

/**
 * Implements a queue that supports multiple strategies for enqueueing elements
 * when the queue is full. The strategies include:
 *
 * - `drop`: drops new data items when the queue is full; `.enqueue()` returns
 * false
 * - `overwrite`: overwrites old data items when the queue is full; `.enqueue()`
 * returns true
 * - `grow`: grows the size of the queue, when full, to accommodate new data
 * items; `.enqueue()` always returns true, enqueuing new items until the
 * process runs out of memory.
 */
class SmartQueue extends EventEmitter {
  /**
   * Constructs a `SmartQueue` instance
   *
   * NOTE: Not intended for direct use through `new`. Use the
   * {@link SmartQueue.create} instead.
   *
   * @param {Object} [props] Properties of the queue
   * @param {String} [props.strategy='grow'] The enqueuing strategy to use
   * @param {Number} [props.size=Infinity] The size of the queue
   * @returns {SmartQueue}
   */
  constructor (props) {
    let { strategy, size } = props = Object.assign({}, DEFAULT_PROPS, props)

    if (!SmartQueue.STRATEGIES.includes(strategy)) {
      throw new TypeError(`unknown strategy "${strategy}"!`)
    }

    if (strategy === 'grow') {
      size = Infinity
    } else if (size == null || isNaN(size) || size <= 0 || size >= Infinity) {
      throw new TypeError(`invalid size (${size})!`)
    }

    super()

    this._strategy = strategy
    this._size = size
    this._length = 0
    this._data = (this._size === Infinity) ? [] : new Array(this._size)
    this._head = 0
    this._tail = -1
  }

  /**
   * Returns the enqueuing strategy being used by the quque
   * @type {String}
   */
  get strategy () {
    return this._strategy
  }

  /**
   * Returns the size of the queue
   * @type {Number}
   */
  get size () {
    return this._size
  }

  /**
   * Returns the number of data items enqueued in the queue
   * @type {Number}
   */
  get length () {
    return this._length
  }

  /**
   * Enqueues a single data item in the queue, returning true, if the data was
   * successfully enqueued; false otherwise.
   * @param {*} data The data to be enqueued
   * @returns {Boolean}
   */
  enqueue (data) {
    if (this._length < this._size) {
      this._data[this._head] = data
      this._head = (this._head + 1) % this._size
      this._length++
      return true
    }

    switch (this.strategy) {
      case 'drop':
        return false

      case 'overwrite':
        this._data[this._head] = data
        this._head = (this._head + 1) % this._size
        this._tail = (this._tail + 1) % this._size
        return true

      /* istanbul ignore next */
      case 'grow': // For sake of clarity/completeness
        throw new Error('this is really really bad! all bets are off!')

      /* istanbul ignore next */
      default:
        throw new TypeError(`unknown strategy "${this.strategy}"`)
    }
  }

  /**
   * Dequeues a single data item from the queue returning the data that was
   * dequeued, if any; undefined otherwise.
   * @returns {*|undefined}
   */
  dequeue () {
    if (this._length > 0) {
      this._tail = (this._tail + 1) % this._size
      const data = this._data[this._tail]
      this._data[this._tail] = undefined
      this._length--
      return data
    }
  }

  /**
   * A list of strategies for enqueuing new data when the queue is full.
   * @type {Array}
   * @enum
   */
  static get STRATEGIES () {
    return STRATEGIES
  }

  /**
   * Functional form of instantiating a SmartQueue
   * @param {Object} [props] Properties of the queue
   * @param {String} [props.strategy='grow'] The enqueuing strategy to use
   * @param {Number} [props.size=Infinity] The size of the queue
   * @returns {SmartQueue}
   */
  static create (props) {
    return new SmartQueue(props)
  }
}

/**
 * Export the interface
 * @type {SmartQueue}
 */
module.exports = SmartQueue
