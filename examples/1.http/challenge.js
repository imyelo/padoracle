const got = require('got')

const PORT = process.env.PORT || 3000
const ENDPOINT = `http://localhost:${PORT}`

const DECRYPTION_ERROR = 'Unable to decrypt'

const challenge = async (iv, cipher) => {
  let response = await got.post(`${ENDPOINT}/flag`, {
    body: Buffer.concat([iv, cipher]).toString('base64'),
  }).catch((error) => error.response)
  if (response.body === DECRYPTION_ERROR) {
    return false
  }
  return true
}

export default challenge
