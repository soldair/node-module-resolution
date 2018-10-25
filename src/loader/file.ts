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

import * as fs from 'fs';

import {FileObject, NodeModuleResolution, Parent} from '../';

import * as extendModule from '../extend-internal-module';

// a drop in replacement for nodes existing built in cjs loader.
console.log('USING FILE LOADER')
const fsLookup = {
  has: (file: string): boolean => {
    let stat;
    try {
      stat = fs.statSync(file);
    } catch (e) {
    }
    //console.log('FL:has',file)
    return stat ? stat.isFile() : false;
  },
  get: (file: string): FileObject | undefined => {
    //console.log('FL:get',file)
    if (!fs.existsSync(file)) return undefined;
    return new File(file);
  }
};

class File implements FileObject {
  file: string;

  constructor(file: string) {
    this.file = file;
  }

  getData() {
    return fs.readFileSync(this.file);
  }

  realpath() {
    return fs.realpathSync(this.file);
  }
}

const nmr = new NodeModuleResolution(fsLookup);

extendModule.register({
  resolve: (request, parent, isMain) => {
    //console.log('FL:resolve',request,parent,isMain)
    return nmr.resolve(request, parent, isMain);
  },
  compile: (module: Parent, filename: string, extension: string) => {
    // call built in Module._extensions
    extendModule.callGlobalExtensionHandler(module, filename, extension);
  }
});
