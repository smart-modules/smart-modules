/**
 * @file A metric that records a histogram with a count
 */
'use strict'

const Metric = require('../metric')

/**
 * A metric that records a histogram with a count
 * @type {Histogram}
 * @extends {Metric}
 */
module.exports = class Histogram extends Metric {
  /**
   * @inheritdoc
   */
  constructor (props) {
    if (props == null) {
      throw new TypeError(`props must be specified; got "${props}"`)
    }

    // I hate double negatives!
    if (!isNaN(+props.value)) {
      props.value = {
        count: 1,
        mean: props.value,
        min: props.value,
        max: props.value
      }
    }

    super({ ...props, type: 'histogram' })
  }

  /**
   * Returns one or more aggregated histogram metrics
   *
   * This method expects an array of metrics (different IDs and/or units) and
   * produces one or more aggregated metrics at the specified target resolution
   * and occurance time.
   *
   * NOTE: All metrics being passed in must be at the same resolution!
   *
   * @param {Histogram[]} metrics An array of metrics to aggregate
   * @param {Number} resolution The resolution of the aggregation
   * @param {Number} occurred The timestamp of the aggregation
   * @returns {Histogram[]}
   */
  static aggregate (metrics, resolution, occurred) {
    const aggregates = []
    const aggregateMap = metrics.reduce((aggregates, metric) => {
      const key = `${metric.id}${Metric.SEPARATOR}${metric.unit}`
      if (!aggregates.has(key)) {
        aggregates.set(key, {
          count: 0,
          mean: 0,
          min: Number.MAX_VALUE,
          max: Number.MIN_VALUE
        })
      }
      const value = aggregates.get(key)

      value.count += metric.value.count
      value.mean += metric.value.mean * metric.value.count // divided by total count below
      value.min = Math.min(value.min, metric.value.min)
      value.max = Math.max(value.max, metric.value.max)

      return aggregates
    }, new Map())

    aggregateMap.forEach((value, key) => {
      value.mean = value.count === 0
        ? /* istanbul ignore next */ 0
        : value.mean / value.count
      value.min = Math.max(value.min, Number.MIN_VALUE)
      value.max = Math.min(value.max, Number.MAX_VALUE)

      const [id, unit] = key.split(Metric.SEPARATOR)
      const metric = new Histogram({ id, unit, value, resolution, occurred })
      aggregates.push(metric)
    })

    return aggregates
  }
}
