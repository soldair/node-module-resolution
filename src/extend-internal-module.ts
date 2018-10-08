// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// mostly copied from https://github.com/nodejs/node lib/internal/modules/cjs/loader.js
// modified to expose the minimal global loader hook api.
import {Parent} from './index'
import * as path from 'path'
import * as util from 'util';

//tslint:disable-next-line
const Module = require('module')
const {NativeModule } = require('internal/bootstrap/loaders');
const debug = util.debuglog('nmr-extend');

const EXTENDED_MODULE_LOADERS = Symbol.for('node-module-resolution-loaders')

const originalLoad = Module._load
const loaders:Set<Loader> = new Set()


// add a new loader.
export const register = (loader:Loader)=>{
  if(loaders.has(loader)){
    throw new Error('double registration. not sure if this is helpful or it should be ignored')
  }
  loaders.add(loader)
  // loader should 
}

// helper to call built in's from typescript.
export const callGlobalExtensionHandler = (module:Parent,filename:string,extension:string)=>{
  let handlers = Module._extensions as {[extension:string]:(module:Parent,filename:string)=>void}
  
  if(!handlers[extension]){
    // this should only be implementation error. the default is .js
    throw new Error('global extension handler doesn\'t exist for ' + extension)  
  }

  handlers[extension](module,filename);
}


module.exports.loaders = loaders
module.exports.fallback = true

//note: each loader which uses this will need to register itself and they may depend on their own version of this.
//supporting multiple stacked versions of this is a normal thing.

Module._load = (request:string, parent:Parent, isMain:boolean)=>{

  // if isMain i need to init all the loaders.
  // some may need to be

  if (parent) {
    debug('Module._load REQUEST %s parent: %s', request, parent.id);
  }

  let filename,loader;
  for(loader of loaders){
    filename = loader.resolve(request,parent,isMain) as string
    if(filename) break;
  }

  if(!filename || !loader){
    if(module.exports.fallback){
      return originalLoad(request,parent,isMain)
    }
    //TODO: use real node error.
    throw new Error("failed to resolve "+request+' from '+parent.id)
  }

  var cachedModule = Module._cache[filename];
  if (cachedModule) {
    updateChildren(parent, cachedModule, true);
    return cachedModule.exports;
  }

  if (NativeModule.nonInternalExists(filename)) {
    debug('load native module %s', request);
    return NativeModule.require(filename);
  }

  // Don't call updateChildren(), Module constructor already does.
  var module = new Module(filename, parent);

  if (isMain) {
    process.mainModule = module;
    module.id = '.';
  }

  Module._cache[filename] = module;

  tryModuleLoad(loader,module, filename);

  return module.exports;
}

function updateChildren(parent:Parent, child:Parent, scan:boolean) {
  var children = parent && parent.children;
  if (children && !(scan && children.includes(child)))
    children.push(child);
}

function tryModuleLoad(loader:Loader,module:Parent, filename:string) {
  var threw = true;
  try {
    //note:  copied here from Module.prototype.load.
    var extension = path.extname(filename) || '.js';
    if (!Module._extensions[extension]) extension = '.js';

    // if your loader supports something like .coffee you'll just not use the extension passed in.
    loader.compile(module,filename,extension)

    module.loaded = true;

    threw = false;
  } finally {
    if (threw) {
      delete Module._cache[filename];
    }
    //note: node core does not remove failed modules from parent.children
  }
}

export interface Loader{
    // when we're asked to load main
    // we await all of the loader init's that exist.
    // if a loader has an init, and is added after main has been run, we throw.
    init?:()=>Promise<boolean>;
    // return a string that maps to module given parent module.
    resolve(request:string,parent?:Parent,isMain?:boolean):string|false;
    // pass the module's actual pending module object and the filename.
    compile(module:Parent,filename:string,extension:string):any;
}