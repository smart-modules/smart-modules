/**
 * @file Defines errors for the SmartStream
 */
'use strict'

const SmartError = require('@smart-modules/error')

/**
 * Defines errors for the SmartStream
 * @type {SmartStreamError}
 */
module.exports = SmartError.create('SmartStreamError', {
  Unexpected: 'An unexpected error occurred!',
  TooLarge: 'The stream is larger than the allowed maximum.',
  TimedOut: 'Timed-out reading the stream source!',
  MultipleSources: 'Piped multiple sources simultaneously!'
})
