import * as fs from 'fs';

import {FileObject, NodeModuleResolution, Parent} from '../';

import * as extendModule from '../extend-internal-module';

// a drop in replacement for nodes existing built in cjs loader.

const fsLookup = {
  has: (file: string): boolean => {
    let stat;
    try {
      // TODO: traverse links? or is the realpath bit enough \/
      stat = fs.lstatSync(file);
    } catch (e) {
    }
    return stat ? stat.isFile() : false;
  },
  get: (file: string): FileObject | undefined => {
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
    return nmr.resolve(request, parent, isMain);
  },
  compile: (module: Parent, filename: string, extension: string) => {
    // call built in Module._extensions
    extendModule.callGlobalExtensionHandler(module, filename, extension);
  }
});
