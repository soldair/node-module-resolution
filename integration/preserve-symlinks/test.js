//Flags: --preserve-symlinks
const assert = require('assert')
assert.strictEqual(require('./b/index.js'),'bf')