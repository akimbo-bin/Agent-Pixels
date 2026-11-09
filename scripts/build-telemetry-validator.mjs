import Ajv2020 from 'ajv/dist/2020.js';
import standaloneCode from 'ajv/dist/standalone/index.js';
import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
const schema=JSON.parse(await readFile(new URL('../ops/telemetry/workload-telemetry.v1.schema.json',import.meta.url),'utf8'));
const ajv=new Ajv2020({strict:false,allErrors:true,code:{source:true}}),validate=ajv.compile(schema);
await build({stdin:{contents:standaloneCode(ajv,validate),resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',minify:true,outfile:'scripts/live/telemetry-validator.cjs'});
console.log('Built portable AJV validator from pinned producer schema');
