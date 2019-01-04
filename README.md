# node-module-resolution
Use to make your own amazing module loaders.

Implements the "spec" defined in the [node docs](https://nodejs.org/dist/latest-v10.x/docs/api/modules.html#modules_all_together)

and passes node core's own tests!

```typescript
import {NodeModuleResolution} from 'node-module-resolution'

const files = new Map([
    ['/node_modules/a-module/package.json',{getData:()=>Buffer.from('{"main":"seahorse.js"}')}],
    ['/node_modules/a-module/seahorse.js',{getData:()=>Buffer.from("console.log('javascript')")}]
])

let nmr = new NodeModuleResolution(files)
let result = nmr.resolve('a-module')

console.log('should resolve seahorse by reading main. ',result)
```

## todo

- make more amazing test suite for this.
- examples
- everything else

## notes

This is not an official google product.
