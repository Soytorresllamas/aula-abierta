import {validate, publicCatalogue, kindOf} from './catalogue.mjs';

const privateRepo='aula-abierta-valientes', publicRepo='aula-abierta';
const api='https://api.github.com/repos/Soytorresllamas/';
const master='editorial/catalog.json', published='site/catalog.json';
const maxBytes=25*1024*1024;
const encoder=new TextEncoder(),decoder=new TextDecoder();
const serialize=obj=>JSON.stringify(obj,null,2)+'\n';
const conflict=message=>Object.assign(new Error(message),{status:409});

function base64(bytes) {
  const chunks=[];
  for(let offset=0;offset<bytes.length;offset+=32768)
    chunks.push(String.fromCharCode(...bytes.subarray(offset,offset+32768)));
  return btoa(chunks.join(''));
}
function decode(text) {
  return decoder.decode(Uint8Array.from(atob(text),char=>char.charCodeAt(0)));
}
function mediaFiles(doc) {
  const urls=[doc.video.url,...doc.books.flatMap(b=>[b.asset,b.url]),...doc.samples.map(s=>s.url),...doc.materials.map(s=>s.url)];
  return new Set(urls.filter(u=>u.startsWith('/media/')).map(u=>u.slice(1)));
}
export class GithubCatalogue {
  #token;
  constructor(token){this.#token=token;}
  async request(repo,route,method='GET',body) {
    const res=await fetch(api+repo+(route?'/'+route:''),{
      method,cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',
      headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+this.#token,'X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},
      body:body?JSON.stringify(body):undefined
    });
    if(!res.ok){
      const messages={401:'GitHub no aceptó el token. Revisa su vigencia.',403:'GitHub requiere permiso Contents de lectura y escritura en ambos repositorios. Revisa también los límites de la cuenta.',404:'GitHub no dio acceso al recurso solicitado. Comprueba los dos repositorios seleccionados.',409:'Otra sesión guardó cambios. Vuelve a cargar el catálogo.',422:'GitHub rechazó el cambio. Comprueba la versión o vuelve a cargar el catálogo.'};
      throw Object.assign(new Error(messages[res.status]||'GitHub devolvió HTTP '+res.status+'. Vuelve a intentar.'),{status:res.status});
    }
    return res.status===204?null:res.json();
  }
  async connect() {
    const repos=await Promise.all([privateRepo,publicRepo].map(repo=>this.request(repo,'')));
    if(!repos.every(r=>r.permissions?.push))throw new Error('La cuenta necesita permiso de escritura en ambos repositorios del aula.');
    return this.load();
  }
  async load() {
    const file=await this.request(privateRepo,'contents/'+master+'?ref=main');
    return {doc:JSON.parse(decode(file.content)),sha:file.sha};
  }
  async upload(file) {
    if(!file.size||file.size>maxBytes)throw new Error('El peso permitido es de 1 byte a 25 MB.');
    const bytes=new Uint8Array(await file.arrayBuffer());
    const [ext,type]=kindOf(bytes);
    if(file.type && file.type!==type)throw new Error('La extensión y el formato del archivo no coinciden.');
    const name='media/'+crypto.randomUUID()+'.'+ext;
    await this.request(privateRepo,'contents/editorial/'+name,'PUT',{branch:'main',message:'Guardar archivo del aula',content:base64(bytes)});
    return {url:'/'+name,type};
  }
  async save(doc,expectedSha) {
    const clean={...validate(doc),revision:doc.revision+1,updatedAt:new Date().toISOString()};
    if(!Number.isSafeInteger(clean.revision)||clean.revision<1)throw new Error('La revisión del catálogo no es válida.');
    const bytes=encoder.encode(serialize(clean));
    if(bytes.length>850000)throw new Error('El catálogo supera el tamaño permitido.');
    const result=await this.request(privateRepo,'contents/'+master,'PUT',{
      branch:'main',message:'Guardar la revisión '+clean.revision+' del catálogo',sha:expectedSha,content:base64(bytes)
    });
    return {doc:clean,sha:result.content.sha};
  }
  async tree(repo) {
    const ref=await this.request(repo,'git/ref/heads/main');
    const commit=await this.request(repo,'git/commits/'+ref.object.sha);
    const tree=await this.request(repo,'git/trees/'+commit.tree.sha+'?recursive=1');
    if(tree.truncated)throw new Error('No se pudo leer el índice completo de archivos de GitHub.');
    return {head:ref.object.sha,tree:commit.tree.sha,files:new Map(tree.tree.filter(e=>e.type==='blob').map(e=>[e.path,e.sha]))};
  }
  async publish(snapshot) {
    const view=publicCatalogue({...validate(snapshot.doc),revision:snapshot.doc.revision,updatedAt:snapshot.doc.updatedAt});
    const wanted=mediaFiles(view);
    for(let attempt=0;attempt<3;attempt++){
      const [source,dest]=await Promise.all([this.tree(privateRepo),this.tree(publicRepo)]);
      if(source.files.get(master)!==snapshot.sha)throw conflict('Otra sesión guardó una revisión posterior. Carga la versión más reciente.');
      const remoteFile=await this.request(publicRepo,'contents/'+published+'?ref='+dest.head);
      const remote=JSON.parse(decode(remoteFile.content));
      if(remote.revision>view.revision)throw conflict('El catálogo publicado tiene una revisión posterior.');
      const changes=[];
      if(serialize(remote)!==serialize(view))changes.push({path:published,mode:'100644',type:'blob',content:serialize(view)});
      for(const rel of wanted){
        const sha=source.files.get('editorial/'+rel);
        if(!sha)throw new Error('Falta un archivo del catálogo privado: '+rel);
        if(dest.files.get('site/'+rel)===sha)continue;
        const blob=await this.request(privateRepo,'git/blobs/'+sha);
        const copy=await this.request(publicRepo,'git/blobs','POST',{content:blob.content.replace(/\s/g,''),encoding:'base64'});
        if(copy.sha!==sha)throw new Error('La copia del archivo no coincide con el original.');
        changes.push({path:'site/'+rel,mode:'100644',type:'blob',sha});
      }
      for(const key of dest.files.keys()){
        if(key.startsWith('site/media/')&&!wanted.has(key.slice(5)))changes.push({path:key,mode:'100644',type:'blob',sha:null});
      }
      if(!changes.length)return dest.head;
      const tree=await this.request(publicRepo,'git/trees','POST',{base_tree:dest.tree,tree:changes});
      const commit=await this.request(publicRepo,'git/commits','POST',{
        message:'Publicar revisión '+view.revision+' del catálogo',tree:tree.sha,parents:[dest.head]
      });
      try{
        await this.request(publicRepo,'git/refs/heads/main','PATCH',{sha:commit.sha,force:false});
        return commit.sha;
      }catch(error){
        if(![409,422].includes(error.status)||attempt===2)throw error;
      }
    }
  }
}
