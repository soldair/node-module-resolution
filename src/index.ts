// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// tslint:disable-next-line
const Module = require('module');

import * as path from 'path';

export class NodeModuleResolution {
  fileMap: FileMap;
  pathCache: Map<string, string>;
  mainCache: Map<string, string|boolean>;
  extensions: string[];
  // pathRoot: string;

  constructor(fileMap: FileMap, options?: NodeModuleResolutionOptions) {
    // the thing we "read" files from. we only need to read "package.json"s in
    // this class
    this.fileMap = fileMap;
    // this holds the cache of request and requester file path to the file name
    // we've resolved request === require({this stuff is the request}) // the
    // file out here is the "parent"
    this.pathCache = new Map();
    // cache of resolved main fields from package.json reads.
    this.mainCache = new Map();
    // we'll only process these extensions and no extension at all.
    this.extensions = Object.keys(Module._extensions);
    // never resolve paths outside of this root.
    // this.pathRoot = pathRoot;
  }

  resolve(request: string, parent?: Parent, isMain?: boolean): string|false {
    if (!parent) {
      // make fake parent!.
      parent = {id: '.', paths: Module._nodeModulePaths(process.cwd())};
    }

    // todo: _resolveFileName calls _findPath which caches items with all of
    // their
    // search paths.

    const cacheKey = request + '\0' + parent.id;
    if (this.pathCache.has(cacheKey)) {
      return this.pathCache.get(cacheKey) || false;
    }

    let resolved: string|false = false;
    if (path.isAbsolute(request) || isRelative(request)) {
      const file = path.resolve(path.dirname(parent.id), request);
      resolved = this.loadAsFile(file);
      if (!resolved) resolved = this.loadAsDirectory(file);

    } else {
      resolved = this.loadNodeModules(request, path.dirname(parent.id));
    }

    // todo: cache the misses
    if (resolved) {
      this.pathCache.set(cacheKey, resolved as string);
    }

    return resolved;
  }

  loadAsFile(file: string, exactMatch = true) {
    const map = this.fileMap;
    if (exactMatch && map.has(file)) {
      return this.tryRealpath(file);
    }
    for (let i = 0; i < this.extensions.length; ++i) {
      const ext = this.extensions[i] || '';
      if (map.has(file + ext)) {
        const retPath = this.tryRealpath(file + ext);
        // this should never return false if map.has the key but we'll reserve
        // the decision for the implementor. this goes back to the question
        // about if i should support a realpath that doesn't throw.
        if (retPath) {
          return retPath;
        }
      }
    }
    return false;
  }

  // load index will never load a file called 'index' otherwise its the same as
  // load file
  loadAsIndex(file: string) {
    const map = this.fileMap;
    file = path.join(file, 'index');
    return this.loadAsFile(file, false);
  }

  loadAsDirectory(requestPath: string) {
    // if this directory exists lets make sure we've found its realpath.
    const resolvedPath = this.tryRealpath(requestPath);
    if (resolvedPath) requestPath = resolvedPath;

    const jsonPath = path.join(requestPath, 'package.json');

    if (this.mainCache.has(jsonPath)) {
      return this.mainCache.get(jsonPath) as string;
    }

    // if package.json is a link its ignored completely.
    // this is why we dont want to resolve realpath
    // TODO: is this true with preserveSymlinks?
    const packageJson = this.fileMap.get(jsonPath);

    if (packageJson) {
      const parsed = gentleJson(packageJson.getData());
      if (parsed && parsed.main) {
        // yes the main can really be outside the project
        const mainPath = path.resolve(requestPath, parsed.main);

        let retPath = this.loadAsFile(mainPath);
        if (!retPath) {
          retPath = this.loadAsIndex(mainPath);
        }
        if (retPath) {
          this.mainCache.set(jsonPath, retPath);
          return retPath;
        }
      }
    }
    const asIndex = this.loadAsIndex(requestPath);
    this.mainCache.set(jsonPath, asIndex || false);
    return asIndex;
  }

  tryRealpath(requestPath: string) {
    const entry = this.fileMap.get(requestPath);
    if (entry) {
      if (entry.realpath) {
        const resolvedPath = entry.realpath(requestPath);
        // TODO: decide if it has a realpath function it must return a string or
        // throw?
        if (resolvedPath) requestPath = resolvedPath;
      }
      return requestPath;
    }
    return false;
  }

  loadNodeModules(name: string, dir: string) {
    const paths = NodeModuleResolution.nodeModulePaths(dir);
    for (let i = 0; i < paths.length; ++i) {
      // only scan for files under pathRoot
      // if (paths[i].indexOf(this.pathRoot) !== 0) {
      //  break;
      //}

      const file = path.join(paths[i], name);
      // support single file modules.
      let retPath = this.loadAsFile(file);
      if (retPath) return retPath;
      retPath = this.loadAsDirectory(file);
      if (retPath) return retPath;
    }
    return false;
  }

  static nodeModulePaths(dir: string) {
    // todo
    return Module._nodeModulePaths(dir);
  }
}

export const isRelative = (filename: string) => {
  const DOT = '.';
  const F_SLASH = '/';
  const B_SLASH = '\\';

  const first = filename.charAt(0);
  const second = filename.charAt(1);
  const third = filename.charAt(2);
  if (first === DOT &&
      ((second === DOT && third === F_SLASH) || second === F_SLASH)) {
    return true;
  }
  if (first === DOT &&
      ((second === DOT && third === B_SLASH) || second === B_SLASH)) {
    return true;
  }
  return false;
};

export const gentleJson = (s?: string|Buffer) => {
  if (!s) return;
  if (Buffer.isBuffer(s)) s = s.toString();
  try {
    return JSON.parse(s);
  } catch (e) {
  }
};

export interface FileMap {
  has(file: string): boolean;
  get(file: string): FileObject|undefined;
}

export interface FileObjectNotLinked {
  getData: () => Buffer;
}

export interface FileObject {
  getData: () => Buffer | undefined;
  realpath?: (filename?: string) =>
      string;  // todo. think about taking path argument is good.
}

export interface Parent {
  id: string;
  filename?: string;
  paths: string[];
  children?: Parent[];
  loaded?: boolean;
}

export interface NodeModuleResolutionOptions {
  preserveSymlinks?: boolean;
  preserveSymLinksMain?: boolean;
}
