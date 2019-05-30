#!/usr/bin/env node

const { resolve } = require('path')
const React = require('react')
const { render } = require('ink')
const meow = require('meow')
const esm = require('esm')
const jsx = require('import-jsx')

const ui = jsx('./ui')

const MODE = {
  CRACK: 'CRACK',
  MODIFY: 'MODIFY',
}

;(() => {
  const cli = meow(`
    Usage
      $ padoracle <challenge-script> --iv-cipher <iv-cipher> --size 16

    Common Options
      challenge-script     A script which sends the decryption challenge to the target system.
      --size, -s           Size of each block (in bytes).

    Crack-Mode Options
      --iv-cipher          An iv-cipher pair which can pass the padding check (with base64 encoded).
      --concurrency, -c    Concurrency, Infinity by default.

    Modify-Mode Options
      --plain, -p          Target plain text.

    Examples
      $ padoracle ./examples/crackme-challenge.js --iv-cipher UGFkT3JhY2xlOml2L2NiYyiFmLTj7lhu4mAJHakEqcIIoYU0lIUXKx+PmTaUHLV0 --size 16
      $ padoracle ./examples/crackme-challenge.js --size 16 --plain "{\\"id\\":1,\\"roleAdmin\\":true,\\"name\\":\\"yelo\\",\\"url\\":\\"https://yelo.cc\\"}"
  `, {
    flags: {
      ivCipher: {
        type: 'string',
      },
      size: {
        type: 'string',
        alias: 's',
      },
      concurrency: {
        type: 'string',
        alias: 'c',
      },
      plain: {
        type: 'string',
        alias: 'p',
      },
    },
  })

  let mode = cli.flags.plain ? MODE.MODIFY : MODE.CRACK

  if (!cli.input.length) {
    return cli.showHelp()
  }

  const script = esm(module)(resolve(process.cwd(), cli.input[0]))
  if (!script || !script.default) {
    throw new Error('Invalid challenge script.')
  }

  const size = +cli.flags.size
  if (!size) {
    throw new Error('<size> is required.')
  }

  if (mode === MODE.CRACK) {
    if (!cli.flags.ivCipher) {
      throw new Error('<iv-cipher> is required.')
    }
    const token = Buffer.from(cli.flags.ivCipher, 'base64')

    const iv = token.slice(0, size)
    const cipher = token.slice(size)

    const concurrency = +cli.flags.concurrency || Infinity

    render(React.createElement(ui, { challenge: script.default, iv, cipher, concurrency }))
  } else {
    if (!cli.flags.plain) {
      throw new Error('<plain> is required.')
    }
    const plain = cli.flags.plain
    console.log(plain)

    // TODO
  }
})()
