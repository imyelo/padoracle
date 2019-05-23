const test = require('ava')
const delay = require('delay')
const pkcs7 = require('pkcs7')
const { Crypto } = require('./helpers/crypto')
const Cracker = require('..')

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
        await delay(1)
        return getSession(token)
      },
      BLOCK_SIZE,
    },
    verifyPlainText (session) {
      return session === DEFAULT_SESSION
    },
  }
})()

test('crack program with aes-256-cbc', async (t) => {
  const token = Buffer.from(crackme.api.welcome(), 'base64')
  const size = crackme.api.BLOCK_SIZE

  const challenge = async (iv, cipher) => {
    try {
      await crackme.api.auth(Buffer.concat([iv, cipher]).toString('base64'))
    } catch (error) {
      return false
    }
    return true
  }

  let result, plain

  let cracker = new Cracker()
  result = await cracker.crack(token.slice(0, size), token.slice(size), challenge)
  plain = pkcs7.unpad(result.plain).toString()

  t.true(crackme.verifyPlainText(plain))
})
