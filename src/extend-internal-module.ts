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

// mostly copied from https://github.com/nodejs/node
// lib/internal/modules/cjs/loader.js modified to expose the minimal global
// loader hook api.
import * as path from 'path';
import * as util from 'util';

import {Parent} from './index';

// tslint:disable-next-line
const Module = require('module')
const debug = util.debuglog('nmr-extend');

const EXTENDED_MODULE_LOADERS = Symbol.for('node-module-resolution-loaders');

/*
let runMain = Module.runMain
Module.runMain = function(){
  return runMain.apply(this,arguments)
}
*/

const originalLoad = Module._load;
const loaders: Set<Loader> = new Set();

const builtInModules =
    new Map(Module.builtinModules.map((s: string) => [s, 1]));


// add a new loader.
export const register = (loader: Loader) => {
  if (loaders.has(loader)) {
    throw new Error(
        'double registration. not sure if this is helpful or it should be ignored');
  }
  loaders.add(loader);
  // loader should
};

// helper to call built in's from typescript.
export const callGlobalExtensionHandler =
    (module: Parent, filename: string, extension: string) => {
      const handlers = Module._extensions as
          {[extension: string]: (module: Parent, filename: string) => void};

      if (!handlers[extension]) {
        // this should only be implementation error. the default is .js
        throw new Error(
            'global extension handler doesn\'t exist for ' + extension);
      }

      handlers[extension](module, filename);
    };


module.exports.loaders = loaders;
module.exports.fallback = true;

// note: each loader which uses this will need to register itself and they may
// depend on their own version of this. supporting multiple stacked versions of
// this is a normal thing.

Module._load = (request: string, parent: Parent, isMain: boolean) => {
  // TODO:  if isMain i need to async init all the loaders.

  // if internal we just pass directly to orig load.
  if (builtInModules.has(request)) {
    return originalLoad(request, parent, isMain);
  }

  if (request.indexOf('internal/') === 0) {
    return originalLoad(request, parent, isMain);
  }

  if (path.extname(request) === '.mjs') {
    return originalLoad(request, parent, isMain);
  }

  if (parent) {
    debug('Module._load REQUEST %s parent: %s', request, parent.id);
  }
  const resolveContext = {};
  let filename, loader;
  for (loader of loaders) {
    filename =
        loader.resolve(request, parent, isMain, resolveContext) as string;
    if (filename) break;
  }

  if (!filename || !loader) {
    if (exports.fallback) {
      return originalLoad(request, parent, isMain);
    }
    // TODO: use real node error.
    throw new Error('failed to resolve ' + request + ' from ' + parent.id);
  }

  const cachedModule = Module._cache[filename];
  if (cachedModule) {
    updateChildren(parent, cachedModule, true);
    return cachedModule.exports;
  }

  // Don't call updateChildren(), Module constructor already does.
  const module = new Module(filename, parent);

  if (isMain) {
    process.mainModule = module;
    module.id = '.';
  }
  module.filename = filename;
  module.paths = Module._nodeModulePaths(path.dirname(filename));

  Module._cache[filename] = module;

  tryModuleLoad(loader, module, filename, resolveContext);

  return module.exports;
};

function updateChildren(parent: Parent, child: Parent, scan: boolean) {
  const children = parent && parent.children;
  if (children && !(scan && children.includes(child))) {
    children.push(child);
  }
}

function tryModuleLoad(
    loader: Loader, module: Parent, filename: string,
    // tslint:disable-next-line:no-any
    resolveContext: {[k: string]: any}) {
  let threw = true;
  try {
    // note:  copied here from Module.prototype.load.
    let extension = path.extname(filename) || '.js';
    if (!Module._extensions[extension]) extension = '.js';

    // if your loader supports something like .ts you'll just not use the
    // extension passed in.
    loader.compile(module, filename, extension, resolveContext);

    module.loaded = true;

    threw = false;
  } finally {
    if (threw) {
      delete Module._cache[filename];
    }
    // note: node core does not remove failed modules from parent.children
  }
}

export interface Loader {
  // when we're asked to load main
  // we await all of the loader init's that exist.
  // if a loader has an init, and is added after main has been run, we throw.
  init?: () => Promise<boolean>;
  // return a string that maps to module given parent module.
  resolve(
      request: string, parent?: Parent, isMain?: boolean,
      // tslint:disable-next-line:no-any
      resolveContext?: {[k: string]: any}): string|false;
  // pass the module's actual pending module object and the filename.
  compile(
      module: Parent, filename: string, extension: string,
      // tslint:disable-next-line:no-any
      resolveContext?: {[k: string]: any}): any;
}