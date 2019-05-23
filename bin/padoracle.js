#!/usr/bin/env node

const log = require('log-update')
const { observe } = require('mobx')
const Cracker = require('..')
const EVENTS = Cracker.EVENTS

let cracker = new Cracker()

observe(cracker.state, 'intermediary', ({ newValue: intermediary }) => {
  console.log('Intermediary value:', intermediary.toString('hex'))
})
observe(cracker.state, 'plain', ({ newValue: plain }) => {
  console.log('Plain text:', plain.toString())
  console.log('Plain text (hex):', plain.toString('hex'))
})

cracker.broadcast.addListener(EVENTS.CRACK_START, () => {
  console.log('--- Crack start ---')
})
cracker.broadcast.addListener(EVENTS.CRACK_END, () => {
  console.log('---  Crack end  ---')
})
cracker.broadcast.addListener(EVENTS.ORIGINAL_KEY_FOUND, ({ block, padding, hex }) => {
  log(`Current block: ${block}, padding: ${padding}\nkey found: (backup)`, `0x${hex}`)
})
cracker.broadcast.addListener(EVENTS.REPLACEMENT_KEY_FOUND, ({ block, padding, hex }) => {
  log(`Current block: ${block}, padding: ${padding}\nkey found:`, `0x${hex}`)
})
cracker.broadcast.addListener(EVENTS.INVALID_KEY_FOUND, ({ block, padding, hex }) => {
  log(`Current block: ${block}, padding: ${padding}\ninvalid:`, `0x${hex}`)
})
cracker.broadcast.addListener(EVENTS.TRAVERSING_KEY_END, () => {
  log.done()
})

if (module.parent) {
  module.exports = async (...args) => await cracker.crack(...args)
  return
}
