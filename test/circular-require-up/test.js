
const assert = require('assert')


assert.deepStrictEqual(require('c'),{c:{}},'returns unintialized module on circular ref')
