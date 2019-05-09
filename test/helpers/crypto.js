const crypto = require('crypto')

class Crypto {
  constructor (key, algorithm = `aes-${key.length * 8}-cbc`) {
    this.key = key
    this.algorithm = algorithm
  }

  encrypt (iv, plain) {
    let cipher = crypto.createCipheriv(this.algorithm, this.key, iv)
    return Buffer.concat([cipher.update(plain), cipher.final()])
  }

  decrypt (iv, cipher) {
    let decipher = crypto.createDecipheriv(this.algorithm, this.key, iv)
    return Buffer.concat([decipher.update(cipher), decipher.final()])
  }
}

exports.Crypto = Crypto
