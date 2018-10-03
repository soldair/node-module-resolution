const assert = require('assert')

assert.strictEqual(require('./file.js'),'a','does resolves symlinks for requires in main')

