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


const Module = require('module')

import * as path from 'path'

export class NodeModuleResolution {

    fileMap:FileMap;
    pathCache:Map<string,string>;
    mainCache:Map<string,string|boolean>;
    extensions:string[];
    pathRoot: string;

    constructor(fileMap:FileMap,pathRoot:string = '/'){
        // the thing we "read" files from. we only need to read "package.json"s in this class
        this.fileMap = fileMap
        // this holds the cache of request and requester file path to the file name we've resolved
        // request === require({this stuff is the request}) // the file out here is the "parent"
        this.pathCache = new Map()
        // cache of resolved main fields from package.json reads.
        this.mainCache = new Map()
        // we'll only process these extensions and no extension at all.
        this.extensions = Object.keys(Module._extensions);
        // never resolve paths outside of this root.
        this.pathRoot = pathRoot;
    }

    resolve(request: string,parent?:Parent):string|boolean{
        if(!parent) {
            // make fake parent!.
            parent = {id:'main',paths:Module._nodeModulePaths(process.cwd())}
        }

        // _resolveFileName calls _findPath which caches items with all of their search paths.
        // we dont search outside of the zip here and parent id should be enough.
        const cacheKey = request+'\0'+parent.id
        if(this.pathCache.has(cacheKey)){
            return this.pathCache.get(cacheKey)||false
        }

        let resolved;
        if(path.isAbsolute(request) || isRelative(request)){
            let file = path.resolve(path.dirname(parent.id),request)
            resolved = this.loadAsFile(file)
            if(!resolved) resolved = this.loadAsDirectory(file)
        } else {
            resolved = this.loadNodeModules(request,path.dirname(parent.id))
        }

        // todo: cache the misses
        if(resolved){
            this.pathCache.set(cacheKey,resolved as string)
        }

        return resolved;
    }

    loadAsFile(file:string){
        const map = this.fileMap
        if(map.has(file)) return file
        for(let i=0;i<this.extensions.length;++i){
            if(map.has(file+this.extensions[i])) return file+this.extensions[i]
        }
        return false
    }
    
    // load index will never load a file called 'index' otherwise its the same as load file
    loadAsIndex(file:string){
        const map = this.fileMap;
        file = path.join(file,'index')
        for(let i=0;i<this.extensions.length;++i){
            if(map.has(file+this.extensions[i])) return file+this.extensions[i]
        }
        return false
    }
    
    loadAsDirectory(requestPath:string){
        let jsonPath = path.join(requestPath,'package.json')
        
        if(this.mainCache.has(jsonPath)) {
            return this.mainCache.get(jsonPath) as string
        }
    
        let packageJson = this.fileMap.get(jsonPath)
        if(packageJson){
    
            let parsed = gentleJson(packageJson.getData().toString('utf8'))

            if(parsed && parsed.main) {
    
                // yes the main can really be outside the project
                let mainPath = path.resolve(requestPath,parsed.main)
    
                let retPath = this.loadAsFile(mainPath)
                if(!retPath){
                    retPath = this.loadAsIndex(mainPath)
                }
                if(retPath) {
                    this.mainCache.set(jsonPath,retPath)
                    return retPath
                }
            }
        }
        let asIndex = this.loadAsIndex(requestPath)
        this.mainCache.set(jsonPath,asIndex||false)
        return asIndex
    }
    
    loadNodeModules(name:string,dir:string){
        let paths = Module._nodeModulePaths(dir)
        for(let i=0;i<paths.length;++i){
            // only scan for files under pathRoot
            if(paths[i].indexOf(this.pathRoot) !== 0) {
                break;
            }
            
            let file = path.join(paths[i],name)
            let retPath = this.loadAsFile(file)
            if(retPath) return retPath
            retPath = this.loadAsDirectory(file)
            if(retPath) return retPath
        }
        return false
    }
}

export const isRelative = (filename: string) => {
    const DOT = '.'
    const F_SLASH = '/'
    const B_SLASH = '\\'

    let first = filename.charAt(0)
    let second = filename.charAt(1)
    let third = filename.charAt(2)
    if(first === DOT && ((second === DOT && third === F_SLASH)|| second === F_SLASH )) return true
    if(first === DOT && ((second === DOT && third === B_SLASH)|| second === B_SLASH )) return true
    return false
}

export const gentleJson = (s:string) => {
    try{
        return JSON.parse(s)
    } catch(e){}
}


export type FileMap = Map<string,FileObject>

export interface FileObject {
    getData:()=>Buffer
}

export interface Parent {
    id:string;
    filename?:string;
    paths:string[]
}