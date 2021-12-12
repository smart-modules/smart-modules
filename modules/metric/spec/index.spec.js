/**
 * @file Behavioral specification of the smart metric
 */
'use strict'

const SmartMetric = require('../lib')
const { createProps } = require('./helpers')
const { expect } = require('chai')
const { join } = require('path')

describe('SmartMetric', function () {
  const TEST_CASES = [{
    name: 'CandleStick',
    method: 'candlestick',
    type: require('../lib/metrics/candlestick'),
    value: { price: 1, volume: 1 }
  }, {
    name: 'Count',
    method: 'counter',
    type: require('../lib/metrics/counter'),
    value: 1
  }, {
    name: 'Histogram',
    method: 'histogram',
    type: require('../lib/metrics/histogram'),
    value: 1
  }]

  TEST_CASES.forEach(({ name, method, type, value }) => {
    describe(`.${method}()`, function () {
      it(`must return an instance of ${method}`, function () {
        const props = createProps({ value })
        expect(SmartMetric).to.respondTo(method)
        expect(SmartMetric[method](props)).to.be.an.instanceof(type)
      })

      require(join(__dirname, 'metrics', `${method}.spec`))
    })
  })
})
