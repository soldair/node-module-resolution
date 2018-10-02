
const assert = require('assert')

assert.strictEqual(require('./a'),'b','should load module b by way of a\'s node_modules ')
