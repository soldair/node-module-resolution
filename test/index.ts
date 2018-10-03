import * as assert from 'assert';

import {FileObject, NodeModuleResolution} from '../src/index';

describe('node-module-resolution main export', () => {
  it('resolves path from files map', () => {
    const files = new Map([
      file('/node_modules/a-module/package.json', '{"main":"seahorse.js"}'),
      file('/node_modules/a-module/seahorse.js', 'console.log(\'javascript\')')
    ]);

    const nmr = new NodeModuleResolution(files);
    const result = nmr.resolve('a-module');
    assert.strictEqual(result, '/node_modules/a-module/seahorse.js');
  });

  it('can play nice', () => {
    const files = new Map([
      file('/node_modules/a-module/package.json', '{"main":"seahorse.js"}'),
      file('/node_modules/a-module/seahorse.js', 'console.log(\'javascript\')')
    ]);

    const nmr = new NodeModuleResolution(files);
  });
});

const file = (path: string, content?: string, realpath?: string):
    [string, FileObject] => {
      return [
        path, {getData: () => content ? Buffer.from(content) : undefined}
        //, realpath?:()=>{}
      ];
    };