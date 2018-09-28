import {NodeModuleResolution} from './'

const files = new Map([
    ['/node_modules/a-module/package.json',{getData:()=>Buffer.from('{"main":"seahorse.js"}')}],
    ['/node_modules/a-module/seahorse.js',{getData:()=>Buffer.from("console.log('javascript')")}]
])

let nmr = new NodeModuleResolution(files)
let result = nmr.resolve('a-module',{id:'/a.js',filename:'/a.js',paths:[]})

console.log('should resolve seahorse by reading main. ',result)