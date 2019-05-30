const { Crypto } = require('../../common/crypto')
const delay = require('delay')

const DELAY = process.env.DELAY || 1

const crackme = (() => {
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

  return {
    api: {
      welcome () {
        return createToken()
      },
      async auth (token) {
        if (DELAY) {
          await delay(DELAY)
        }
        return getSession(token)
      },
      BLOCK_SIZE,
    },
    verifyPlainText (session) {
      return session === DEFAULT_SESSION
    },
  }
})()

module.exports = crackme
