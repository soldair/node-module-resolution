
const assert = require('assert')

assert.strictEqual(require('./a/lib/bib/lib/index.js'),'b','should be able to require file through link')
assert.strictEqual(require('./a/lib/bib/lib/index.js'),'b','should be able to require file through link')
assert.strictEqual(global.c,1,'should have only created one module.')
