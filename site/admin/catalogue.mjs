const idPattern = /^[\w-]{1,80}$/;
const mediaPath = /^\/media\/[a-f0-9-]{36}\.(?:jpg|png|webp|mp4|pdf)$/;
const supportIds = ['lectura','pasos','manos','expresion'];
const catalogueGroups = ['books','samples','materials'];
function fail(status,message) { throw Object.assign(new Error(message),{status}); }
function field(value,name,max,required=true) {
  if(typeof value !== 'string' || value.length>max || (required && !value.trim()))
    fail(422,'Revisa el campo «'+name+'».');
  return value.trim();
}
function link(value,name,optional=false) {
  const s = field(value,name,2048,!optional);
  if(!s && optional) return '';
  if(mediaPath.test(s) || /^\/?assets\/(?:[\w-]+\/)*[\w.-]+\.(?:png|jpe?g|webp|pdf|mp4)$/i.test(s)) return s;
  let u;
  try { u=new URL(s); } catch { fail(422,'El enlace de «'+name+'» debe ser una dirección HTTPS o un archivo del aula.'); }
  if(u.protocol!=='https:' || u.username || u.password) fail(422,'Usa un enlace HTTPS en «'+name+'».');
  return u.href;
}
function validateVideo(video) {
  const title=field(video?.title,'Título de video',180);
  const url=link(video?.url,'Video');
  const direct=/\.mp4$/i.test(new URL(url,'https://aula.invalid').pathname);
  const vimeo=/^https:\/\/(?:www\.)?vimeo\.com\/\d+(?:\/[a-zA-Z0-9]+)?\/?(?:\?[^#]*)?$|^https:\/\/player\.vimeo\.com\/video\/\d+\/?(?:\?[^#]*)?$/i.test(url);
  if(!direct&&!vimeo) fail(422,'El proyector admite enlaces de Vimeo y archivos MP4.');
  return {title,url};
}
function list(value,max) {
  if(!Array.isArray(value) || value.length>max) fail(422,'La colección supera el límite de '+max+' elementos o tiene un formato inválido.');
  return value;
}
function ident(item,seen) {
  const id=item?.id;
  if(typeof id!=='string'||!idPattern.test(id)||seen.has(id))fail(422,'Hay un elemento sin identificador válido o duplicado.');
  seen.add(id);return id;
}
function dimension(value) {
  if(!Number.isInteger(value)||value<1||value>32768)fail(422,'Revisa las dimensiones de la portada.');
  return value;
}
export function validate(data) {
  if(!data||typeof data!=='object') fail(422,'El catálogo tiene un formato inválido.');
  const doc={video:validateVideo(data.video)};
  for(const group of catalogueGroups) {
    const seen=new Set();
    doc[group]=list(data[group],200).map(x=>{
      const id=ident(x,seen), title=field(x.title,'Título',200);
      if(x.visible!=null && typeof x.visible!=='boolean') fail(422,'Revisa la visibilidad del recurso.');
      const visible=x.visible!==false;
      if(group!=='books') return {id,title,visible,description:field(x.description,'Descripción',4000,false),url:link(x.url,'Enlace',true)};
      return {id,title,visible,author:field(x.author,'Autor',200),age:field(x.age,'Edad',60,false),
        grade:field(x.grade,'Grado',80,false),theme:field(x.theme,'Tema',100,false),url:link(x.url,'Ficha',true),
        asset:link(x.asset,'Portada'),width:dimension(x.width),height:dimension(x.height)};
    });
  }
  const seen=new Set();
  doc.supports=list(data.supports,4).map(x=>{
    const id=ident(x,seen);
    if(!supportIds.includes(id)||!/^#[a-f0-9]{6}$/i.test(x.color))fail(422,'Revisa el apoyo y el color de la banca.');
    return {id,color:x.color,object:field(x.object,'Nombre del objeto',120),title:field(x.title,'Título',180),
      description:field(x.description,'Descripción',2000),example:field(x.example,'Ejemplo',2000),prompt:field(x.prompt,'Consigna',2000)};
  });
  if(seen.size!==4) fail(422,'Los cuatro objetos de la banca requieren su ficha.');
  return doc;
}
export function publicCatalogue(doc) {
  const view={...doc};
  for(const key of catalogueGroups) view[key]=doc[key].filter(entry=>entry.visible!==false);
  return view;
}
export function kindOf(b) {
  const ascii=(i,n)=>String.fromCharCode(...b.subarray(i,i+n));
  if(b[0]===255&&b[1]===216&&b[2]===255)return ['jpg','image/jpeg'];
  if(b[0]===137&&ascii(1,3)==='PNG'&&b[4]===13&&b[5]===10&&b[6]===26&&b[7]===10)return ['png','image/png'];
  if(ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP')return ['webp','image/webp'];
  if(ascii(0,5)==='%PDF-')return ['pdf','application/pdf'];
  if(ascii(4,4)==='ftyp'&&/^(isom|iso[2-9]|mp4[12]|avc1|M4V |MSNV|dash)$/.test(ascii(8,4)))return ['mp4','video/mp4'];
  fail(415,'Elige un archivo JPG, PNG, WebP, PDF o MP4 válido.');
}
