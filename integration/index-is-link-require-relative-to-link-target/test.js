
const assert = require('assert')

assert.strictEqual(require('./a'),'b','if index.js is a link requires are resolved relative to the link target')
