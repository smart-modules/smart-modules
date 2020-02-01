/**
 * @file Behavioral specification for the `SmartQueue` class
 */
'use strict'

const { expect } = require('chai')
const SmartQueue = require('../lib/queue')

describe('SmartQueue', () => {
  describe('instantiation', () => {
    it('must not be instantiable with invalid arguments', function () {
      [
        [{ strategy: 'unknown' }],
        [{ strategy: 'drop' }],
        [{ strategy: 'overwrite' }]
      ].forEach(args => {
        expect(() => new SmartQueue(...args)).to.throw()
      })
    })

    it('must be instantiable with valid arguments', () => {
      [
        [],
        [null],
        [{}],
        [{ strategy: 'drop', size: 10 }],
        [{ strategy: 'overwrite', size: 10 }]
      ].forEach(args => {
        expect(() => new SmartQueue(...args)).to.not.throw()
      })
    })

    it('must be instantiable the functional way', function () {
      let queue = null
      expect(() => { queue = SmartQueue.create() }).to.not.throw()

      expect(queue.strategy).to.equal('grow')
      expect(queue.size).to.equal(Infinity)
      expect(queue.length).to.equal(0)
    })
  })

  describe('operation', () => {
    describe('strategy: drop', () => {
      it('must enqueue new data when space is available', () => {
        const queue = SmartQueue.create({ size: 1, strategy: 'drop' })
        expect(queue.enqueue({ foo: 'bar' })).to.equal(true)
        expect(queue.length).to.equal(1)
      })

      it('must not enqueue new data when space is not available', () => {
        const queue = SmartQueue.create({ size: 1, strategy: 'drop' })
        expect(queue.enqueue({ foo: 'bar' })).to.equal(true)
        expect(queue.enqueue({ bar: 'baz' })).to.equal(false)
        expect(queue.length).to.equal(1)
      })

      it('must dequeue data when available', () => {
        const queue = SmartQueue.create({ size: 1, strategy: 'drop' })
        expect(queue.enqueue({ foo: 'bar' })).to.equal(true)
        expect(queue.dequeue()).to.deep.equal({ foo: 'bar' })
        expect(queue.length).to.equal(0)
      })

      it('must not dequeue data when not available', () => {
        const queue = SmartQueue.create({ size: 1, strategy: 'drop' })
        expect(queue.enqueue({ foo: 'bar' })).to.equal(true)
        expect(queue.dequeue()).to.deep.equal({ foo: 'bar' })
        expect(queue.length).to.equal(0)
        // eslint-disable-next-line no-unused-expressions
        expect(queue.dequeue()).to.be.undefined
        expect(queue.length).to.equal(0)
      })
    })

    describe('strategy: overwrite', () => {
      it('must enqueue new data when space is available', () => {
        const queue = SmartQueue.create({ size: 1, strategy: 'overwrite' })
        expect(queue.enqueue({ foo: 'bar' })).to.equal(true)
        expect(queue.length).to.equal(1)
      })

      it('must enqueue new data when space is not available', () => {
        const queue = SmartQueue.create({ size: 2, strategy: 'overwrite' })
        expect(queue.enqueue({ foo: 'bar' })).to.equal(true)
        expect(queue.length).to.equal(1)
        expect(queue.enqueue({ bar: 'baz' })).to.equal(true)
        expect(queue.length).to.equal(2)
        expect(queue.enqueue({ baz: 'foo' })).to.equal(true)
        expect(queue.length).to.equal(2)

        expect(queue.dequeue()).to.deep.equal({ bar: 'baz' })
        expect(queue.length).to.equal(1)
        expect(queue.dequeue()).to.deep.equal({ baz: 'foo' })
        expect(queue.length).to.equal(0)
      })

      it('must dequeue data when available', () => {
        const queue = SmartQueue.create({ size: 1, strategy: 'overwrite' })
        expect(queue.enqueue({ foo: 'bar' })).to.equal(true)
        expect(queue.dequeue()).to.deep.equal({ foo: 'bar' })
        expect(queue.length).to.equal(0)
      })

      it('must not dequeue data when not available', () => {
        const queue = SmartQueue.create({ size: 1, strategy: 'overwrite' })
        expect(queue.enqueue({ foo: 'bar' })).to.equal(true)
        expect(queue.dequeue()).to.deep.equal({ foo: 'bar' })
        // eslint-disable-next-line no-unused-expressions
        expect(queue.dequeue()).to.be.undefined
        expect(queue.length).to.equal(0)
      })
    })

    describe('strategy: grow', () => {
      const queue = SmartQueue.create()

      it('must enqueue data as long as there is memory available (64Mb heap usage)', function (done) {
        ;(function enqueue (count) {
          if (process.memoryUsage().heapUsed > 1024 * 1024 * 64) {
            done()
          } else {
            if (++count % 1000 !== 0) {
              queue.enqueue(Math.random()) && enqueue(count)
            } else {
              setImmediate(() => enqueue(count))
            }
          }
        }(0))
      })
    })
  })
})
