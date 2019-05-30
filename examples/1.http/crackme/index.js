const micro = require('micro')
const { Crypto } = require('../../common/crypto')

const PORT = process.env.PORT || 3000

const KEY = Buffer.from('abcdefghijklmnopqrstuvwxyz123456')
const DEFAULT_IV = Buffer.from('PadOracle:iv/cbc')
const BLOCK_SIZE = DEFAULT_IV.length

const DEFAULT_SESSION = '{"id":100,"roleAdmin":false}'

const crypto = new Crypto(KEY)

function createToken (session = DEFAULT_SESSION, iv = DEFAULT_IV) {
  const cipher = crypto.encrypt(iv, session)
  return `${Buffer.concat([iv, cipher]).toString('base64')}`
}

function getSession (token) {
  let buf = Buffer.from(token, 'base64')
  let iv = buf.slice(0, BLOCK_SIZE)
  let cipher = buf.slice(BLOCK_SIZE)
  return crypto.decrypt(iv, cipher).toString('utf8')
}

const handleErrors = fn => async (req, res) => {
  try {
    return await fn(req, res)
  } catch (err) {
    micro.send(res, err.statusCode, err.message)
  }
}

const app = async (req) => {
  if (req.url === '/token') {
    return createToken()
  }
  if (req.url === '/flag' && req.method === 'POST') {
    let body = await micro.text(req)
    let session
    try {
      session = getSession(body)
    } catch (error) {
      throw micro.createError(400, 'Unable to decrypt')
    }
    try {
      session = JSON.parse(session)
    } catch (error) {
      throw micro.createError(400, 'Unable to parse JSON')
    }
    if (!session.roleAdmin) {
      throw micro.createError(401, 'Unauthorized')
    }
    return '{FLAG}'
  }
  throw micro.createError(404, 'Not found')
}

const server = micro(handleErrors(app))

server.listen(PORT, () => {
  console.log(`\nServer is running on ${PORT}`)
  console.log('\nApi:')
  console.log(`1. Get token: \`curl http://localhost:${PORT}/token\``)
  console.log(`2. Get flag: \`curl -X POST http://localhost:${PORT}/flag -d {token}`)
  console.log('\nExample:')
  console.log(`curl -X POST http://localhost:${PORT}/flag -d $(curl http://localhost:${PORT}/token -s)`)
})
