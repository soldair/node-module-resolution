/**
 * @fileoverview Description of this file.
 */

const assert = require('assert')
assert.strictEqual(require('./c'),'a','package.json is ignored when requiring a directory and  it\'s a symlink to a package.json in another directory ')
