const EventEmitter = require('eventemitter3')
const keymirror = require('keymirror')
const { observable, toJS } = require('mobx')
const pad = require('left-pad')
const pkcs7 = require('pkcs7')
const pAll = require('p-all')
const { replace, xor, range } = require('./utils')

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

  async crack (iv, cipher, challenge, concurrency = Infinity) {
    let { state } = this

    state.iv = iv
    state.cipher = cipher

    const original = Buffer.concat([iv, cipher])
    const size = iv.length

    state.intermediary = Buffer.alloc(cipher.length)

    this.broadcast.emit(EVENTS.CRACK_START)

    await pAll(range(cipher.length / size).map((block) => async () => {
      const im = await this.crackBlock(iv, cipher, challenge, block)
      state.intermediary = replace(state.intermediary, block * size, im)
    }), { concurrency })

    state.plain = xor(original.slice(0, state.intermediary.length), state.intermediary)

    this.broadcast.emit(EVENTS.CRACK_END)
    return toJS(state)
  }

  async crackBlock (iv, cipher, challenge, block) {
    const original = Buffer.concat([iv, cipher])
    const size = iv.length

    let intermediary = Buffer.alloc(size)

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
        input = replace(input, size * (block + 1) - i, Buffer.from([padding ^ intermediary[size - i]]))
      }

      broadcast(EVENTS.TRAVERSING_KEY_START)
      for (let i = 0; i < ALL_HEX.length; i++) {
        const hex = ALL_HEX[i]
        const sample = replace(input, size * (block + 1) - padding, Buffer.from(hex, 'hex'))
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
      intermediary = replace(intermediary, size - padding, Buffer.from([padding ^ parseInt(found, 16)]))
    }

    return intermediary
  }

  async modify (target, size, challenge) {
    const PLACEHOLDER = 255

    let iv = Buffer.alloc(size, PLACEHOLDER)
    let cipher = Buffer.alloc(Math.ceil(target.length / size) * size, PLACEHOLDER)
    let intermediary = Buffer.alloc(cipher.length)

    // add pkcs7 padding
    target = Buffer.from(pkcs7.pad(Buffer.from(target)))

    for (let block = cipher.length / size - 1; block >= 0; block--) {
      const start = block * size
      const end = (block + 1) * size

      intermediary = replace(intermediary, block * size, await this.crackBlock(iv, cipher, challenge, block))

      const vector = xor(
        intermediary.slice(start, end),
        target.slice(start, end)
      )

      if (block > 0) {
        cipher = replace(cipher, (block - 1) * size, vector)
      } else {
        iv = vector
      }
    }

    return {
      iv,
      cipher,
    }
  }
}

Cracker.EVENTS = EVENTS

module.exports = Cracker
