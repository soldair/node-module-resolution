import * as assert from 'assert';

import {FileObject, isRelative, NodeModuleResolution} from '../src/index';

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

  it('resolves index.js from directory with invalid package.json', () => {
    const files = new Map([
      file('/b/index.js', 'index'), file('/b/package.json', 'not valid json')
    ]);

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

  it('caches resolves', () => {
    const files = new Map([file('/node_modules/b/index.js', 'b index')]);

    const nmr = new NodeModuleResolution(files);

    assert.ok(!nmr.pathCache.has('b\0.'), 'should not have cache entry');

    nmr.resolve('b');
    const result = nmr.resolve('b');

    console.log(Array.from(nmr.pathCache));
    assert.ok(nmr.pathCache.has('b\0.'), 'should have cache entry');
  });

  it('caches json parses', () => {
    let calls = 0;
    // because it also caches paths we have to get at the same module from 2
    // different directions.
    const files = new Map([
      file('/node_modules/b/main.js', 'b main'),
      [
        '/node_modules/b/package.json', {
          getData: () => {
            calls++;
            return Buffer.from('{"main":"main"}');
          }
        }
      ],
    ]);

    const nmr = new NodeModuleResolution(files);
    const result = nmr.resolve('b', {id: '/bbbb/index.js', paths: []});
    const result2 = nmr.resolve('b', {id: '/aaaa/index.js', paths: []});

    assert.strictEqual(result, '/node_modules/b/main.js');
    assert.strictEqual(result2, '/node_modules/b/main.js');
    assert.strictEqual(calls, 1);
    assert.strictEqual(Array.from(nmr.pathCache).length, 2);
  });

  it('resolves main/index.js when main points to directory', () => {
    const files = new Map([
      file('/node_modules/a-module/package.json', '{"main":"seahorse"}'),
      file('/node_modules/a-module/seahorse/index.js', 'index yay')
    ]);

    const nmr = new NodeModuleResolution(files);
    const result = nmr.resolve('a-module');
    assert.strictEqual(result, '/node_modules/a-module/seahorse/index.js');
  });
});

describe('node-module-resolution fails', () => {
  it('fails to resolve node_modules in node_modules from file module', () => {
    const files = new Map([file(
        '/node_modules/borp/node_modules/node_modules/b/index.js', 'b index')]);

    const nmr = new NodeModuleResolution(files);
    const result = nmr.resolve(
        'b', {id: '/node_modules/borp/node_modules/a.js', paths: []});

    assert.strictEqual(result, false);
  });
});

describe(
    'custom features',
    () => {
        // it('wont resolve anything out of specified "root"',()=>{
        //})
        /*
          it('can avoid json parse if an object is returned from getData',
          () => {

          });*/
    });

describe('utilities', () => {
  it('find relative paths', () => {
    assert.ok(isRelative('./'));
    assert.ok(isRelative('../'));
    assert.ok(isRelative('.\\'));
    assert.ok(isRelative('..\\'));
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