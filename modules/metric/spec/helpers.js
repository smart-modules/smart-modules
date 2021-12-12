/**
 * @file Helpers for the tests
 */
'use strict'

const { readdirSync, statSync } = require('fs')
const { basename, join } = require('path')

const Helpers = module.exports

/**
 * An array of non-strict data types
 * @type {Array}
 */
Helpers.NON_STRING_TYPES = [undefined, null, 42, [], {}]

/**
 * Path to directory where all metric classes are saved
 * @type {String}
 */
Helpers.PATH_METRICS = join(__dirname, '..', 'lib', 'metrics')

/**
 * Names of all the metric types
 * @type {String[]}
 */
Helpers.METHODS = readdirSync(Helpers.PATH_METRICS)
  .map(file => join(Helpers.PATH_METRICS, file))
  .filter(file => statSync(file).isFile())
  .map(file => basename(file, '.js'))

/**
 * The metric types
 * @type {Metric[]}
 */
Helpers.METRICS = Helpers.METHODS.map(method => {
  return require(join(Helpers.PATH_METRICS, method))
})

/**
 * The metric types
 * @type {Metric[]}
 */
Helpers.PROPS = Helpers.METHODS.map(method => {
  return require(join(Helpers.PATH_METRICS, method))
})

/**
 * Creates a props object to be passed into a metric constructor
 * @param {Object} props Overriding options for the properties
 * @returns {Object}
 */
Helpers.createProps = props => Object.assign({
  id: 'myMetric',
  unit: 'units',
  resolution: 0,
  occurred: 0,
  observed: 0
}, props)
