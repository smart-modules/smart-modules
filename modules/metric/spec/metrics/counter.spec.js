/**
 * @file Behavioral specification of a counter metric
 */
'use strict'

const Counter = require('../../lib/metrics/counter')
const { createProps, NON_STRING_TYPES } = require('../helpers')
const { expect } = require('chai')

describe('Counter', function () {
  let metric = null

  afterEach(function () {
    metric = null
  })

  describe('instantiation', function () {
    it('must return a Counter when correctly instantiated', function () {
      const props = createProps({ value: 1 })

      expect(() => { metric = new Counter(props) }).to.not.throw()
      expect(metric).to.be.an.instanceof(Counter)
      expect(metric.type).to.be.a('string').that.equals('counter')
      expect(metric.id).to.be.a('string').that.equals(props.id)
      expect(metric.value).to.be.a('number').that.equals(props.value)
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
      const metric = new Counter(props)

      expect(metric).to.be.an.instanceof(Counter)
      expect(metric.type).to.be.a('string').that.equals('counter')
      expect(metric.id).to.be.a('string').that.equals(props.id)
      expect(metric.value).to.be.a('number').that.equals(props.value)
      expect(metric.unit).to.be.a('string').that.equals(props.unit)
      expect(metric.resolution).to.be.a('number').that.equals(props.resolution)
      expect(metric.occurred).to.be.a('number').that.is.closeTo(Date.now(), 100)
      expect(metric.observed).to.be.a('number').that.is.closeTo(Date.now(), 100)
      expect(metric.skew).to.be.a('number').that.equals(0)
    })

    describe('error-handling', function () {
      it('must throw an error when improperly instantiated', function () {
        expect(() => new Counter()).to.throw(TypeError)
      })

      it('must throw an error for invalid identifiers', function () {
        NON_STRING_TYPES.forEach(id => {
          const props = createProps({ id, value: 1 })
          const expectedError = `id must be a string; got ${typeof id}!`
          expect(() => new Counter(props)).to.throw(expectedError)
        })
      })

      it('must throw an error for invalid units', function () {
        NON_STRING_TYPES.forEach(unit => {
          const props = createProps({ value: 1, unit })
          const expectedError = `unit must be a string; got ${typeof unit}!`
          expect(() => new Counter(props)).to.throw(expectedError)
        })
      })

      it('must thow an error for invalid resolution', function () {
        const props = createProps({ value: 1, resolution: -1 })
        const { resolution } = props
        const expectedError = `resolution must be >= 0; got ${resolution}!`
        expect(() => new Counter(props)).to.throw(expectedError)
      })

      it('must thow an error for invalid occurrance time', function () {
        const props = createProps({ value: 1, occurred: -1 })
        const { occurred } = props
        const expectedError = `occurred must be >= 0; got ${occurred}!`
        expect(() => new Counter(props)).to.throw(expectedError)
      })

      it('must thow an error for invalid observation time', function () {
        const props = createProps({ value: 1, observed: -1 })
        const { observed } = props
        const expectedError = `observed must be >= 0; got ${observed}!`
        expect(() => new Counter(props)).to.throw(expectedError)
      })

      it('must throw an error for negative counts', function () {
        const props = createProps({ value: -1 })
        const { value } = props
        const expectedError = `value must be a positive integer; got ${value}!`
        expect(() => new Counter(props)).to.throw(expectedError)
      })
    })
  })

  describe('#toJSON()', function () {
    it('must return the JSON representation of the metric', function () {
      const props = createProps({ value: 1 })
      const metric = new Counter(props)
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
      expect(json.type).to.be.a('string').that.equals('counter')
      expect(json.id).to.be.a('string').that.equals(props.id)
      expect(json.value).to.be.a('number').that.equals(props.value)
      expect(json.unit).to.be.a('string').that.equals(props.unit)
      expect(json.resolution).to.be.a('number').that.equals(props.resolution)
      expect(json.observed).to.be.a('number').that.is.closeTo(Date.now(), 10)
      expect(json.occurred).to.be.a('number').that.is.closeTo(Date.now(), 10)
    })
  })

  describe('.aggregate()', function () {
    it('must aggregate counts correctly', function () {
      const props = createProps()
      const resolution = 60000
      const occurred = Math.floor(Date.now() / 1000) * 1000
      const metrics = [
        new Counter(Object.assign(props, { value: 1, unit: 'bytes' })),
        new Counter(Object.assign(props, { value: 2, unit: 'bytes' })),
        new Counter(Object.assign(props, { value: 3, unit: 'bytes' })),
        new Counter(Object.assign(props, { value: 4, unit: 'bytes' })),
        new Counter(Object.assign(props, { value: 5, unit: 'bytes' })),
        new Counter(Object.assign(props, { value: 1, unit: 'kilobytes' })),
        new Counter(Object.assign(props, { value: 2, unit: 'kilobytes' })),
        new Counter(Object.assign(props, { value: 3, unit: 'kilobytes' })),
        new Counter(Object.assign(props, { value: 4, unit: 'kilobytes' })),
        new Counter(Object.assign(props, { value: 5, unit: 'kilobytes' }))
      ]
      const agg = Counter.aggregate(metrics, resolution, occurred)

      expect(agg).to.be.an('array')
      expect(agg).to.have.length(2)

      expect(agg[0]).to.be.an.instanceof(Counter)
      expect(agg[0].type).to.be.a('string').that.equals('counter')
      expect(agg[0].id).to.be.a('string').that.equals(props.id)
      expect(agg[0].value).to.be.a('number').that.equals(15)
      expect(agg[0].unit).to.be.a('string').that.equals('bytes')
      expect(agg[0].resolution).to.be.a('number').that.equals(resolution)
      expect(agg[0].occurred).to.be.a('number').that.is.closeTo(Date.now(), 1000)
      expect(agg[0].observed).to.be.a('number').that.is.closeTo(Date.now(), 1000)

      expect(agg[1]).to.be.an.instanceof(Counter)
      expect(agg[1].type).to.be.a('string').that.equals('counter')
      expect(agg[1].id).to.be.a('string').that.equals(props.id)
      expect(agg[1].value).to.be.a('number').that.equals(15)
      expect(agg[1].unit).to.be.a('string').that.equals('kilobytes')
      expect(agg[1].resolution).to.be.a('number').that.equals(resolution)
      expect(agg[1].occurred).to.be.a('number').that.is.closeTo(Date.now(), 1000)
      expect(agg[1].observed).to.be.a('number').that.is.closeTo(Date.now(), 1000)
    })
  })
})
