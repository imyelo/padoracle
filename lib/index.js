const log = require('log-update')
const pad = require('left-pad')
const ALL_HEX = Array.from(Array(256)).map((v, i) => pad(i.toString(16), 2, 0))
// <- ['00', '01', ... 'fe', 'ff']

function replace (buf, position, replacement) {
  let end = position + replacement.length
  if (position < 0) {
    return replace(buf, buf.length + position, replacement)
  }
  if (end > buf.length) {
    throw new Error('The replacement will cause the result to overflow.')
  }
  return Buffer.from(buf).fill(replacement, position, end)
}

function xor (x, y) {
  if (x.length !== y.length) {
    throw new Error('The length of two buffers is different')
  }
  let z = Buffer.alloc(x.length)
  for (let i = 0; i < z.length; i ++) {
    z[i] = x[i] ^ y[i]
  }
  return z
}

async function crack (iv, cipher, challenge) {
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

exports.crack = crack
