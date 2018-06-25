#!/usr/bin/env node

var ddatabase = require('@ddatabase/core')
var ddrive = require('@ddrive/core')
var dwRem = require('@dwcore/rem')
var flock = require('@flockcore/revelation')
var dwse = require('@dwcore/dwse')
var dPackStorage = require('@dpack/dPackStorage')
var minimist = require('minimist')
var path = require('path')

var argv = minimist(process.argv.slice(2))
var validate = /^(dweb:\/\/)?([a-fA-F0-9]{64})(\/)?$/
var key = argv._[0] && (argv._[0].match(validate) || [])[2]
var folder = argv.out || argv.o || '.'

if (!key) {
  console.error('Usage: dpack-vault-sync [vaultr-key]')
  process.exit(1)
}

var changes = ddatabase(dwRem, key, {valueEncoding: 'json'})
var sharing = {}
var ignoring = [].concat(argv.ignore || argv.i || [])

dwse(changes.createReadStream({live: true}), update)

changes.on('ready', function () {
  flock(changes, {dht: false, live: true})
})

function update (data, cb) {
  if (data.type !== 'add' || typeof data.key !== 'string') return cb()
  if (ignoring.indexOf(data.key) > -1) return cb()
  if (sharing[data.key]) return cb()
  sharing[data.key] = true

  var id = Buffer.from(data.key, 'hex')
  if (argv.bytes) id = id.slice(0, argv.bytes)
  var dir = path.join(folder, id.toString('hex'))

  var drive = ddrive(dPackStorage(dir), data.key, {
    latest: true
  })

  drive.on('ready', function () {
    console.log('Syncing with dWeb ' + drive.key.toString('hex') + ' to ' + dir)
    flock(drive, {live: true})
  })

  cb(null)
}
