/**
 * @file Behavioral specification of a Candlestick metric
 */
'use strict'

const Candlestick = require('../../lib/metrics/candlestick')
const { createProps, NON_STRING_TYPES } = require('../helpers')
const { expect } = require('chai')

describe('Candlestick', function () {
  let metric = null

  afterEach(function () {
    metric = null
  })

  describe('instantiation', function () {
    it('must return a Candlestick when correctly instantiated', function () {
      const props = createProps({ price: 1, volume: 1 })

      expect(() => { metric = new Candlestick(props) }).to.not.throw()
      expect(metric).to.be.an.instanceof(Candlestick)
      expect(metric.type).to.be.a('string').that.equals('candlestick')
      expect(metric.id).to.be.a('string').that.equals(props.id)
      expect(metric.value).to.be.an('object').that.has.keys([
        'count',
        'open',
        'high',
        'low',
        'close',
        'uptick',
        'downtick'
      ])
      expect(metric.value.count).to.be.a('number').that.equals(1)
      expect(metric.value.open).to.be.a('number').that.equals(1)
      expect(metric.value.high).to.be.a('number').that.equals(1)
      expect(metric.value.low).to.be.a('number').that.equals(1)
      expect(metric.value.close).to.be.a('number').that.equals(1)
      expect(metric.value.uptick).to.be.a('number').that.equals(1)
      expect(metric.value.downtick).to.be.a('number').that.equals(0)
      expect(metric.unit).to.be.a('string').that.equals(props.unit)
      expect(metric.resolution).to.be.a('number').that.equals(props.resolution)
      expect(metric.occurred).to.be.a('number').that.is.closeTo(Date.now(), 100)
      expect(metric.observed).to.be.a('number').that.is.closeTo(Date.now(), 100)
      expect(metric.skew).to.be.a('number').that.equals(0)

      expect(metric.price).to.be.a('number').that.equals(props.price)
      expect(metric.volume).to.be.a('number').that.equals(props.volume)
    })

    it('must use the current timestamp when not specified', function () {
      const props = createProps({
        price: 1,
        volume: 1,
        occurred: undefined,
        observed: undefined
      })
      const metric = new Candlestick(props)

      expect(metric).to.be.an.instanceof(Candlestick)
      expect(metric.type).to.be.a('string').that.equals('candlestick')
      expect(metric.id).to.be.a('string').that.equal(props.id)
      expect(metric.value).to.be.an('object').that.has.keys([
        'count',
        'open',
        'high',
        'low',
        'close',
        'uptick',
        'downtick'
      ])
      expect(metric.value.count).to.be.a('number').that.equals(1)
      expect(metric.value.open).to.be.a('number').that.equals(1)
      expect(metric.value.high).to.be.a('number').that.equals(1)
      expect(metric.value.low).to.be.a('number').that.equals(1)
      expect(metric.value.close).to.be.a('number').that.equals(1)
      expect(metric.value.uptick).to.be.a('number').that.equals(1)
      expect(metric.value.downtick).to.be.a('number').that.equals(0)
      expect(metric.unit).to.be.a('string').that.equals(props.unit)
      expect(metric.resolution).to.be.a('number').that.equals(props.resolution)
      expect(metric.occurred).to.be.a('number').that.is.closeTo(Date.now(), 100)
      expect(metric.observed).to.be.a('number').that.is.closeTo(Date.now(), 100)
      expect(metric.skew).to.be.a('number').that.equals(0)

      expect(metric.price).to.be.a('number').that.equals(props.price)
      expect(metric.volume).to.be.a('number').that.equals(props.volume)
    })

    describe('error-handling', function () {
      it('must throw an error when improperly instantiated', function () {
        expect(() => new Candlestick()).to.throw(TypeError)
        expect(() => new Candlestick({})).to.throw(TypeError)
      })

      it('must throw an error for invalid identifiers', function () {
        NON_STRING_TYPES.forEach(id => {
          const props = createProps({ id, price: 1, volume: 1 })
          const expectedError = `id must be a string; got ${typeof id}!`
          expect(() => new Candlestick(props)).to.throw(expectedError)
        })
      })

      it('must throw an error for invalid units', function () {
        NON_STRING_TYPES.forEach(unit => {
          const props = createProps({ unit, price: 1, volume: 1 })
          const expectedError = `unit must be a string; got ${typeof unit}!`
          expect(() => new Candlestick(props)).to.throw(expectedError)
        })
      })

      it('must thow an error for invalid resolution', function () {
        const props = createProps({ resolution: -1, price: 1, volume: 1 })
        const { resolution } = props
        const expectedError = `resolution must be >= 0; got ${resolution}!`
        expect(() => new Candlestick(props)).to.throw(expectedError)
      })

      it('must thow an error for invalid occurrance time', function () {
        const props = createProps({ occurred: -1, price: 1, volume: 1 })
        const { occurred } = props
        const expectedError = `occurred must be >= 0; got ${occurred}!`
        expect(() => new Candlestick(props)).to.throw(expectedError)
      })

      it('must thow an error for invalid observation time', function () {
        const props = createProps({ observed: -1, price: 1, volume: 1 })
        const { observed } = props
        const expectedError = `observed must be >= 0; got ${observed}!`
        expect(() => new Candlestick(props)).to.throw(expectedError)
      })
    })
  })

  describe('#toJSON()', function () {
    it('must return the JSON representation of the metric', function () {
      const props = createProps({ price: 1, volume: 1 })
      const metric = new Candlestick(props)
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
      expect(json.id).to.be.a('string').that.equals(props.id)
      expect(json.value).to.be.an('object').that.has.keys([
        'count',
        'open',
        'high',
        'low',
        'close',
        'uptick',
        'downtick'
      ])
      expect(json.type).to.be.a('string').that.equals('candlestick')
      expect(json.unit).to.be.a('string').that.equals(props.unit)
      expect(json.value.count).to.be.a('number').that.equals(1)
      expect(json.value.open).to.be.a('number').that.equals(1)
      expect(json.value.high).to.be.a('number').that.equals(1)
      expect(json.value.low).to.be.a('number').that.equals(1)
      expect(json.value.close).to.be.a('number').that.equals(1)
      expect(json.value.uptick).to.be.a('number').that.equals(1)
      expect(json.value.downtick).to.be.a('number').that.equals(0)
      expect(json.resolution).to.be.a('number').that.equals(props.resolution)
      expect(json.observed).to.be.a('number').that.is.closeTo(Date.now(), 10)
      expect(json.occurred).to.be.a('number').that.is.closeTo(Date.now(), 10)
    })
  })

  describe('.aggregate()', function () {
    it('must aggregate candlesticks correctly', function () {
      const props = createProps({ price: 1, volume: 1 })
      const resolution = 60000
      const occurred = Math.floor(Date.now() / 1000) * 1000
      const metrics = [
        new Candlestick(Object.assign(props, { price: 8, volume: 1 })),
        new Candlestick(Object.assign(props, { price: 9, volume: 1 })),
        new Candlestick(Object.assign(props, { price: 10, volume: 1 })),
        new Candlestick(Object.assign(props, { price: 6, volume: -1 })),
        new Candlestick(Object.assign(props, { price: 7, volume: 1 })),
        new Candlestick(Object.assign(props, { price: 4, volume: -1 })),
        new Candlestick(Object.assign(props, { price: 5, volume: 1 })),
        new Candlestick(Object.assign(props, { price: 1, volume: -1 })),
        new Candlestick(Object.assign(props, { price: 2, volume: 1 })),
        new Candlestick(Object.assign(props, { price: 3, volume: 1 }))
      ]
      const agg = Candlestick.aggregate(metrics, resolution, occurred)

      expect(agg).to.be.an('array')
      expect(agg).to.have.length(1)

      expect(agg[0]).to.be.an.instanceof(Candlestick)
      expect(agg[0].type).to.be.a('string').that.equals('candlestick')
      expect(agg[0].id).to.be.a('string').that.equal(props.id)
      expect(agg[0].unit).to.be.a('string')
      expect(agg[0].value).to.be.an('object')
      expect(agg[0].value.count).to.be.a('number').that.equals(10)
      expect(agg[0].value.open).to.be.a('number').that.equals(8)
      expect(agg[0].value.high).to.be.a('number').that.equals(10)
      expect(agg[0].value.low).to.be.a('number').that.equals(1)
      expect(agg[0].value.close).to.be.a('number').that.equals(3)
      expect(agg[0].value.uptick).to.be.a('number').that.equals(7)
      expect(agg[0].value.downtick).to.be.a('number').that.equals(3)
      expect(agg[0].resolution).to.be.a('number').that.equals(resolution)
      expect(agg[0].occurred).to.be.a('number').that.is.closeTo(Date.now(), 1000)
      expect(agg[0].observed).to.be.a('number').that.is.closeTo(Date.now(), 1000)
    })
  })
})
