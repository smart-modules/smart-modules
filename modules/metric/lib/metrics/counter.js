/**
 * @file A metric that records a count
 */
'use strict'

const Metric = require('../metric')

/**
 * A metric that records a count
 * @type {Counter}
 * @extends {Metric}
 */
module.exports = class Counter extends Metric {
  /**
   * @inheritdoc
   */
  constructor (props) {
    if (props == null) {
      throw new TypeError(`props must be specified; got "${props}"`)
    }

    if (isNaN(+props.value) || +props.value < 0) {
      throw new Error(`value must be a positive integer; got ${props.value}!`)
    }

    super({ ...props, type: 'counter' })
  }

  /**
   * Returns one or more aggregated count metrics
   *
   * This method expects an array of metrics (different IDs and/or units) and
   * produces one or more aggregated metrics at the specified target resolution
   * and occurance time.
   *
   * NOTE: All metrics being passed in must be at the same resolution!
   *
   * @param {Counter[]} metrics An array of metrics to aggregate
   * @param {Number} resolution The resolution of the aggregation
   * @param {Number} occurred The timestamp of the aggregation
   * @returns {Counter[]}
   */
  static aggregate (metrics, resolution, occurred) {
    const aggregates = []
    const aggregateMap = metrics.reduce((aggregates, metric) => {
      const key = `${metric.id}${Metric.SEPARATOR}${metric.unit}`
      const value = aggregates.has(key) ? aggregates.get(key) : 0

      aggregates.set(key, value + metric.value)

      return aggregates
    }, new Map())

    aggregateMap.forEach((value, key) => {
      const [id, unit] = key.split(Metric.SEPARATOR)
      aggregates.push(new Counter({ id, unit, value, resolution, occurred }))
    })

    return aggregates
  }
}
