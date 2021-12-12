/**
 * @file Behavioral specification of a histogram metric
 */
'use strict'

const Histogram = require('../../lib/metrics/histogram')
const { createProps, NON_STRING_TYPES } = require('../helpers')
const { expect } = require('chai')

describe('Histogram', function () {
  let metric = null

  afterEach(function () {
    metric = null
  })

  describe('instantiation', function () {
    it('must return a Histogram when correctly instantiated', function () {
      const props = createProps({ value: 1 })

      expect(() => { metric = new Histogram(props) }).to.not.throw()
      expect(metric).to.be.an.instanceof(Histogram)
      expect(metric.type).to.be.a('string').that.equals('histogram')
      expect(metric.id).to.be.a('string').that.equals(props.id)
      expect(metric.value).to.be.an('object').that.has.keys([
        'count',
        'mean',
        'min',
        'max'
      ])
      expect(metric.value.count).to.be.a('number').that.equals(1)
      expect(metric.value.mean).to.be.a('number').that.equals(1)
      expect(metric.value.min).to.be.a('number').that.equals(1)
      expect(metric.value.max).to.be.a('number').that.equals(1)
      expect(metric.unit).to.be.a('string').that.equals(props.unit)
      expect(metric.resolution).to.be.a('number').that.equals(props.resolution)
      expect(metric.occurred).to.be.a('number').that.is.closeTo(Date.now(), 100)
      expect(metric.observed).to.be.a('number').that.is.closeTo(Date.now(), 100)
      expect(metric.skew).to.be.a('number').that.equals(0)
    })

    it('must use the current timestamp when not specified', function () {
      const props = createProps({
        value: 1,
        occurred: undefined,
        observed: undefined
      })
      const metric = new Histogram(props)

      expect(metric).to.be.an.instanceof(Histogram)
      expect(metric.type).to.be.a('string').that.equals('histogram')
      expect(metric.id).to.be.a('string').that.equals(props.id)
      expect(metric.value).to.be.an('object').that.has.keys([
        'count',
        'mean',
        'min',
        'max'
      ])
      expect(metric.value.count).to.be.a('number').that.equals(1)
      expect(metric.value.mean).to.be.a('number').that.equals(1)
      expect(metric.value.min).to.be.a('number').that.equals(1)
      expect(metric.value.max).to.be.a('number').that.equals(1)
      expect(metric.unit).to.be.a('string').that.equals(props.unit)
      expect(metric.resolution).to.be.a('number').that.equals(props.resolution)
      expect(metric.occurred).to.be.a('number').that.is.closeTo(Date.now(), 100)
      expect(metric.observed).to.be.a('number').that.is.closeTo(Date.now(), 100)
      expect(metric.skew).to.be.a('number').that.equals(0)
    })

    describe('error-handling', function () {
      it('must throw an error when improperly instantiated', function () {
        expect(() => new Histogram()).to.throw(TypeError)
      })

      it('must throw an error for invalid identifiers', function () {
        NON_STRING_TYPES.forEach(id => {
          const props = createProps({ id, value: 1 })
          const expectedError = `id must be a string; got ${typeof id}!`
          expect(() => new Histogram(props)).to.throw(expectedError)
        })
      })

      it('must throw an error for invalid units', function () {
        NON_STRING_TYPES.forEach(unit => {
          const props = createProps({ values: 1, unit })
          const expectedError = `unit must be a string; got ${typeof unit}!`
          expect(() => new Histogram(props)).to.throw(expectedError)
        })
      })

      it('must thow an error for invalid resolution', function () {
        const props = createProps({ values: 1, resolution: -1 })
        const { resolution } = props
        const expectedError = `resolution must be >= 0; got ${resolution}!`
        expect(() => new Histogram(props)).to.throw(expectedError)
      })

      it('must thow an error for invalid occurrance time', function () {
        const props = createProps({ values: 1, occurred: -1 })
        const { occurred } = props
        const expectedError = `occurred must be >= 0; got ${occurred}!`
        expect(() => new Histogram(props)).to.throw(expectedError)
      })

      it('must thow an error for invalid observation time', function () {
        const props = createProps({ values: 1, observed: -1 })
        const { observed } = props
        const expectedError = `observed must be >= 0; got ${observed}!`
        expect(() => new Histogram(props)).to.throw(expectedError)
      })
    })
  })

  describe('#toJSON()', function () {
    it('must return the JSON representation of the metric', function () {
      const props = createProps({
        value: { count: 1, mean: 1, min: 0, max: 1 }
      })
      const metric = new Histogram(props)
      const json = metric.toJSON()

      expect(json).to.be.an('object').that.has.keys([
        'id',
        'observed',
        'occurred',
        'resolution',
        'type',
        'unit',
        'value'
      ])
      expect(json.type).to.be.a('string').that.equals('histogram')
      expect(json.id).to.be.a('string').that.equals(props.id)
      expect(json.value).to.be.an('object').that.has.keys([
        'count',
        'mean',
        'min',
        'max'
      ])
      expect(json.value.count).to.be.a('number').that.equals(1)
      expect(json.value.mean).to.be.a('number').that.equals(1)
      expect(json.value.min).to.be.a('number').that.equals(0)
      expect(json.value.max).to.be.a('number').that.equals(1)
      expect(json.unit).to.be.a('string').that.equals(props.unit)
      expect(json.resolution).to.be.a('number').that.equals(props.resolution)
      expect(json.occurred).to.be.a('number').that.is.closeTo(Date.now(), 100)
      expect(json.observed).to.be.a('number').that.is.closeTo(Date.now(), 100)
    })
  })

  describe('.aggregate()', function () {
    it('must aggregate histgrams correctly', function () {
      const props = createProps({ value: { price: 1, volume: 1 } })
      const resolution = 60000
      const occurred = Math.floor(Date.now() / 1000) * 1000
      const metrics = [
        new Histogram(Object.assign(props, { value: 8 })),
        new Histogram(Object.assign(props, { value: 9 })),
        new Histogram(Object.assign(props, { value: 10 })),
        new Histogram(Object.assign(props, { value: 6 })),
        new Histogram(Object.assign(props, { value: 7 })),
        new Histogram(Object.assign(props, { value: 4 })),
        new Histogram(Object.assign(props, { value: 5 })),
        new Histogram(Object.assign(props, { value: 1 })),
        new Histogram(Object.assign(props, { value: 2 })),
        new Histogram(Object.assign(props, { value: 3 }))
      ]
      const aggregates = Histogram.aggregate(metrics, resolution, occurred)

      expect(aggregates).to.be.an('array')
      expect(aggregates).to.have.length(1)

      expect(aggregates[0]).to.be.an.instanceof(Histogram)
      expect(aggregates[0].id).to.be.a('string').that.equal(props.id)
      expect(aggregates[0].unit).to.be.a('string')
      expect(aggregates[0].value).to.be.an('object')
      expect(aggregates[0].value.count).to.be.a('number').that.equals(10)
      expect(aggregates[0].value.mean).to.be.a('number').that.equals(5.5)
      expect(aggregates[0].value.min).to.be.a('number').that.equals(1)
      expect(aggregates[0].value.max).to.be.a('number').that.equals(10)
      expect(aggregates[0].resolution).to.be.a('number').that.equals(resolution)
      expect(aggregates[0].occurred).to.be.a('number').that.equals(occurred)
    })
  })
})
