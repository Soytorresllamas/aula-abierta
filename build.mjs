import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('.',import.meta.url));
const output=path.join(root,'_site');
const source='https://aula-abierta-valientes.torresllamas.chatgpt.site';
const manifest=JSON.parse(await readFile(path.join(root,'release.json'),'utf8'));

async function download(file,expected) {
  if (!/^(?:[\w-]+\/)*[\w-]+\.[\w-]+$/.test(file) && !/^vendor\/LICENSE-[\w-]+\.txt$/.test(file))
    throw new Error('Ruta no válida en la versión: '+file);
  if (file==='index.html') {
    const page=await readFile(path.join(root,'entrada.html'));
    if(createHash('sha256').update(page).digest('hex')!==expected)throw new Error('La entrada no corresponde a esta versión.');
    return page;
  }
  const url=new URL('/'+file,source);
  url.searchParams.set('release',expected.slice(0,16));
  let last;
  for (let attempt=0;attempt<3;attempt++) {
    try {
      const response=await fetch(url,{signal:AbortSignal.timeout(45000)});
      if(!response.ok) throw new Error('HTTP '+response.status);
      const data=Buffer.from(await response.arrayBuffer());
      if(createHash('sha256').update(data).digest('hex')!==expected)
        throw new Error('El archivo no coincide con la versión registrada');
      return data;
    } catch(error) {
      last=error;
      if(attempt<2)await new Promise(resolve=>setTimeout(resolve,(attempt+1)*1000));
    }
  }
  throw new Error(file+': '+last.message);
}
const files=Object.entries(manifest.files);
for(let index=0;index<files.length;index+=5){
  await Promise.all(files.slice(index,index+5).map(async ([file,hash])=>{
    let contents=await download(file,hash);
    if(file==='index.html'){
      let html=contents.toString('utf8');
      for (const route of ['/api/content','/admin/']) {
        const link='href="'+route+'"';
        if(!html.includes(link)) throw new Error('Falta la ruta '+route);
        html=html.replaceAll(link,'href="'+source+route+'"');
      }
      contents=html;
    }
    const target=path.join(output,file);
    await mkdir(path.dirname(target),{recursive:true});
    await writeFile(target,contents);
  }));
}
await mkdir(path.join(output,'admin'),{recursive:true});
await writeFile(path.join(output,'admin/index.html'),'<!doctype html><html lang="es"><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url='+source+'/admin/"><title>Administrar Aula abierta</title><a href="'+source+'/admin/">Abrir el administrador de Aula abierta</a></html>');
await writeFile(path.join(output,'.nojekyll'),'');
console.log(files.length+' archivos verificados y preparados.');
