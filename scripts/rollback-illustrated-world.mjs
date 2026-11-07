import {readFile,writeFile,rename,stat} from 'node:fs/promises';
import path from 'node:path';
const args=process.argv.slice(2),i=args.indexOf('--root'),root=path.resolve(i<0?'C:/NebulaWorld':args[i+1]),pointer=JSON.parse(await readFile(path.join(root,'current.json'),'utf8'));
if(!pointer.previous||!/^[a-zA-Z0-9._-]+$/.test(pointer.previous))throw Error('No previous release to restore');
await stat(path.join(root,'releases',pointer.previous,'index.html'));
await writeFile(path.join(root,'current.next.json'),JSON.stringify({release:pointer.previous,previous:pointer.release}));await rename(path.join(root,'current.next.json'),path.join(root,'current.json'));console.log('Restored '+pointer.previous);
