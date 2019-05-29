const React = require('react')
const { observe } = require('mobx')
const { Box, Text } = require('ink')
const pad = require('left-pad')
const pkcs7 = require('pkcs7')
const Cracker = require('..')
const EVENTS = Cracker.EVENTS

const KEY_STATUS = {
  ORIGINAL: 'ORIGINAL',
  REPlACEMENT: 'REPLACEMENT',
  INVALID: 'INVALID',
}

const Block = ({ iv, cipher, intermediary, block, sample, padding }) => {
  const format = (buf) => {
    const DIVIDER = '|'
    return Array.from(buf)
      .map((v) => v > 0
        ? pad(v.toString(16), 2, '0')
        : '??'
      )
      .join(DIVIDER)
  }

  const slice = ((size) => (buf, block) =>
    buf.slice(block * size, (block + 1) * size)
  )(iv.length)

  const tamperedPlain = ((size, padding) => {
    let buf = Buffer.alloc(size)
    return buf.map((v, i) => {
      if (size - i > padding - 1) {
        return v
      }
      return padding
    })
  })(iv.length, padding)

  return (
    <Box flexDirection="column">
      <Box>
        <Text>----- Block {block} -----</Text>
      </Box>
      <Box>
        <Text>Cipher ({block})                : </Text>
        <Text>{format(slice(cipher, block))}</Text>
      </Box>
      <Box>
        <Text>Intermediary ({block})          : </Text>
        <Text>{format(slice(intermediary, block))}</Text>
      </Box>
      <Box>
        {
          block > 0
            ? <Text>Cipher ({block - 1}) (Tampered)     : </Text>
            : <Text>Initial Vector (Tampered) : </Text>
        }
        <Text>{format(slice(sample, block))}</Text>
      </Box>
      <Box>
        <Text>Plain ({block}) (Tampered)      : </Text>
        <Text>{format(tamperedPlain)}</Text>
      </Box>
    </Box>
  )
}

function App ({ challenge, iv, cipher }) {
  const [key, setKey] = React.useState({
    block: -1,
    padding: -1,
    hex: '??',
    sample: '',
    status: KEY_STATUS.INVALID,
  })
  const [intermediary, setIntermediary] = React.useState([])
  const [plain, setPlain] = React.useState()

  React.useEffect(() => {
    let cracker = new Cracker()
    observe(cracker.state, 'intermediary', ({ newValue }) =>
      setIntermediary(newValue)
    )
    observe(cracker.state, 'plain', ({ newValue }) =>
      setPlain(newValue)
    )

    cracker.broadcast.addListener(
      EVENTS.ORIGINAL_KEY_FOUND,
      ({ block, padding, hex, sample }) => setKey({
        block,
        padding,
        hex,
        sample,
        status: KEY_STATUS.ORIGINAL
      })
    )
    cracker.broadcast.addListener(
      EVENTS.REPLACEMENT_KEY_FOUND,
      ({ block, padding, hex, sample }) => setKey({
        block,
        padding,
        hex,
        sample,
        status: KEY_STATUS.REPlACEMENT
      })
    )
    cracker.broadcast.addListener(
      EVENTS.INVALID_KEY_FOUND,
      ({ block, padding, hex, sample }) =>setKey({
        block,
        padding,
        hex,
        sample,
        status: KEY_STATUS.INVALID
      })
    )

    cracker.crack(iv, cipher, challenge)
  }, [])

  const status = {
    ORIGINAL: 'key found: (backup)',
    REPLACEMENT: 'key found:',
    INVALID: 'invalid:'
  }[key.status]

  const common = {
    iv,
    cipher,
    intermediary,
  }

  return (
    <Box flexDirection="column">
      <Block {...common} {...key} />
      {
        plain
          ? <div>
            <Box>
              Plain text: {pkcs7.unpad(plain).toString()}
            </Box>
            <Box>
              Plain text (hex): {plain.toString('hex')}
            </Box>
          </div>
          : <div>
            <Box>
              padding: {key.padding}
            </Box>
            <Box>
              {status} {key.hex}
            </Box>
          </div>
      }
    </Box>
  )
}

module.exports = App
