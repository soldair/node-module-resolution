import * as assert from 'assert';

import {FileObject, NodeModuleResolution} from '../src/index';

describe('node-module-resolution', () => {
  it('resolves path from files map', () => {
    const files = new Map([
      file('/node_modules/a-module/package.json', '{"main":"seahorse.js"}'),
      file('/node_modules/a-module/seahorse.js', 'console.log(\'javascript\')')
    ]);

    const nmr = new NodeModuleResolution(files);
    const result = nmr.resolve('a-module');
    assert.strictEqual(result, '/node_modules/a-module/seahorse.js');
  });

  it('resolves linked files to realpath', () => {
    const files =
        new Map([file('/b.js', 'b!'), file('/a/b.js', undefined, '/b.js')]);

    const nmr = new NodeModuleResolution(files);
    const result = nmr.resolve('/a/b.js');
    assert.strictEqual(result, '/b.js');
  });

  it('resolves main realpath when main is a link', () => {
    const files = new Map([
      file('/node_modules/a-module/package.json', '{"main":"seahorse.js"}'),
      file('/node_modules/a-module/seahorse.js', undefined, '/spaceship.js'),
      file('/spaceship.js', 'space seahorse')
    ]);

    const nmr = new NodeModuleResolution(files);
    const result = nmr.resolve('a-module');
    assert.strictEqual(result, '/spaceship.js');
  });

  it('resolves index.js from directory without package.json', () => {
    const files = new Map([
      file('/b/index.js', 'index'),
    ]);

    const nmr = new NodeModuleResolution(files);
    const result = nmr.resolve('/b');
    assert.strictEqual(result, '/b/index.js');
  });

  it('resolves index.js from directory with package.json', () => {
    const files =
        new Map([file('/b/index.js', 'index'), file('/b/package.json', '{}')]);

    const nmr = new NodeModuleResolution(files);
    const result = nmr.resolve('/b');
    assert.strictEqual(result, '/b/index.js');
  });

  it('resolves single file module', () => {
    const files = new Map([
      file('/node_modules/a.js', ''),
    ]);

    const nmr = new NodeModuleResolution(files);
    const result = nmr.resolve('a');
    assert.strictEqual(result, '/node_modules/a.js');
  });

  it('resolves node_modules at the same level as a single file module', () => {
    const files = new Map(
        [file('/node_modules/borp/node_modules/b/index.js', 'b index')]);

    const nmr = new NodeModuleResolution(files);
    const result = nmr.resolve(
        'b', {id: '/node_modules/borp/node_modules/a.js', paths: []});

    assert.strictEqual(result, '/node_modules/borp/node_modules/b/index.js');
  });

  it('resolves from parents node_modules', () => {
    const files = new Map([file('/node_modules/b/index.js', 'b index')]);

    const nmr = new NodeModuleResolution(files);
    const result =
        nmr.resolve('b', {id: '/node_modules/borp/index.js', paths: []});

    assert.strictEqual(result, '/node_modules/b/index.js');
  });
});

const file = (path: string, content?: string, realpath?: string): [
  string, FileObject
] => {
  const file = {getData: () => content ? Buffer.from(content) : undefined} as
      FileObject;
  if (realpath) file.realpath = () => realpath;

  return [path, file];
};