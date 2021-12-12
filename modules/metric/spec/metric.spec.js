/**
 * @file Behavioral specification of a metric
 */
'use strict'

const Metric = require('../lib/metric')
const { expect } = require('chai')

describe('Metric', function () {
  describe('instantiation', function () {
    it('must throw an error when instantiated directly', function () {
      expect(() => new Metric()).to.throw('cannot instantiate abstract class!')
    })
  })
})
