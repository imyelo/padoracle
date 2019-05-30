const React = require('react')
const { Box } = require('ink')
const pkcs7 = require('pkcs7')
const jsx = require('import-jsx')
const Cracker = require('../..')
const EVENTS = Cracker.EVENTS

const Block = jsx('./components/Block')
const Divider = jsx('./components/Divider')
const { Messages } = jsx('./components/Messages')

const Result = ({ iv, cipher }) => {
  return (
    <div>
      <Box>IV (hex): {iv.toString('hex')}</Box>
      <Box>Cipher (hex): {cipher.toString('hex')}</Box>
      <Box>IV-Cipher (base64): {Buffer.concat([iv, cipher]).toString('base64')}</Box>
    </div>
  )
}

function App({ challenge, size, plain }) {
  const [cracker, setCracker] = React.useState()
  const [result, setResult] = React.useState()
  const [block, setBlock] = React.useState()

  React.useEffect(() => {
    let cracker = new Cracker()
    setCracker(cracker)
    cracker.broadcast.addListener(EVENTS.CRACK_BLOCK_START, ({ iv, cipher, block }) => {
      setBlock({ iv, cipher, block })
    })
    cracker.modify(plain, size, challenge).then(result => setResult(result))
  }, [])

  return (
    <Box flexDirection="column">
      {
        result
          ? <Result {...result} />
          : <div>
            <Block cracker={cracker} {...block} />
            <Divider />
            <Messages length={1} />
          </div>
      }
      <Divider />
    </Box>
  )
}

module.exports = App
