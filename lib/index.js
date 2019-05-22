const EventEmitter = require('eventemitter3')
const log = require('log-update')
const pad = require('left-pad')
const { replace, xor } = require('./utils')

const ALL_HEX = Array.from(Array(256)).map((v, i) => pad(i.toString(16), 2, 0))
// <- ['00', '01', ... 'fe', 'ff']

class Cracker {
  constructor () {
    this.broadcast = new EventEmitter()
  }

  async crack (iv, cipher, challenge) {
    let original = Buffer.concat([iv, cipher])
    let size = iv.length
    let intermediary = Buffer.alloc(cipher.length)
    let plain

    console.log('--- Crack start ---')

    for (let block = 0; block * size < cipher.length; block++) {
      console.log('Current block:', block)

      for (let padding = 1; padding <= size; padding++) {
        console.log('Intermediary value:', intermediary.toString('hex'))
        console.log('Current block: %s, padding: %s', block, padding)

        let input = Buffer.concat([iv, cipher.slice(0, size * (block + 1))])
        let found

        for (let i = 1; i < padding; i++) {
          input = replace(input, size * (block + 1) - i, Buffer.from([padding ^ intermediary[size * (block + 1) - i]]))
        }

        for (let i = 0; i < ALL_HEX.length; i++) {
          let hex = ALL_HEX[i]
          let sample = replace(input, size * (block + 1) - padding, Buffer.from(hex, 'hex'))
          if (sample.equals(original)) {
            log('key found: (backup)', `0x${hex}`)
            found = hex
            continue
          }
          if (await challenge(sample.slice(0, size), sample.slice(size))) {
            log('key found:', `0x${hex}`)
            found = hex
            break
          }
          log('invalid:', `0x${hex}`)
        }

        if (!found) {
          throw new Error('All the challenges failed.')
        }
        intermediary[size * (block + 1) - padding] = padding ^ parseInt(found, 16)
        log.done()
      }
      console.log('Intermediary value:', intermediary.toString('hex'))
    }

    plain = xor(original.slice(0, intermediary.length), intermediary)
    console.log('Plain text:', plain.toString())
    console.log('Plain text (hex):', plain.toString('hex'))
    console.log('---  Crack end  ---')

    return {
      intermediary,
      plain,
    }
  }
}

exports.Cracker = Cracker
exports.crack = (...args) => (new Cracker()).crack(...args)
