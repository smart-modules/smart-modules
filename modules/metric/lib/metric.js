/**
 * @file A base class for all metrics
 */
'use strict'

const { readdirSync, statSync } = require('fs')
const { basename, join } = require('path')

const PATH_METRICS = join(__dirname, 'metrics')
const METRICS = readdirSync(PATH_METRICS)
  .map(file => join(PATH_METRICS, file))
  .filter(file => statSync(file).isFile())
  .map(file => basename(file, '.js'))

/**
 * A metric records the details of the occurrance and observation of an event
 */
class Metric {
  /**
   * Constructs an instance of `Metric`
   * @param {String} props.type The type of metric
   * @param {String} props.id The unique identifier of the event being recorded
   * @param {String} props.unit The unit of the metric being recorded
   * @param {String} props.value The value of the metric being recorded
   * @param {Number} props.resolution The resolution of the metric data
   * @param {Number} props.occurred Timestamp at which the event occurred
   * @param {Number} props.observed Timestamp at which the event was observed
   * @constructor
   */
  constructor (props) {
    if (this.constructor === Metric) {
      throw new Error('cannot instantiate abstract class!')
    }

    // istanbul ignore if
    if (props.type == null || !METRICS.includes(props.type)) {
      throw new Error(`unknown metric type ${props.type}!`)
    }

    if (props.id == null || typeof props.id !== 'string') {
      throw new Error(`id must be a string; got ${typeof props.id}!`)
    }

    if (props.unit == null || typeof props.unit !== 'string') {
      throw new Error(`unit must be a string; got ${typeof props.unit}!`)
    }

    if (+props.resolution < 0) {
      throw new Error(`resolution must be >= 0; got ${props.resolution}!`)
    }

    if (+props.occurred < 0) {
      throw new Error(`occurred must be >= 0; got ${props.occurred}!`)
    }

    if (+props.observed < 0) {
      throw new Error(`observed must be >= 0; got ${props.observed}!`)
    }

    // istanbul ignore if
    if (props.value == null) {
      throw new TypeError(`value must be specified; got "${props.value}"`)
    }

    this.type = props.type
    this.id = props.id
    this.unit = props.unit
    this.value = props.value
    this.resolution = +props.resolution || 0
    this.occurred = +props.occurred || Date.now()
    this.observed = +props.observed || Date.now()

    Object.freeze(this)
  }

  /**
   * Separator character used during aggregation to generate unique keys based
   * on metric identifiers and units
   * @type {String}
   */
  static get SEPARATOR () {
    return '|'
  }

  /**
   * The time skew (in milliseconds) between occurrance and observation
   * @returns {Number}
   */
  get skew () {
    return this.observed - this.occurred
  }

  /**
   * Returns the JSON representation of this metric
   * @returns {Object}
   */
  toJSON () {
    return {
      type: this.type,
      id: this.id,
      unit: this.unit,
      value: this.value,
      resolution: this.resolution,
      occurred: this.occurred,
      observed: this.observed
    }
  }
}

/**
 * Export the class
 * @type {Metric}
 */
module.exports = Metric
