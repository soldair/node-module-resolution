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

  console.log(i,'running',name, 'with ',process.execArgv)

  let testPath = path.join(dir,'test.js')
  let testStat = fs.lstatSync(path.join(dir,'test.js'))
  if(testStat.isSymbolicLink()){
    // unwrap one layer of links if test.js is a link
    testPath = path.resolve(dir,fs.readlinkSync(testPath))
  }

  let caseSpecificFlags = ((fs.readFileSync(testPath)+'').match(/^\/\/Flags:(.+)$/m)||[]).map((s)=>s.trim())
  caseSpecificFlags.shift()

  let args = [].concat(process.execArgv,caseSpecificFlags,[testPath])
  console.log(args)
  let out = spawnSync(process.execPath,args)
  
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

