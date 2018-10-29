
//Flags: --preserve-symlinks-main

const assert = require('assert')
assert(process.execArgv.indexOf('--preserve-symlinks-main') > -1,'missing --preserve-symlinks-main')
assert.strictEqual(require('./f'),'bf')

