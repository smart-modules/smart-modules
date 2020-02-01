/**
 * @file Behavioral specification for the `SmartTimer` class
 */
'use strict'

const { expect } = require('chai')
const SmartTimer = require('../lib/timer')

describe('SmartTimer', () => {
  describe('instantiation', () => {
    it('must not be instantiable with invalid arguments', function () {
      [
        [{ timeout: -2000, interval: 2000 }, () => {}],
        [{ timeout: 2000, interval: -2000 }, () => {}],
        [{ timeout: 1000, interval: 2000 }, () => {}]
      ].forEach(args => {
        expect(() => new SmartTimer(...args)).to.throw()
      })
    })

    it('must be instantiable with valid arguments', () => {
      [
        [],
        [null],
        [{}],
        [{ timeout: 2000 }],
        [{ interval: 2000 }],
        [],
        [() => {}],
        [{ timeout: 2000, interval: 2000 }, () => {}]
      ].forEach(args => {
        let timer = null
        expect(() => { timer = new SmartTimer(...args) }).to.not.throw()
        timer.destroy()
      })
    })

    it('must be instantiable the functional way', function () {
      expect(SmartTimer.create).to.be.a('function')

      const args = { timeout: 500, interval: 100 }
      let timer = null
      expect(() => { timer = SmartTimer.create(args) }).to.not.throw()

      expect(timer.timeout).to.equal(args.timeout)
      expect(timer.interval).to.equal(args.interval)
    })
  })

  describe('operation', () => {
    it('must emit a `timeout` event when the timer times out', (done) => {
      const props = { timeout: 500, interval: 100 }
      SmartTimer.create(props)
        .once('timeout', duration => {
          expect(duration).to.be.at.least(props.timeout)
          done()
        })
    })

    it('must execute the default timeout callback', (done) => {
      const props = { timeout: 500, interval: 100 }
      const onTimeout = duration => {
        expect(duration).to.be.at.least(props.timeout)
        done()
      }
      SmartTimer.create(props, onTimeout) // eslint-disable-line no-new
    })

    it('must record activity correctly', done => {
      const props = { timeout: 500, interval: 100 }
      const onTimeout = () => done(new Error('should not have timed out!'))
      const timer = SmartTimer.create(props, onTimeout)
      const interval = setInterval(() => timer.touch(), 95)

      setTimeout(function () {
        clearInterval(interval)
        timer.destroy()
        done()
      }, 1000)
    })

    it('must destroy the timer correctly', done => {
      let destroyed = false
      const props = { timeout: 500, interval: 100 }
      const onTimeout = () => done(new Error('should not have timed out!'))
      const timer = SmartTimer.create(props, onTimeout)
      const interval = setInterval(function () {
        try {
          timer.touch()
        } catch (e) {
          clearInterval(interval)

          if (destroyed) {
            done()
          } else {
            done(new Error('timer not destroyed properly!'))
          }
        }
      }, 100)

      setTimeout(function () {
        timer.destroy()
        destroyed = true
      }, 1000)
    })
  })
})
