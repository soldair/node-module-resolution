
const assert = require('assert')

assert.strictEqual(require('./a'),'a','can relative require directory')
assert.strictEqual(require('./a/b'),'a/b.js','can relative require file without extension')
assert.strictEqual(require('./a/c.js'),'a/c.js','can relative require file with extension')
