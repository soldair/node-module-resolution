
const assert = require('assert')

assert.strictEqual(require('./a'),'b','if main is a symlink requires are relative to the link targets location')
