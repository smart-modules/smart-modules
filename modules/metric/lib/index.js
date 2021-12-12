/**
 * @file Implementation of a smart metric that records events
 */
'use strict'

const Candlestick = require('./metrics/candlestick')
const Counter = require('./metrics/counter')
const Histogram = require('./metrics/histogram')

const Metric = module.exports

Metric.candlestick = function (...args) {
  return new Candlestick(...args)
}

Metric.counter = function (...args) {
  return new Counter(...args)
}

Metric.histogram = function (...args) {
  return new Histogram(...args)
}
