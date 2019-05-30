const React = require('react')
const { Box } = require('ink')
const pkcs7 = require('pkcs7')
const Cracker = require('../..')
const jsx = require('import-jsx')

const Block = jsx('./components/Block')
const Divider = jsx('./components/Divider')
const { Messages } = jsx('./components/Messages')

const Result = ({ plain }) => {
  return (
    <div>
      <Box>Plain text: {pkcs7.unpad(plain).toString()}</Box>
      <Box>Plain text (hex): {plain.toString('hex')}</Box>
    </div>
  )
}

function App({ challenge, iv, cipher, concurrency }) {
  const [cracker, setCracker] = React.useState()
  const [result, setResult] = React.useState()
  const blocksCount = cipher.length / iv.length

  const blocks = Array.from(new Array(blocksCount))

  React.useEffect(() => {
    let cracker = new Cracker()
    setCracker(cracker)
    cracker.crack(iv, cipher, challenge, concurrency).then(result => setResult(result))
  }, [])

  return (
    <Box flexDirection="column">
      {blocks.map((v, i) => (
        <Block cracker={cracker} block={i} key={i} />
      ))}
      <Divider />
      {result ? <Result {...result} /> : <Messages length={blocksCount} />}
      <Divider />
    </Box>
  )
}

module.exports = App
