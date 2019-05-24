#!/usr/bin/env node

const { resolve } = require('path')
const React = require('react')
const { render } = require('ink')
const meow = require('meow')
const esm = require('esm')
const jsx = require('import-jsx')

const ui = jsx('./ui')

;(() => {
  const cli = meow(`
    Usage
      $ padoracle <challenge-script> --iv-cipher <iv-cipher> --size 16

    Options
      challenge-script  A script which sends the decryption challenge to the target system.
      --iv-cipher       An iv-cipher pair which can pass the padding check (with base64 encoded).
      --size            Size of each block (in bytes).

    Examples
      $ padoracle ./exmaples/crackme-challenge.js --iv-cipher UGFkT3JhY2xlOml2L2NiYyiFmLTj7lhu4mAJHakEqcIIoYU0lIUXKx+PmTaUHLV0 --size 16
  `, {
  flags: {
    ivCipher: {
      type: 'string',
    },
    size: {
      type: 'string',
    },
  },
  })

  if (!cli.input.length) {
    return cli.showHelp()
  }

  const script = esm(module)(resolve(process.cwd(), cli.input[0]))

  if (!script || !script.default) {
    throw new Error('Invalid challenge script.')
  }

  if (!cli.flags.ivCipher) {
    throw new Error('<iv-cipher> is required.')
  }

  const token = Buffer.from(cli.flags.ivCipher, 'base64')
  const size = +cli.flags.size

  if (!size) {
    throw new Error('<size> is required.')
  }

  const iv = token.slice(0, size)
  const cipher = token.slice(size)

  render(React.createElement(ui, { challenge: script.default, iv, cipher }))

})()
