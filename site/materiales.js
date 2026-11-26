(() => {
  const $=id=>document.getElementById(id);
  const body=$('resource-body'),heading=$('resource-title');
  const make=(tag,text)=>{const node=document.createElement(tag);if(text)node.textContent=text;return node;};
  const link=(label,href)=>{const a=make('a',label);a.href=href;return a;};
  const itemLink=(group,item)=>link(item.title,'#'+group+'/'+encodeURIComponent(item.id));
  const para=text=>{if(text){const p=make('p',text);p.className='copy';body.append(p);}};
  let data,dispose,lesson;
  const dialog=$('lesson-dialog');
  function title(text){heading.textContent=text;document.title=text+' · Aula abierta';}
  function list(label,links,container=body){
    if(!links.length)return;
    if(label)container.append(make('h2',label));
    const ul=make('ul');ul.className='resource-list';
    for(const a of links){const li=make('li');li.append(a);ul.append(li);}
    container.append(ul);
  }
  function openFile(label,url){
    const safe=window.aulaCatalogue.usableURL(url);
    if(safe){const a=link(label,safe);a.target='_blank';a.rel='noopener noreferrer';body.append(a);}
  }
  function book(){
    title('Valientes · Español 1');
    const intro=make('div');intro.className='book-intro';
    const cover=make('div');cover.className='cover';
    const img=make('img');img.src='assets/valientes-espanol-1-cubierta.jpg';img.alt='Portada de Valientes Español 1';
    cover.append(img);intro.append(cover);body.append(intro);
    const links=[];
    if(data.spread?.visible)links.push(link('Abrir doble página · '+data.spread.title,'#doble-pagina'));
    links.push(link('La historia del papalote','#papalote'),link('Inventa una pequeña historia','#portada'));
    list('',links,intro);
    list('Materiales de muestra',data.samples.map(item=>itemLink('muestra',item)));
  }
  function catalogue(){
    title('Materiales del aula');
    const activities=[link('Valientes · Español 1','#libro')];
    if(data.spread?.visible)activities.push(link(data.spread.title,'#doble-pagina'));
    activities.push(link('La historia del papalote','#papalote'),link('Inventamos una historia','#pizarron'));
    list('Actividades',activities);
    list('Materiales didácticos',data.materials.map(item=>itemLink('material',item)));
    list('Muestras',data.samples.map(item=>itemLink('muestra',item)));
    list('Banca de apoyos',data.supports.map(item=>itemLink('apoyo',item)));
    list('Biblioteca de aula',data.books.map(item=>itemLink('lectura',item)));
  }
  function unavailable(){
    title('Recurso no disponible');para('Puedes consultar los materiales que están publicados en el aula.');
    body.append(link('Ver materiales','#materiales'));
  }
  function render(){
    if(!data)return;
    dispose?.();dispose=null;
    if(dialog.open)dialog.close();
    body.replaceChildren();$('copied').textContent='';
    const [route,id]=location.hash.slice(1).split('/');
    if(!route||route==='materiales')catalogue();
    else if(route==='libro')book();
    else if(route==='apoyos'){
      title('Banca de apoyos');
      list('',data.supports.map(item=>link(item.object+' · '+item.title,'#apoyo/'+encodeURIComponent(item.id))));
      list('Materiales didácticos',data.materials.map(item=>itemLink('material',item)));
    }
    else if(route==='doble-pagina'){
      if(!data.spread?.visible)unavailable();
      else{
        title('Doble página de Español 1');
        const reader=make('div');reader.className='spread-reader';body.append(reader);
        const support=data.supports.find(s=>s.id===data.spread.supportId);
        dispose=window.openSpanishSpread(reader,data.spread,support,()=>{location.hash='apoyo/'+support.id;});
      }
    }else if(route==='papalote'){
      title('La historia del papalote');para('Elige dónde cae el papalote y cuenta cómo vuelve a volar con tarjetas, un dibujo o tu voz.');
      const start=make('button','Comenzar la miniclase');start.className='button primary';
      start.onclick=()=>lesson.start();body.append(start);
    }else if(route==='pizarron'){
      title('Inventamos una historia');para('Elige un personaje y un lugar para inventar una historia en tres momentos.');
      body.append($('board-template').content.cloneNode(true));window.setupStoryBoard(body);
    }else if(route==='portada'){
      title('Inventa una pequeña historia');
      const ol=make('ol');for(const prompt of ['Elige un personaje de la portada.','Imagina a dónde viaja y qué encuentra.','Cuenta su aventura en tres frases.'])ol.append(make('li',prompt));
      body.append(ol,link('Ver la portada','#libro'));
    }else{
      const groups={apoyo:data.supports,material:data.materials,muestra:data.samples,lectura:data.books};
      const item=Object.hasOwn(groups,route)?groups[route].find(x=>x.id===id):null;
      if(!item)unavailable();
      else{
        title(item.title);
        if(route==='apoyo'){
          para(item.object);para(item.description);body.append(make('h2','Ejemplo en el aula'));para(item.example);
          body.append(make('h2','Consigna'));para(item.prompt);body.append(link('Ver este apoyo en la banca del salón','./?apoyo='+encodeURIComponent(item.id)));
        }else if(route==='lectura'){
          para([item.author,item.grade,item.age,item.theme].filter(Boolean).join(' · '));openFile('Ver ficha del libro',item.url);
        }else{para(item.description);openFile('Abrir archivo o enlace',item.url);}
      }
    }
    $('share').hidden=false;heading.focus({preventScroll:true});window.scrollTo(0,0);
  }
  $('copy-link').onclick=async()=>{
    try{await navigator.clipboard.writeText(location.href);$('copied').textContent='Enlace copiado.';}
    catch{const field=make('input');field.readOnly=true;field.value=location.href;field.setAttribute('aria-label','Enlace para copiar');$('copied').replaceChildren(field);field.focus();field.select();}
  };
  $('lesson-close').onclick=()=>dialog.close();
  lesson=window.createKiteLesson({navigate(){},stopTour(){},writeBoard(){},openOverlay(){if(!dialog.open)dialog.showModal();},
    closeOverlay(){dialog.close();},openMaterial(){location.hash='libro';}});
  window.addEventListener('hashchange',render);
  window.aulaCatalogue.pending.then(catalog=>{data=catalog;render();}).catch(()=>{
    title('No se pudo cargar el catálogo');body.replaceChildren(link('Volver a intentar',location.href));
  });
})();
