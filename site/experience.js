/* Local preferences, accessible destinations, and original classroom activities. */
(() => {
  const $=id=>document.getElementById(id), preferenceKey='aula-preferences-v1';
  let saved={};try{saved=JSON.parse(localStorage.getItem(preferenceKey))||{};}catch(_){}
  const prefs=window.AULA_PREFS={quality:saved.quality==='fluid'?'fluid':'high',sensitivity:Number.isFinite(saved.sensitivity)?Math.max(.5,Math.min(1.5,saved.sensitivity)):1,largeText:saved.largeText===true,reduceMotion:typeof saved.reduceMotion==='boolean'?saved.reduceMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};
  function applyPrefs(){document.body.classList.toggle('text-large',prefs.largeText);document.body.classList.toggle('reduce-motion',prefs.reduceMotion);try{localStorage.setItem(preferenceKey,JSON.stringify(prefs));}catch(_){}}
  applyPrefs();
  window.createAulaExperience=function(api){
    const destinations=[
      {id:'libro',mark:'L',title:'Libro Valientes',description:'Observa la portada y descubre una actividad.',action:'Abrir libro'},
      {id:'apoyos',mark:'A',title:'Banca de apoyos',description:'Prueba distintas formas de aprender.',action:'Probar apoyos'},
      {id:'biblioteca',mark:'B',title:'Biblioteca',description:'Encuentra una lectura por tema o autor.',action:'Ver libros'},
      {id:'pizarron',mark:'P',title:'Pizarrón',description:'Construye el inicio de una historia.',action:'Crear historia'},
      {id:'proyector',mark:'V',title:'Proyector',description:'Conoce Valientes en video.',action:'Ver video'}
    ];
    if (!window.AULA_VIDEO.url) destinations.pop();
    let tour=-1,activeState={active:false},projecting=false,currentSupport='lectura';
    const ambience=window.aulaAmbience=window.createPatioAmbience();
    function button(text,handler,cls=''){const b=document.createElement('button');b.type='button';b.textContent=text;b.className=cls;b.addEventListener('click',handler);return b;}
    function sync(){
      $('guided-tour').hidden=tour<0||!activeState.active||projecting;
      ambience.setActive((activeState.active||$('settings-dialog').open)&&!projecting&&!document.hidden);
    }
    function endTour(){tour=-1;sync();}
    function go(id){
      endTour();
      $('map-details').hidden=true;
      $('map-toggle').setAttribute('aria-expanded','false');
      api.navigate(id);
    }
    function open(id){api.navigate(id);api.openMaterial(id);}
    function tourStep(){const d=destinations[tour];api.navigate(d.id);$('tour-progress').textContent=`Parada ${tour+1} de 3`;$('tour-title').textContent=d.title;$('tour-description').textContent=d.description;$('tour-open').textContent=d.action;$('tour-next').textContent=tour===2?'Finalizar visita':'Siguiente parada';sync();}
    destinations.forEach(d=>{
      const row=document.createElement('article');row.className='destination';
      const info=document.createElement('div'),h=document.createElement('h3'),p=document.createElement('p');h.textContent=d.title;p.textContent=d.description;info.append(h,p);
      const actions=document.createElement('div');actions.className='destination-actions';
      const near=button('Acercarme',()=>go(d.id),'button secondary');near.setAttribute('aria-label','Acercarme a '+d.title);
      actions.append(near,button(d.action,()=>{endTour();open(d.id);},'button primary'));row.append(info,actions);$('destination-list').append(row);
      const mapButton=button(d.mark+' · '+d.title,()=>go(d.id));mapButton.setAttribute('aria-label','Ir a '+d.title);mapButton.dataset.destination=d.id;$('map-destinations').append(mapButton);
    });
    $('map-details').hidden=true;$('map-toggle').setAttribute('aria-expanded',String(!$('map-details').hidden));
    $('map-toggle').addEventListener('click',()=>{$('map-details').hidden=!$('map-details').hidden;$('map-toggle').setAttribute('aria-expanded',String(!$('map-details').hidden));});
    document.querySelectorAll('[data-close-panel]').forEach(b=>b.addEventListener('click',()=>api.closeOverlay($(b.dataset.closePanel))));
    document.querySelectorAll('.panel-dialog').forEach(d=>d.addEventListener('cancel',e=>{e.preventDefault();api.closeOverlay(d);}));
    $('explore-aula').addEventListener('click',()=>api.openOverlay($('explore-dialog')));
    $('open-settings').addEventListener('click',()=>api.openOverlay($('settings-dialog')));
    $('start-tour').addEventListener('click',()=>{tour=0;tourStep();});
    $('tour-exit').addEventListener('click',endTour);
    $('tour-open').addEventListener('click',()=>api.openMaterial(destinations[tour].id));
    $('tour-next').addEventListener('click',()=>{if(tour===2){endTour();api.toast('Visita completa. Puedes seguir explorando el aula.');}else{tour++;tourStep();}});
    document.querySelectorAll('[name=quality]').forEach(input=>{input.checked=input.value===prefs.quality;input.addEventListener('change',()=>{prefs.quality=input.value;applyPrefs();api.resizeQuality();});});
    $('look-sensitivity').value=prefs.sensitivity*100;$('sensitivity-value').textContent=Math.round(prefs.sensitivity*100)+' %';
    $('look-sensitivity').addEventListener('input',()=>{prefs.sensitivity=+$('look-sensitivity').value/100;$('sensitivity-value').textContent=$('look-sensitivity').value+' %';applyPrefs();});
    for(const [id,key] of [['large-text','largeText'],['reduce-motion','reduceMotion']]){$(id).checked=prefs[key];$(id).addEventListener('change',()=>{prefs[key]=$(id).checked;applyPrefs();});}
    $('ambient-enabled').addEventListener('change',async()=>{try{await ambience.enable($('ambient-enabled').checked);$('ambient-status').textContent=$('ambient-enabled').checked?'Brisa y aves activadas. El ambiente se pausa durante el video.':'Sonido desactivado.';}catch(_){$('ambient-enabled').checked=false;await ambience.enable(false);$('ambient-status').textContent='El navegador no pudo activar el sonido. Puedes volver a intentarlo.';}});
    $('ambient-volume').addEventListener('input',()=>{$('volume-value').textContent=$('ambient-volume').value+' %';ambience.setVolume(+$('ambient-volume').value/100);});
    document.addEventListener('visibilitychange',sync);window.addEventListener('pagehide',()=>ambience.dispose());

    const topics = [...new Set(window.AULA_LIBRARY.map(book => book.theme).filter(Boolean))];
    let theme = '';
    const normal = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

    function renderCatalogue() {
      const query = normal($('catalogue-search').value.trim());
      const books = window.AULA_LIBRARY.filter(book =>
        (!theme || book.theme === theme) && normal(book.title+' '+book.author).includes(query));
      const list = $('catalogue-books');
      list.replaceChildren();
      $('catalogue-count').textContent = books.length===1 ? '1 libro' : books.length+' libros';
      document.querySelectorAll('[data-theme]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.theme===theme)));
      books.forEach(book => {
        const card = button('',()=>api.openCatalogueBook(book),'catalogue-book');
        const image = document.createElement('img');
        image.alt = '';
        image.loading = 'lazy';
        window.aulaCatalogue.setBookImage(image,book);
        const title = document.createElement('strong');
        title.textContent = book.title;
        const author = document.createElement('span');
        author.textContent = book.author;
        const topic = document.createElement('small');
        topic.textContent = [book.theme,book.age].filter(Boolean).join(' · ');
        card.append(image,title,author,topic);
        list.append(card);
      });
      if (!books.length) {
        const p = document.createElement('p');
        p.textContent = window.AULA_LIBRARY.length ? 'Prueba otro título, autor o tema.' : 'Aún no hay libros publicados.';
        list.append(p);
      }
    }
    ['',...topics].forEach(value => {
      const b = button(value || 'Todos',()=>{theme=value;renderCatalogue();});
      b.dataset.theme = value;
      $('theme-filters').append(b);
    });
    $('catalogue-search').addEventListener('input',renderCatalogue);
    renderCatalogue();
    $('back-catalogue').addEventListener('click',api.backToCatalogue);
    $('create-story').addEventListener('click',()=>{const characters={ave:'El ave encontró',papalote:'El papalote descubrió','niña':'Una niña encontró'},places={patio:'en el patio de la escuela',jardín:'en un jardín',biblioteca:'en la biblioteca'};$('story-opening').textContent=`${characters[$('story-character').value]} una pequeña caja azul ${places[$('story-place').value]}. Dentro había algo que necesitaba la ayuda de todo el grupo…`;$('story-result').hidden=false;});

    const scenarios={
      historia:{context:'Leer una historia breve y explicar lo que sucede.',lines:['Un ave encontró una semilla.','La llevó al jardín de la escuela.','El grupo la sembró y esperó.'],steps:['Observar la ilustración.','Leer una parte de la historia.','Compartir lo que sucedió.'],question:'¿Qué pasó con la semilla?',applications:['Lee una línea por vez y deja que cada persona marque su ritmo.','Haz visible el recorrido: observar, leer y compartir.','Usa tres fichas para representar inicio, desarrollo y final.','Ofrece varias maneras de contar lo que ocurrió.']},
      consigna:{context:'Comprender una consigna para organizar los materiales.',lines:['Busca una hoja y dos colores.','Dibuja algo que hayas observado.','Comparte tu dibujo con alguien.'],steps:['Buscar una hoja y dos colores.','Hacer el dibujo.','Compartir el resultado.'],question:'¿Cómo explicarías la consigna a alguien más?',applications:['Presenta cada instrucción en una línea.','Marca cada paso al terminar y conserva los siguientes a la vista.','Cuenta y agrupa los materiales antes de empezar.','Permite explicar la consigna con palabras, imágenes o un ejemplo.']},
      sumas:{context:'Explorar una suma pequeña con objetos y representaciones.',lines:['Hay dos semillas en una mesa.','Llegan tres semillas más.','¿Cuántas hay ahora en total?'],steps:['Colocar dos fichas.','Agregar tres fichas.','Contar el total.'],question:'¿Cómo mostrarías que dos más tres son cinco?',applications:['Lee el problema por partes y destaca las cantidades.','Separa la suma en acciones que puedan marcarse.','Representa la suma moviendo fichas y cuenta el resultado.','Acepta una explicación oral, un dibujo o una igualdad escrita.']},
      compartir:{context:'Preparar una idea para compartirla con el grupo.',lines:['Elige algo que te guste.','Piensa qué quieres contar.','Compártelo a tu manera.'],steps:['Elegir una idea.','Preparar un ejemplo.','Compartir con el grupo.'],question:'¿Qué te gustaría enseñar al grupo?',applications:['Lee un modelo breve y da tiempo para prepararse.','Organiza la participación en tres momentos visibles.','Usa fichas para ordenar las ideas antes de compartirlas.','Deja elegir el medio de expresión y el tiempo de preparación.']}
    };
    function showSupport(id){
      currentSupport=['lectura','pasos','manos','expresion'].includes(id)?id:'lectura';const s=scenarios[$('support-scenario').value],ids=['lectura','pasos','manos','expresion'];
      $('scenario-context').textContent=s.context;$('support-application').textContent=s.applications[ids.indexOf(currentSupport)];const demo=$('support-demo');demo.replaceChildren();
      const heading=document.createElement('h4');heading.textContent='Pruébalo aquí';demo.append(heading);
      if(currentSupport==='lectura'){
        let line=0;const lines=document.createElement('div');lines.className='reading-lines';s.lines.forEach(text=>{const p=document.createElement('p');p.textContent=text;lines.append(p);});
        const status=document.createElement('p');status.setAttribute('role','status');const controls=document.createElement('div');controls.className='demo-actions';
        const prev=button('Línea anterior',()=>{line--;render();}),next=button('Línea siguiente',()=>{line++;render();});
        function render(){[...lines.children].forEach((p,i)=>p.classList.toggle('current-line',i===line));status.textContent=`Línea ${line+1} de 3`;prev.disabled=line===0;next.disabled=line===2;}
        controls.append(prev,next);demo.append(lines,status,controls);render();
      }else if(currentSupport==='pasos'){
        const list=document.createElement('div'),status=document.createElement('p');status.setAttribute('role','status');const inputs=[];
        function count(){status.textContent=inputs.filter(i=>i.checked).length+' de 3 pasos completados';}
        s.steps.forEach(text=>{const label=document.createElement('label');label.className='choice';const input=document.createElement('input');input.type='checkbox';input.addEventListener('change',count);inputs.push(input);label.append(input,document.createTextNode(text));list.append(label);});
        demo.append(list,status,button('Reiniciar pasos',()=>{inputs.forEach(i=>i.checked=false);count();}));count();
      }else if(currentSupport==='manos'){
        let count=2;const task=document.createElement('p');task.textContent=$('support-scenario').value==='sumas'?'Hay dos fichas. Agrega tres y cuenta el total.':'Agrega o quita fichas para representar cantidades o poner tus ideas en orden.';const chips=document.createElement('div');chips.className='counting-chips';chips.setAttribute('aria-hidden','true');const status=document.createElement('p');status.setAttribute('role','status');
        const actions=document.createElement('div');actions.className='demo-actions';const remove=button('Quitar ficha',()=>{count--;render();}),add=button('Agregar ficha',()=>{count++;render();});
        function render(){chips.replaceChildren();for(let i=0;i<count;i++){const span=document.createElement('span');span.textContent=i+1;chips.append(span);}status.textContent=count+' fichas';remove.disabled=count===0;add.disabled=count===10;}
        actions.append(remove,add);demo.append(task,chips,status,actions);render();
      }else{
        const p=document.createElement('p');p.textContent=s.question;const actions=document.createElement('div');actions.className='demo-actions';const result=document.createElement('p');result.setAttribute('role','status');
        const choices={Contar:'Ensaya la respuesta en voz alta con alguien de confianza.',Dibujar:'Representa tu idea con un dibujo y señala sus detalles.',Escribir:'Escribe una frase breve; puedes empezar con «Yo pienso que…».'};
        Object.entries(choices).forEach(([label,text])=>{const b=button(label,()=>{[...actions.children].forEach(x=>x.setAttribute('aria-pressed',String(x===b)));result.textContent=text;});b.setAttribute('aria-pressed','false');actions.append(b);});demo.append(p,actions,result);
      }
    }
    $('support-scenario').addEventListener('change',()=>showSupport(currentSupport));
    return {endTour,showSupport,refresh(state,isProjecting){activeState=state;projecting=isProjecting;sync();},ready(){['start-tour','explore-aula','open-settings'].forEach(id=>$(id).disabled=false);},destinations};
  };
})();
