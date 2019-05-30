const EventEmitter = require('eventemitter3')
const keymirror = require('keymirror')
const pad = require('left-pad')
const pkcs7 = require('pkcs7')
const pAll = require('p-all')
const { replace, xor, range } = require('./utils')

const ALL_HEX = range(256).map((i) => pad(i.toString(16), 2, 0))
// <- ['00', '01', ... 'fe', 'ff']

const EVENTS = keymirror({
  CRACK_START: null,
  CRACK_BLOCK_START: null,
  TRAVERSING_KEY_START: null,
  ORIGINAL_KEY_FOUND: null,
  REPLACEMENT_KEY_FOUND: null,
  INVALID_KEY_FOUND: null,
  TRAVERSING_KEY_END: null,
  CRACK_BLOCK_UPDATE_INTERMEDIARY_AT: null,
  CRACK_BLOCK_END: null,
  CRACK_END: null,
  MODIFY_START: null,
  MODIFY_END: null,
})

class Cracker {
  constructor () {
    this.broadcast = new EventEmitter()
  }

  async _crackBlock (iv, cipher, challenge, block) {
    const original = Buffer.concat([iv, cipher])
    const size = iv.length

    let intermediary = Buffer.alloc(size)

    const setIntermediaryAt = (position, value) => {
      intermediary = replace(intermediary, position, Buffer.from([value]))
      this.broadcast.emit(EVENTS.CRACK_BLOCK_UPDATE_INTERMEDIARY_AT, {
        block,
        position,
        value,
      })
    }

    this.broadcast.emit(EVENTS.CRACK_BLOCK_START, { iv, cipher, block })

    for (let padding = 1; padding <= size; padding++) {
      const cast = (name, data) => this.broadcast.emit(name, {
        block,
        padding,
        ...data,
      })

      let input = Buffer.concat([iv, cipher.slice(0, size * (block + 1))])
      let found

      for (let i = 1; i < padding; i++) {
        input = replace(input, size * (block + 1) - i, Buffer.from([padding ^ intermediary[size - i]]))
      }

      cast(EVENTS.TRAVERSING_KEY_START)
      for (let i = 0; i < ALL_HEX.length; i++) {
        const hex = ALL_HEX[i]
        const sample = replace(input, size * (block + 1) - padding, Buffer.from(hex, 'hex'))
        if (sample.equals(original)) {
          cast(EVENTS.ORIGINAL_KEY_FOUND, { hex, sample })
          found = hex
          continue
        }
        cast(EVENTS.CHALLENGE, { hex, sample })
        if (await challenge(sample.slice(0, size), sample.slice(size))) {
          cast(EVENTS.REPLACEMENT_KEY_FOUND, { hex, sample })
          found = hex
          break
        }
        cast(EVENTS.INVALID_KEY_FOUND, { hex, sample })
      }
      cast(EVENTS.TRAVERSING_KEY_END, { found })

      if (!found) {
        throw new Error('All the challenges failed.')
      }
      setIntermediaryAt(size - padding, padding ^ parseInt(found, 16))
    }

    this.broadcast.emit(EVENTS.CRACK_BLOCK_END, { block, intermediary })

    return intermediary
  }

  async crack (iv, cipher, challenge, concurrency = Infinity) {
    const original = Buffer.concat([iv, cipher])
    const size = iv.length

    let intermediary = Buffer.alloc(cipher.length)

    this.broadcast.emit(EVENTS.CRACK_START, { iv, cipher })

    await pAll(range(cipher.length / size).map((block) => async () => {
      const im = await this._crackBlock(iv, cipher, challenge, block)
      intermediary = replace(intermediary, block * size, im)
    }), { concurrency })

    let plain = xor(original.slice(0, intermediary.length), intermediary)

    this.broadcast.emit(EVENTS.CRACK_END, { intermediary, plain })
    return {
      iv,
      cipher,
      intermediary,
      plain,
    }
  }

  async modify (target, size, challenge) {
    const PLACEHOLDER = 255

    let iv = Buffer.alloc(size, PLACEHOLDER)
    let cipher = Buffer.alloc(Math.ceil(target.length / size) * size, PLACEHOLDER)
    let intermediary = Buffer.alloc(cipher.length)

    // add pkcs7 padding
    target = Buffer.from(pkcs7.pad(Buffer.from(target)))

    this.broadcast.emit(EVENTS.MODIFY_START, { iv, cipher, intermediary, target })
    for (let block = cipher.length / size - 1; block >= 0; block--) {
      const start = block * size
      const end = (block + 1) * size

      intermediary = replace(intermediary, block * size, await this._crackBlock(iv, cipher, challenge, block))

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
    this.broadcast.emit(EVENTS.MODIFY_END, { iv, cipher, intermediary, target })

    return {
      iv,
      cipher,
    }
  }
}

Cracker.EVENTS = EVENTS

module.exports = Cracker
