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

Also creates a generic hook to add user land loaders! 

```typescript
import {registerLoader,globalExtensionHandler} from 'node-module-resolution'

registerLoader({
  // return a string that maps to module given parent module.
  resolve:(request, parent, isMain,resolveContext)=>{
    // resolve every require to the string lolz.js
    // this impacts the cache key for the module. a module will only be loaded once by key/filename
    resolveContext.apples = 1
    return "lolz.js"
  },
  // pass the module's actual pending module object and the filename.
  compile:(module, filename, extension,resolveContext)=>{
    console.log(resolveContext) // {apples:1}
    // module is the uninitialized module object. 
    console.log(module.id) // lolz.js
    // call the default extension habndler for this script.
    // this is what you're likely to do if you'ed like to load source from disk and support user extension handlers
    globalExtensionHandler(module, filename, extension);
    // or load this yourself.
    //module._compile(filename,source)
  }
})
```

## todo

- make more amazing test suite for this.
- examples
- everything else

## notes

This is not an official google product.
