const React = require('react')
const EventEmitter = require('eventemitter3')
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

function alloc(size, value) {
  return Array.from(new Array(size)).map(() => value)
}

const bus = new EventEmitter()
const print = (message) => bus.emit('message', message)

const Block = ({ cracker, block }) => {
  const [cipher, setCipher] = React.useState([])
  const [intermediary, setIntermediary] = React.useState([])
  const [vector, setVector] = React.useState([])
  const [plain, setPlain] = React.useState([])

  React.useEffect(() => {
    if (!cracker) {
      return
    }
    const subscribe = (name, handler) => cracker.broadcast.addListener(name, (data) => {
      if (block !== data.block) {
        return
      }
      handler(data)
    })

    subscribe(EVENTS.CRACK_BLOCK_START, ({ iv, cipher, block }) => {
      const size = iv.length
      const slice = (size => (buf, block) =>
        buf.slice(block * size, (block + 1) * size))(size)

      setCipher(slice(cipher, block))
      setIntermediary(alloc(size, '??'))
      setVector(
        block === 0 ? iv : slice(cipher, block - 1)
      )
      setPlain(alloc(size, '??'))
    })

    subscribe(EVENTS.CRACK_BLOCK_UPDATE_INTERMEDIARY_AT, ({ block, position, value }) => {
      setIntermediary((intermediary) => [
        ...intermediary.slice(0, position),
        value,
        ...intermediary.slice(position + 1),
      ])
    })

    subscribe(EVENTS.CHALLENGE, ({ block, padding, hex }) => {
      print(`Challenge start on Block ${block}, Padding ${padding}, Value ${hex} ...`)
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
          <Text>Cipher ({block}) : </Text>
          <Text>Intermediary ({block}) : </Text>
          <Text>-</Text>
          {block > 0 ? (
            <Text>Cipher ({block - 1}) : </Text>
          ) : (
            <Text>Initial Vector : </Text>
          )}
        </Box>
        <Box flexDirection="column">
          <Text>{format(cipher, block)}</Text>
          <Text>{format(intermediary)}</Text>
          <Text>-</Text>
          <Text>{format(vector)}</Text>
        </Box>
      </Box>
      <Divider />
    </Box>
  )
}

const Divider = () => (
  <div>
    <div></div>
    <div>--------------------</div>
    <div></div>
  </div>
)

const Result = ({ plain }) => {
  return (
    <div>
      <Box>Plain text: {pkcs7.unpad(plain).toString()}</Box>
      <Box>Plain text (hex): {plain.toString('hex')}</Box>
    </div>
  )
}

const Messages = () => {
  const LEN = 4

  let [messages, setMessages] = React.useState([])

  React.useEffect(() => {
    bus.on('message', (message) => {
      setMessages((messages) => [
        ...messages,
        message,
      ])
    })
  }, [])

  return <div>
    <div>Messages:</div>
    {
      messages.slice(-1 * LEN).map((msg, i) => (
        <div key={i}>{msg}</div>
      ))
    }
  </div>
}

function App({ challenge, iv, cipher }) {
  const [cracker, setCracker] = React.useState()
  const [crackResult, setCrackResult] = React.useState({})

  const blocks = Array.from(new Array(cipher.length / iv.length))

  React.useEffect(() => {
    let cracker = new Cracker()
    setCracker(cracker)
    cracker.crack(iv, cipher, challenge)
      .then((result) => setCrackResult(result))
  }, [])

  return (
    <Box flexDirection="column">
      {
        blocks.map((v, i) => (
          <Block cracker={cracker} block={i} key={i} />
        ))
      }
      <Divider />
      {
        crackResult.plain
          ? <Result plain={crackResult.plain} />
          : <Messages />
      }
      <Divider />
    </Box>
  )
}

module.exports = App
