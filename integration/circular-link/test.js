
const assert = require('assert')


assert.throws(()=>require('./a'),'circular links fail')
