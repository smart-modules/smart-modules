/**
 * @file A metric that records a candlestick
 */
'use strict'

const Metric = require('../metric')

/**
 * A metric that records a candlestick
 * @type {Candlestick}
 * @extends {Metric}
 */
module.exports = class Candlestick extends Metric {
  /**
   * @inheritdoc
   */
  constructor (props) {
    if (props == null) {
      throw new TypeError(`props must be specified; got "${props}"`)
    } else if (props.value == null && (isNaN(+props.price) || isNaN(+props.volume))) {
      throw new TypeError(`missing price and/or volume; got "${props}"`)
    }

    super(Object.assign({}, props, {
      type: 'candlestick',
      value: props.value || {
        count: 1,
        open: props.price,
        high: props.price,
        low: props.price,
        close: props.price,
        uptick: props.volume > 0 ? props.volume : 0,
        downtick: props.volume < 0 ? -props.volume : 0
      }
    }))
  }

  /**
   * Returns the closing price for the metric
   * @returns {Number}
   */
  get price () {
    return this.value.close
  }

  /**
   * Returns the total volume for the metric
   * @returns {Number}
   */
  get volume () {
    return this.value.uptick + this.value.downtick
  }

  /**
   * Returns one or more aggregated count metrics
   * @param {Candlestick[]} metrics An array of metrics to aggregate
   * @param {Number} resolution The resolution of the aggregation
   * @param {Number} occurred The timestamp of the aggregation
   * @returns {Candlestick[]}
   */
  static aggregate (metrics, resolution, occurred) {
    const aggregates = []
    const aggregateMap = metrics.reduce((aggregates, metric) => {
      const key = `${metric.id}${Metric.SEPARATOR}${metric.unit}`
      if (!aggregates.has(key)) {
        aggregates.set(key, {
          count: 0,
          open: 0,
          high: Number.MIN_VALUE,
          low: Number.MAX_VALUE,
          close: 0,
          uptick: 0,
          downtick: 0
        })
      }
      const value = aggregates.get(key)

      value.count += metric.value.count
      value.open = value.open || metric.value.open
      value.high = Math.max(value.high, metric.value.high)
      value.low = Math.min(value.low, metric.value.low)
      value.close = metric.value.close
      value.uptick += metric.value.uptick
      value.downtick += metric.value.downtick

      return aggregates
    }, new Map())

    aggregateMap.forEach((value, key) => {
      const [id, unit] = key.split(Metric.SEPARATOR)
      const metric = new Candlestick({ id, unit, value, resolution, occurred })
      aggregates.push(metric)
    })

    return aggregates
  }
}
