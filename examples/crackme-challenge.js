const crackme = require('./crackme')

const challenge = async (iv, cipher) => {
  try {
    await crackme.api.auth(Buffer.concat([iv, cipher]).toString('base64'))
  } catch (error) {
    return false
  }
  return true
}

export default challenge
