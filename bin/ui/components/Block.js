const React = require('react')
const { Box, Text } = require('ink')
const pad = require('left-pad')
const jsx = require('import-jsx')
const Cracker = require('../../..')
const EVENTS = Cracker.EVENTS

const Divider = jsx('./Divider')
const { print } = jsx('./Messages')

function alloc(size, value) {
  return Array.from(new Array(size)).map(() => value)
}

const Block = ({ cracker, block, iv, cipher }) => {
  const [intermediary, setIntermediary] = React.useState([])
  const [vector, setVector] = React.useState([])
  const [plain, setPlain] = React.useState([])
  const [isTampered, setIsTampered] = React.useState(false)

  React.useEffect(() => {
    if (!cracker) {
      return
    }

    let size, slice

    const init = ({ iv, cipher, block }) => {
      size = iv.length
      slice = (size => (buf, block) =>
        buf.slice(block * size, (block + 1) * size))(size)

      setIntermediary(alloc(size, '??'))
      setVector(block === 0 ? iv : slice(cipher, block - 1))
      setPlain(alloc(size, '??'))
      setIsTampered(true)
    }

    const subscribe = (name, handler) =>
      cracker.broadcast.addListener(name, data => {
        if (block !== data.block) {
          return
        }
        handler(data)
      })

    if (iv && cipher) {
      init({ iv, cipher, block })
    }

    subscribe(EVENTS.CRACK_BLOCK_START, init)

    subscribe(
      EVENTS.CRACK_BLOCK_UPDATE_INTERMEDIARY_AT,
      ({ position, value }) => {
        setIntermediary(intermediary => [
          ...intermediary.slice(0, position),
          value,
          ...intermediary.slice(position + 1),
        ])
      }
    )

    subscribe(EVENTS.TRAVERSING_KEY_START, ({ padding }) => {
      const plain = ((size, padding) => {
        let buf = alloc(size, '??')
        return buf.map((v, i) => {
          if (size - i > padding - 1) {
            return v
          }
          return padding
        })
      })(size, padding)
      setPlain(plain)
    })

    subscribe(EVENTS.CHALLENGE, ({ block, padding, hex, sample }) => {
      print(
        `Challenge start on Block ${block}, Padding ${padding}, Value ${hex} ...`
      )
      setVector(slice(sample, block))
    })

    subscribe(EVENTS.TRAVERSING_KEY_END, () => {
      setVector(alloc(size, '--'))
      setPlain(alloc(size, '--'))
    })

    subscribe(EVENTS.CRACK_BLOCK_END, () => {
      setIsTampered(false)
    })
  }, [cracker, block])

  const format = buf => {
    const DIVIDER = '|'
    return Array.from(buf)
      .map(v => (typeof v === 'number' ? pad(v.toString(16), 2, '0') : v))
      .join(DIVIDER)
  }

  return (
    <Box flexDirection="column">
      <Box>
        <Text>----- Block {block} -----</Text>
      </Box>
      <Box>
        <Box flexDirection="column">
          <Text>Intermediary ({block}) : </Text>
          {
            isTampered
              ? <div>
                <Text>-</Text>
                {block > 0 ? (
                  <Text>Cipher ({block - 1}) (Tampered) : </Text>
                ) : (
                  <Text>Initial Vector (Tampered) : </Text>
                )}
                <Text>Plain (Tampered) : </Text>
              </div>
              : <div />
          }
        </Box>
        <Box flexDirection="column">
          <Text>{format(intermediary)}</Text>
          {
            isTampered
            ? <div>
              <Text>-</Text>
              <Text>{format(vector)}</Text>
              <Text>{format(plain)}</Text>
            </div>
            : <div />
          }
        </Box>
      </Box>
      <Divider />
    </Box>
  )
}

module.exports = Block
