const fs = require('fs')
const path = require('path')
const {spawnSync} = require('child_process')
let dirs = fs.readdirSync(__dirname)


let failed = {}

dirs.forEach((name,i)=>{
  dir = path.join(__dirname,name)
  if(!fs.statSync(dir).isDirectory()){
    return;
  }

  console.log(i,'running',name)
  //todo add require loader
  let out = spawnSync(process.execPath,[
    //'--require',path.resolve(__dirname,'..','build','src','loader','file.js'),
    path.join(dir,'test.js')
  ])
  
  if(out.status || out.signal){
    failed[name] = out
    console.error('failed> ',name)
  }
  process.stdout.write(out.stdout)
  process.stdout.write(out.stderr)
})

console.log("\n"+dirs.length+' tests')
console.log(Object.keys(failed).length+' failures')

if(Object.keys(failed).length){
  process.exit(1)
}

