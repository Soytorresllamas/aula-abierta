import {GithubCatalogue} from './github.mjs';
const $=id=>document.getElementById(id);
const specs={
 video:{label:'Video',where:'Se reproduce desde el proyector del salón.',fields:[['title','Título'],['url','Video de Vimeo o archivo MP4','wide']]},
 samples:{label:'Muestras',where:'Se consultan al abrir el libro Valientes en el pupitre.',fields:[['title','Título'],['description','Descripción','area'],['url','Enlace o archivo (opcional)','wide']]},
 materials:{label:'Materiales didácticos',where:'Se consultan en la banca de apoyos.',fields:[['title','Título'],['description','Instrucciones o descripción','area'],['url','Enlace o archivo (opcional)','wide']]},
 books:{label:'Libros',where:'Los primeros nueve títulos visibles ocupan el librero. El catálogo muestra la colección completa.',fields:[['title','Título'],['author','Autoría'],['age','Edad sugerida'],['grade','Grado'],['theme','Tema o género'],['url','Ficha del libro (opcional)'],['asset','Portada','wide']]},
 supports:{label:'Apoyos',where:'Cada ficha corresponde a un objeto de la banca.',fields:[['object','Nombre del objeto'],['title','Título de la ficha'],['description','Descripción','area'],['example','Ejemplo en el aula','area'],['prompt','Consigna','area'],['color','Color','color']]}
};
const movable=['samples','materials','books'];
const accept={video:'video/mp4',books:'image/jpeg,image/png,image/webp',samples:'application/pdf,image/jpeg,image/png,image/webp,video/mp4',materials:'application/pdf,image/jpeg,image/png,image/webp,video/mp4'};
let service,snapshot,watchId=0;
let doc,group='video',dirty=false,saving=false,uploads=0,conflict=false;
const el=(tag,txt)=>{const n=document.createElement(tag);if(txt!=null)n.textContent=txt;return n;};
function button(label,run){const b=el('button',label);b.type='button';b.onclick=run;return b;}
function notice(text){$('notice').textContent=text;}
function status(){
  $('save').disabled=!dirty||saving||uploads>0||conflict;
  $('save').textContent=saving?'Guardando…':'Guardar y publicar';
  $('publish-again').disabled=saving||dirty||uploads>0||conflict;
  $('logout').disabled=saving||uploads>0;
  const last=doc.updatedAt?new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short'}).format(new Date(doc.updatedAt)):null;
  $('publication').textContent=dirty?'Hay cambios sin guardar.':(last?'Último guardado en GitHub · '+last:'Catálogo inicial');
}
function changed(){dirty=true;notice('');status();}
function hydrate(next) {
 snapshot=next;doc=structuredClone(next.doc);dirty=false;conflict=false;
 $('reload').hidden=true;$('gate').hidden=true;$('desk').hidden=false;$('logout').hidden=false;
 $('publish-again').hidden=true;notice('');render();status();
}
async function checkDeployment(target,watch=false) {
 const current=++watchId;
 const url=new URL('../catalog.json',location.href);
 for(let pass=0;pass<(watch?24:1);pass++){
  if(current!==watchId)return;
  try{
   url.searchParams.set('check',Date.now());
   const response=await fetch(url,{cache:'no-store',credentials:'omit'});
   if(!response.ok)throw new Error();
   const live=await response.json();
   if(current!==watchId)return;
   if(live.revision===target.revision && live.updatedAt===target.updatedAt){
    $('deploy-status').textContent='La revisión '+target.revision+' ya está visible en el aula.';
    $('publish-again').hidden=true;return;
   }
   if(live.revision>target.revision){
    $('deploy-status').textContent='Ya se publicó una revisión posterior. Carga la última versión de GitHub.';
    conflict=true;$('reload').hidden=false;status();return;
   }
  }catch{if(current!==watchId)return;}
  if(!watch)break;
  await new Promise(resolve=>setTimeout(resolve,6000));
 }
 if(current!==watchId)return;
 $('deploy-status').textContent='La revisión '+target.revision+' está guardada. Comprueba el despliegue en GitHub o reintenta la publicación.';
 $('publish-again').hidden=false;status();
}
async function load(){
 try{hydrate(await service.load());void checkDeployment(doc);}catch(e){notice(e.message);}
}
$('login').onsubmit=async event=>{
 event.preventDefault();
 const token=$('token').value.trim();if(!token)return;
 const form=event.currentTarget;form.inert=true;$('gate-message').textContent='Conectando con GitHub…';
 try{
  const candidate=new GithubCatalogue(token);
  const next=await candidate.connect();service=candidate;hydrate(next);
  void checkDeployment(doc);
 }catch(e){$('gate-message').textContent=e.message;}
 finally{$('token').value='';form.inert=false;}
};
function nav(){
 $('sections').replaceChildren();
 for(const [key,s] of Object.entries(specs)){
  const b=button(s.label,()=>{group=key;render();});
  b.setAttribute('aria-pressed',String(group===key));
  if(key!=='video'){const n=el('span',doc[key].length);n.className='badge';b.append(n);}
  $('sections').append(b);
 }
}
function uploadPicker(grid,item,key,input){
 const box=el('div');box.className='upload';
 const label=el('label',group==='books'?'Subir portada':group==='video'?'Subir video MP4':'Subir archivo');
 const control=el('input');control.type='file';control.accept=accept[group];label.append(control);box.append(label,el('p','Hasta 25 MB por archivo. También puedes pegar un enlace.'));
 const result=el('p');result.setAttribute('role','status');box.append(result);grid.append(box);
 const forBook=group==='books';
 control.onchange=async()=>{
  const file=control.files[0];if(!file)return;
  if(file.size>25*1024*1024){result.textContent='El archivo supera los 25 MB.';control.value='';return;}
  uploads++;status();control.disabled=true;input.readOnly=true;
  result.textContent='Subiendo '+file.name+'…';
  try{
   let w,h;
   if(forBook){const bitmap=await createImageBitmap(file);w=bitmap.width;h=bitmap.height;bitmap.close();}
   const out=await service.upload(file);
   item[key]=out.url;input.value=out.url;
   if(forBook){item.width=w;item.height=h;}
   dirty=true;notice('Archivo listo. Guarda y publica para mostrarlo en el aula.');
   result.textContent='Archivo listo: '+file.name;
  }catch(e){result.textContent=e.message||'No se pudo subir el archivo.';notice(result.textContent);}
  finally{uploads--;status();control.disabled=false;input.readOnly=false;control.value='';}
 };
}
function record(item,i,expanded){
 const detail=el('details');detail.className='record';detail.open=expanded;
 const summary=el('summary');const name=el('span',item.title||'Nuevo elemento');summary.append(name);
 if(item.visible===false){const hidden=el('span','Oculto');hidden.className='item-status';summary.append(hidden);}
 detail.append(summary);
 const grid=el('div');grid.className='form-grid';detail.append(grid);
 for(const [key,caption,kind] of specs[group].fields){
  const label=el('label',caption);label.className='field'+(kind==='wide'||kind==='area'?' wide':'');
  const input=el(kind==='area'?'textarea':'input');input.value=item[key]||'';
  if(kind==='color')input.type='color';
  if(['asset','url'].includes(key)){input.spellcheck=false;input.autocapitalize='off';input.inputMode='url';}
  input.oninput=()=>{item[key]=input.value;if(key==='title')name.textContent=item.title||'Nuevo elemento';changed();};
  label.append(input);grid.append(label);
  if((group==='books'&&key==='asset')||(group!=='books'&&key==='url'))uploadPicker(grid,item,key,input);
 }
 if(movable.includes(group)){
  const actions=el('div');actions.className='actions';
  const visible=el('label'), checkbox=el('input');checkbox.type='checkbox';checkbox.checked=item.visible!==false;
  checkbox.onchange=()=>{item.visible=checkbox.checked;changed();render(i);};visible.append(checkbox,document.createTextNode('Visible en el aula'));
  const swap=(j)=>{const items=doc[group];[items[i],items[j]]=[items[j],items[i]];changed();render(j);};
  const up=button('Subir',()=>swap(i-1)),down=button('Bajar',()=>swap(i+1));up.disabled=!i;down.disabled=i===doc[group].length-1;
  const remove=button('Quitar',()=>{if(confirm('¿Quitar «'+(item.title||'Nuevo elemento')+'» del catálogo? El cambio se aplicará cuando publiques.')){doc[group].splice(i,1);changed();render();}});
  remove.className='remove';actions.append(visible,up,down,remove);grid.append(actions);
 }
 return detail;
}
function render(openIndex){
 nav();const s=specs[group];$('section-title').textContent=s.label;$('where').textContent=s.where;
 $('add').hidden=!movable.includes(group);$('entries').replaceChildren();
 const items=group==='video'?[doc.video]:doc[group];
 if(!items.length){const empty=el('p','Todavía no hay elementos en esta sección.');empty.className='empty';$('entries').append(empty);}
 items.forEach((x,i)=>$('entries').append(record(x,i,i===openIndex||group==='video')));
}
$('add').onclick=()=>{
 const row={id:crypto.randomUUID(),title:'',visible:true};
 for(const [key] of specs[group].fields)row[key]='';
 if(group==='books'){row.width=2;row.height=3;}
 const idx=doc[group].push(row)-1;changed();render(idx);
 const current=$('entries').children[idx];current.querySelector('input')?.focus();
};
async function publish(saveFirst){
 if(saving||uploads||conflict||(!saveFirst&&dirty))return;
 ++watchId;saving=true;status();$('editor').inert=true;$('sections').inert=true;$('reload').disabled=true;
 let privateReady=!saveFirst;
 try{
  if(saveFirst){hydrate(await service.save(doc,snapshot.sha));privateReady=true;}
  $('deploy-status').textContent='Revisión guardada. Enviando al repositorio público…';
  await service.publish(snapshot);
  $('publish-again').hidden=true;$('deploy-status').textContent='GitHub recibió la revisión '+doc.revision+'. Esperando el despliegue de Pages…';
  void checkDeployment(snapshot.doc,true);
 }catch(e){
  notice(e.message);
  if(e.status===409){conflict=true;$('reload').hidden=false;}
  if(privateReady){$('publish-again').hidden=false;$('deploy-status').textContent='El catálogo está guardado en el repositorio privado. La publicación requiere atención.';}
 }finally{saving=false;$('editor').inert=false;$('sections').inert=false;$('reload').disabled=false;status();}
}
$('save').onclick=()=>publish(true);
$('publish-again').onclick=()=>publish(false);
$('reload').onclick=()=>{if(!dirty||confirm('Se reemplazarán las ediciones de esta pestaña con la última versión guardada en GitHub.'))void load();};
$('logout').onclick=()=>location.reload();
window.addEventListener('beforeunload',event=>{if(dirty||uploads||saving){event.preventDefault();event.returnValue='';}});
