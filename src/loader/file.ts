import * as fs from 'fs';

import {FileObject, NodeModuleResolution} from '../';

// a drop in replacement for nodes existing built in cjs loader.

const fsLookup = {
  has: (file: string): boolean => {
    return fs.lstatSync(file) && true || false;
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
