const EventEmitter = require('eventemitter3')
const keymirror = require('keymirror')
const { observable, toJS } = require('mobx')
const pad = require('left-pad')
const { replace, xor } = require('./utils')

const ALL_HEX = Array.from(Array(256)).map((v, i) => pad(i.toString(16), 2, 0))
// <- ['00', '01', ... 'fe', 'ff']

const EVENTS = keymirror({
  CRACK_START: null,
  TRAVERSING_KEY_START: null,
  ORIGINAL_KEY_FOUND: null,
  REPLACEMENT_KEY_FOUND: null,
  INVALID_KEY_FOUND: null,
  TRAVERSING_KEY_END: null,
  CRACK_END: null,
})

class Cracker {
  constructor () {
    this.state = observable({
      iv: '',
      cipher: '',
      plain: '',
      intermediary: '',
    })
    this.broadcast = new EventEmitter()
  }

  async crack (iv, cipher, challenge) {
    let { state } = this

    state.iv = iv
    state.cipher = cipher

    let original = Buffer.concat([iv, cipher])
    let size = iv.length

    state.intermediary = Buffer.alloc(cipher.length)

    this.broadcast.emit(EVENTS.CRACK_START)
    for (let block = 0; block * size < cipher.length; block++) {

      for (let padding = 1; padding <= size; padding++) {
        const broadcast = (name, hex, sample) => this.broadcast.emit(name, {
          block,
          padding,
          hex,
          sample,
        })

        let input = Buffer.concat([iv, cipher.slice(0, size * (block + 1))])
        let found

        for (let i = 1; i < padding; i++) {
          input = replace(input, size * (block + 1) - i, Buffer.from([padding ^ state.intermediary[size * (block + 1) - i]]))
        }

        broadcast(EVENTS.TRAVERSING_KEY_START)
        for (let i = 0; i < ALL_HEX.length; i++) {
          let hex = ALL_HEX[i]
          let sample = replace(input, size * (block + 1) - padding, Buffer.from(hex, 'hex'))
          if (sample.equals(original)) {
            broadcast(EVENTS.ORIGINAL_KEY_FOUND, hex, sample)
            found = hex
            continue
          }
          if (await challenge(sample.slice(0, size), sample.slice(size))) {
            broadcast(EVENTS.REPLACEMENT_KEY_FOUND, hex, sample)
            found = hex
            break
          }
          broadcast(EVENTS.INVALID_KEY_FOUND, hex, sample)
        }
        broadcast(EVENTS.TRAVERSING_KEY_END)

        if (!found) {
          throw new Error('All the challenges failed.')
        }
        state.intermediary = replace(state.intermediary, size * (block + 1) - padding, Buffer.from([padding ^ parseInt(found, 16)]))
      }
    }

    state.plain = xor(original.slice(0, state.intermediary.length), state.intermediary)

    this.broadcast.emit(EVENTS.CRACK_END)
    return toJS(state)
  }
}

Cracker.EVENTS = EVENTS

module.exports = Cracker
