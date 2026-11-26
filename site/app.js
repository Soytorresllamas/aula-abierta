/* First-person classroom and its published learning materials. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('world');
  const welcome = $('welcome');
  const bookDialog = $('book-dialog');
  const pauseDialog = $('pause-dialog');
  const libraryDialog = $('library-dialog');
  const supportDialog = $('support-dialog');
  const keys = new Set();
  const touchMoves = new Set();
  const state = { started:false, active:false, nearBook:false, nearLibraryBook:null, nearSupport:null, nearProjector:false, suppressUnlock:false, dragging:false, view:'cover' };
  let engine, scene, camera, room, projection, experience, lesson, lighting, toastTimer, lastX, lastY;
  let selectionGlow, selectedKey=null, highlightedMeshes=[], pointerTravel=0;
  const interactionRange=2.35;
  let ready = false;
  const coverImage = $('book-art').querySelector('img');
  const coverReady = new Promise((resolve, reject) => {
    async function loaded() {
      try {
        if (!coverImage.naturalWidth) throw new Error('Missing cover');
        if (coverImage.decode) await coverImage.decode();
        resolve();
      } catch (error) { reject(error); }
    }
    coverImage.addEventListener('load', loaded, { once:true });
    coverImage.addEventListener('error', () => reject(new Error('Missing cover')), { once:true });
    if (coverImage.complete) loaded();
  });
  coverReady.catch(() => {
    ready = false;
    $('enter').disabled = true;
    $('go-video').disabled = true;
    document.body.dataset.ready = 'false';
    $('error').querySelector('h2').textContent = 'Falta la cubierta original';
    $('error-text').textContent = 'No se pudo cargar la cubierta de Valientes Español 1. Comprueba tu conexión y pulsa Reintentar.';
    $('error').hidden = false;
  });
  const speed = 1.8;
  const radius = .205;
  const sensitivity = .0022;
  const keyboardLookSpeed = 0.675; // Radians per second at 100% sensitivity.

  function toast(message) {
    clearTimeout(toastTimer);
    $('toast').textContent = message;
    $('toast').hidden = false;
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4600);
  }
  function clearInput() { keys.clear(); touchMoves.clear(); state.dragging = false; }
  function contentOpen() { return !!document.querySelector('dialog[open]:not(#pause-dialog)')||projection?.isOpen; }
  function releaseMouse() {
    if (document.pointerLockElement === canvas) {
      state.suppressUnlock = true;
      document.exitPointerLock();
    }
  }
  function refreshUI() {
    document.body.classList.toggle('playing', state.started);
    welcome.hidden = state.started;
    document.body.classList.toggle('overlay-open',!!document.querySelector('dialog[open]'));
    experience?.refresh(state,projection?.isOpen);
    lesson?.refreshRoute(state.active);
    $('reticle').hidden = !state.active;
    updateSelection();
    $('touch-controls').hidden = !(state.active && matchMedia('(pointer: coarse)').matches);
  }
  async function grabMouse() {
    canvas.focus();
    if (!canvas.requestPointerLock || matchMedia('(pointer: coarse)').matches) return;
    try {
      const result = canvas.requestPointerLock();
      if (result && typeof result.catch === 'function') await result;
    } catch (_) {
      toast('Mantén presionado y arrastra para mirar alrededor.');
    }
  }
  function enter() {
    if (!room || !ready) return;
    state.started = true;
    state.active = true;
    clearInput();
    refreshUI();
    grabMouse();
  }
  function pause() {
    if (!state.started || contentOpen() || pauseDialog.open) return;
    state.active = false;
    clearInput();
    releaseMouse();
    pauseDialog.showModal();
    refreshUI();
  }
  function resume() {
    if (pauseDialog.open) pauseDialog.close();
    enter();
  }
  function reset() {
    if (!room || !ready) return;
    closeAllContent();
    experience?.endTour();
    lesson?.reset();
    document.body.classList.remove('walked');
    if (bookDialog.open) bookDialog.close();
    if (libraryDialog.open) libraryDialog.close();
    if (supportDialog.open) supportDialog.close();
    if (pauseDialog.open) pauseDialog.close();
    releaseMouse();
    clearInput();
    camera.position.set(room.spawn.x, room.spawn.y, room.spawn.z);
    camera.rotation.set(room.spawn.pitch, room.spawn.yaw, 0);
    state.started = false;
    state.active = false;
    refreshUI();
    $('enter').focus();
  }
  function setBookView(view) {
    state.view = view;
    $('book-art').classList.toggle('full', view === 'full');
    $('activity').hidden = view !== 'activity';
    $('cover-note').hidden = view === 'activity';
    document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
    $('book-art').querySelector('img').alt = view === 'full' ? 'Cubierta original completa: contraportada, lomo y portada de Valientes Español 1.' : 'Portada original de Valientes Español 1, con un niño, un ave y un papalote.';
  }
  let spread,supportForSpread,closeViewer;
  const spreadDialog=$('spread-dialog');
  function openSpread(){
    if(!spread||spreadDialog.open)return;
    spreadDialog.showModal();
    closeViewer=window.openSpanishSpread($('desk-spread'),spread,supportForSpread,()=>{
      spreadDialog.close();
      bookDialog.close();
      openSupports(supportForSpread.id,true,true);
    });
  }
  $('open-spread').addEventListener('click',openSpread);
  spreadDialog.addEventListener('close',()=>{closeViewer?.();closeViewer=null;});
  function openBook(direct = false) {
    if (!room || !ready || contentOpen() || (!direct && !state.nearBook)) return;
    if (pauseDialog.open) pauseDialog.close();
    if (direct) {
      // A clear spot in the central aisle next to the pupil desk.
      camera.position.set(0, 1.65, -3.65);
      camera.setTarget(room.bookPosition);
    }
    state.started = true;
    state.active = false;
    clearInput();
    releaseMouse();
    setBookView('cover');
    bookDialog.showModal();
    refreshUI();
    if(spread)openSpread();
  }
  function closeBook() {
    if (bookDialog.open) bookDialog.close();
    state.active = true;
    clearInput();
    refreshUI();
    canvas.focus();
    // Requiring a new gesture for pointer lock avoids fighting browser Escape behavior.
    toast('Continúa el recorrido. Haz clic en el aula para mirar con el mouse.');
  }
  function openProjection() {
    if (!window.AULA_VIDEO?.url) { toast('Aún no hay un video publicado.'); return; }
    if (!ready || !room || contentOpen()) return;
    if (pauseDialog.open) pauseDialog.close();
    state.started=true; state.active=false; clearInput(); releaseMouse();
    projection.open(); refreshUI();
  }
  function updateBookHint() {
    const book=state.nearLibraryBook;
    const support=state.nearSupport;
    $('book-hint').hidden=!(state.active&&(state.nearBook||book||support||state.nearProjector||state.nearBoard));
    $('reticle').classList.toggle('on-object',state.active&&!!(state.nearBook||book||support||state.nearProjector||state.nearBoard));
    const title=(state.nearBoard && lesson?.at('pizarron')) || (support && lesson?.at('apoyos')) ? 'La historia del papalote' :state.nearBoard?'Inventamos una historia':state.nearProjector?window.AULA_VIDEO.title:support?support.object:book?book.title:'Valientes · Español 1';
    const action=state.nearBoard?'Crear una historia':state.nearProjector?'Encender proyector':support?'Explorar apoyos':'Examinar libro';
    if($('hint-action').textContent!==action)$('hint-action').textContent=action;
    if($('book-hint-title').textContent!==title)$('book-hint-title').textContent=title;
  }
  function updateSelection() {
    let hit=null;
    if(state.active&&ready) {
      // Refresh the view before picking so movement and keyboard look use this frame's aim.
      camera.getViewMatrix(true);
      const ray=camera.getForwardRay(interactionRange);
      hit=scene.pickWithRay(ray,mesh=>mesh.isEnabled()&&mesh.isVisible&&mesh.visibility>0
        &&mesh.material?.alpha>.2&&!mesh.metadata?.selectionPassThrough,false);
    }
    // The nearest visible surface decides the target; furniture and props also occlude it.
    const mesh=hit?.hit&&hit.distance<=interactionRange?hit.pickedMesh:null;
    const kind=mesh?.metadata?.interactive;
    state.nearBoard=kind==='board';
    state.nearProjector=kind==='projector' && !!window.AULA_VIDEO.url;
    state.nearBook=kind==='book';
    state.nearLibraryBook=kind==='library'?window.AULA_LIBRARY.find(b=>b.id===mesh.metadata.libraryId):null;
    state.nearSupport=kind==='support'?(mesh.metadata.supportId==='overview'?{id:'overview',object:'Banca de apoyos'}:window.AULA_SUPPORTS.find(s=>s.id===mesh.metadata.supportId)):null;
    const key=state.nearBoard?'board':state.nearProjector?'projector-'+mesh.uniqueId:state.nearBook?'book':state.nearLibraryBook?'library-'+state.nearLibraryBook.id:state.nearSupport?'support-'+state.nearSupport.id:null;
    if(key!==selectedKey) {
      highlightedMeshes.forEach(m=>selectionGlow.removeMesh(m));
      highlightedMeshes=state.nearBoard?[mesh]:state.nearProjector?[mesh]:state.nearBook?room.bookMeshes:state.nearLibraryBook?[mesh]:state.nearSupport?room.diversity.groups[state.nearSupport.id]:[];
      highlightedMeshes.forEach(m=>selectionGlow.addMesh(m,BABYLON.Color3.FromHexString('#72CDF2')));
      selectionGlow.isEnabled=!!key;
      selectedKey=key;
    }
    updateBookHint();
  }
  function openLibrary(book,fromCatalogue=false) {
    if(!ready||!book||contentOpen())return;
    if(pauseDialog.open)pauseDialog.close();
    state.started=true;state.active=false;clearInput();releaseMouse();
    $('back-catalogue').hidden=!fromCatalogue;
    window.aulaCatalogue.setBookImage($('library-cover'),book);
    $('library-cover').alt='Portada de '+book.title;
    $('library-title').textContent=book.title;
    $('library-author').textContent=book.author;
    const age=book.age.endsWith('+')?'A partir de '+book.age.slice(0,-1)+' años':book.age;
    $('library-age').textContent=[age,book.grade.replace('Primaria-','Primaria, grado ')].filter(Boolean).join(' · ');
    const source=window.aulaCatalogue.usableURL(book.url);
    $('library-source').hidden=!source;
    if(source) $('library-source').href=source;
    else $('library-source').removeAttribute('href');
    libraryDialog.showModal();refreshUI();
  }
  function closeLibrary() {
    if(libraryDialog.open)libraryDialog.close();
    state.active=true;clearInput();refreshUI();canvas.focus();
  }
  const supportIcons={
    lectura:'M3 5h7l2 2 2-2h7v14h-7l-2 2-2-2H3ZM12 7v14M5 10h4M15 10h4M5 14h4M15 14h4',
    pasos:'M3 4h4v4H3ZM3 10h4v4H3ZM3 16h4v4H3ZM11 6h10M11 12h10M11 18h10',
    manos:'m3 14 5-3 5 3v6l-5 3-5-3ZM3 14l5 3 5-3M8 17v6M13 3l5-2 5 2v6l-5 3-5-3ZM13 3l5 3 5-3M18 6v6',
    expresion:'M3 4h13v9H9l-4 4v-4H3ZM14 18l5-5 3 3-5 5-4 1Z'
  };
  function supportIcon(id) { return '<svg viewBox="0 0 26 26" aria-hidden="true"><path d="'+supportIcons[id]+'"/></svg>'; }
  function showSupport(id) {
    const item=window.AULA_SUPPORTS.find(s=>s.id===id)||window.AULA_SUPPORTS[0];
    if(!item)return;
    experience?.showSupport(item.id);
    $('support-detail-title').textContent=item.title;
    $('support-description').textContent=item.description;
    $('support-example').textContent=item.example;
    $('support-prompt').textContent=item.prompt;
    $('support-panel').style.setProperty('--support-color',item.color);
    $('support-symbol').innerHTML=supportIcon(item.id);
    $('support-options').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.support===item.id)));
  }
  function openSupports(id='overview',direct=false,fromSpread=false) {
    if (!fromSpread && lesson?.at('apoyos') && (direct || state.nearSupport)) { lesson.open(); return; }
    if(!ready||!room||contentOpen()||(!direct&&!state.nearSupport))return;
    if(pauseDialog.open)pauseDialog.close();
    if(direct){
      camera.position.copyFrom(room.diversity.approach);
      const object=fromSpread && room.diversity.groups[id]?.at(-1);
      camera.setTarget(object?object.getAbsolutePosition():room.diversity.position);
    }
    state.started=true;state.active=false;clearInput();releaseMouse();
    showSupport(id);supportDialog.showModal();supportDialog.scrollTop=0;refreshUI();
  }
  function closeSupports() {
    if(supportDialog.open)supportDialog.close();
    state.active=true;clearInput();refreshUI();canvas.focus();
  }
  function openNearbyBook() {
    // Recheck on the action itself, including when invoked from the hint button.
    updateSelection();
    if(state.nearBoard){openBoard();return true;}
    if(state.nearProjector){openProjection();return true;}
    if(state.nearSupport){openSupports(state.nearSupport.id);return true;}
    if(state.nearLibraryBook){openLibrary(state.nearLibraryBook);return true;}
    if(state.nearBook){openBook();return true;}
    return false;
  }
  function resizeQuality() {
    const high=window.AULA_PREFS.quality==='high';
    const pixelRatio=high?Math.min(Math.max(window.devicePixelRatio||1,1.25),2):1;
    // Use higher resolution on Retina displays while bounding the GPU pixel workload.
    const pixelBudgetScale=Math.sqrt(canvas.clientWidth*canvas.clientHeight/(high?6000000:1600000));
    engine.setHardwareScalingLevel(Math.max(1/pixelRatio,pixelBudgetScale));
    lighting?.setQuality(window.AULA_PREFS.quality);
    engine.resize();
    projection?.resize();
  }
  function turn(dx,dy) {
    camera.rotation.y += dx * sensitivity * window.AULA_PREFS.sensitivity;
    camera.rotation.x = Math.max(-1.18, Math.min(1.22, camera.rotation.x + dy * sensitivity * window.AULA_PREFS.sensitivity));
  }
  function lookWithKeys(dt) {
    const horizontal = +keys.has('KeyD') - +keys.has('KeyA');
    const vertical = +keys.has('KeyS') - +keys.has('KeyW');
    const length = Math.hypot(horizontal, vertical);
    if (!length) return;
    const amount = keyboardLookSpeed * dt / (length * sensitivity);
    turn(horizontal * amount, vertical * amount);
  }
  function allowed(x,z) {
    if (x < -3.8 || x > 3.8 || z < -4.78 || z > 4.77) return false;
    return !room.obstacles.some(o => x > o.minX-radius && x < o.maxX+radius && z > o.minZ-radius && z < o.maxZ+radius);
  }
  function move(dt) {
    let forward = +(keys.has('ArrowUp') || touchMoves.has('forward')) - +(keys.has('ArrowDown') || touchMoves.has('back'));
    let right = +(keys.has('ArrowRight') || touchMoves.has('right')) - +(keys.has('ArrowLeft') || touchMoves.has('left'));
    const length = Math.hypot(forward,right);
    if (!length) return;
    if (!document.body.classList.contains('walked')) document.body.classList.add('walked');
    if (!$('map-details').hidden) {
      $('map-details').hidden = true;
      $('map-toggle').setAttribute('aria-expanded','false');
    }
    forward /= length; right /= length;
    const yaw = camera.rotation.y;
    const distance = speed * dt;
    const dx = (Math.sin(yaw)*forward + Math.cos(yaw)*right) * distance;
    const dz = (Math.cos(yaw)*forward - Math.sin(yaw)*right) * distance;
    // Separate axes let the camera slide along furniture; tiny substeps prevent tunnelling.
    const steps = Math.max(1,Math.ceil(distance/.025));
    for (let i=0;i<steps;i++) {
      const x = camera.position.x + dx/steps;
      if (allowed(x,camera.position.z)) camera.position.x = x;
      const z = camera.position.z + dz/steps;
      if (allowed(camera.position.x,z)) camera.position.z = z;
    }
    camera.position.y = room.spawn.y;
  }
  function drawMap() {
    const ctx = $('map').getContext('2d');
    const w = 280, h = 320, ox = 28, oy = 13, sx = 28, sz = 28;
    const px = x => ox + (x+4)*sx;
    const py = z => oy + (5-z)*sz;
    ctx.clearRect(0,0,w,h);
    ctx.strokeStyle='#569ecb';ctx.lineWidth=2;ctx.strokeRect(ox,oy,8*sx,10*sz);
    ctx.fillStyle='#07599e';ctx.fillRect(px(-1.65),oy-2,3.3*sx,5);
    ctx.fillStyle='#8bc8e9';
    for (const z of room.deskRows) for (const x of [-2.55,-.9,.9,2.55]) ctx.fillRect(px(x-.475),py(z+.295),.95*sx,.59*sz);
    ctx.fillStyle='#07599e';ctx.fillRect(px(.74),py(-3.04),.33*sx,.44*sz);
    ctx.fillStyle='#ec008c';ctx.fillRect(px(-3.15),py(4.5),1.4*sx,.8*sz);
    ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    for(const [label,x,z] of [['L',.9,-3.25],['A',-2.45,4.1],['B',3.5,-3.8],['P',-.45,4.7],['V',1.99,4.7]]){ctx.fillStyle='#07599e';ctx.beginPath();ctx.arc(px(x),py(z),11,0,Math.PI*2);ctx.fill();ctx.fillStyle='white';ctx.fillText(label,px(x),py(z));}
    ctx.save();ctx.translate(px(camera.position.x),py(camera.position.z));ctx.rotate(camera.rotation.y);
    ctx.fillStyle='#ec008c28';ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,32,-Math.PI*.7,-Math.PI*.3);ctx.closePath();ctx.fill();
    ctx.fillStyle='#bb006c';ctx.beginPath();ctx.arc(0,0,5.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.stroke();ctx.restore();
  }


  function closeAllContent() {
    projection?.close(true);
    document.querySelectorAll('dialog[open]').forEach(d=>d.close());
    clearInput();
  }
  function openOverlay(dialog) {
    if(!ready||contentOpen())return;
    if(pauseDialog.open)pauseDialog.close();
    state.active=false;clearInput();releaseMouse();dialog.showModal();refreshUI();
  }
  function closeOverlay(dialog) {
    dialog.close();state.active=state.started;clearInput();refreshUI();
    if(state.active)canvas.focus();else $('explore-aula').focus();
  }
  function navigate(id) {
    if(!ready)return;
    const destinations={
      libro:{position:[0,1.65,-3.65],target:room.bookPosition},
      apoyos:{position:room.diversity.approach.asArray(),target:room.diversity.position},
      biblioteca:{position:[2.7,1.65,-4.6],target:new BABYLON.Vector3(3.544,.935,-3.8)},
      pizarron:{position:[0,1.65,3.6],target:new BABYLON.Vector3(-.45,1.96,4.798)},
      proyector:{position:[1.6,1.65,3.6],target:new BABYLON.Vector3(1.99,1.25,4.73)}
    },destination=destinations[id];
    if(!destination||!allowed(destination.position[0],destination.position[2]))return;
    closeAllContent();releaseMouse();
    camera.position.set(...destination.position);camera.setTarget(destination.target);
    state.started=true;state.active=true;refreshUI();canvas.focus();
  }
  function openBoard() {
    if (lesson?.at('pizarron')) lesson.open();
    else openOverlay($('board-dialog'));
  }
  function openMaterial(id) {
    if(id==='libro')openBook(true);
    else if(id==='apoyos')openSupports('overview',true);
    else if(id==='biblioteca')openOverlay($('catalogue-dialog'));
    else if(id==='pizarron')openBoard();
    else if(id==='proyector')openProjection();
  }

  function init() {
    if (!window.BABYLON || !BABYLON.Engine.isSupported()) throw new Error('WebGL unavailable');
    engine = new BABYLON.Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true,powerPreference:'high-performance'},true);
    resizeQuality();
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(.76,.84,.81,1);
    scene.ambientColor = new BABYLON.Color3(.14,.16,.13);
    scene.imageProcessingConfiguration.contrast = 1.03;
    scene.imageProcessingConfiguration.exposure = 1.03;
    camera = new BABYLON.UniversalCamera('visitor',new BABYLON.Vector3(0,1.65,-4.25),scene);
    camera.minZ = .06;camera.maxZ = 70;camera.fov=.97;
    camera.inputs.clear();
    scene.activeCamera = camera;
    room=window.buildClassroom(scene);
    window.enhanceClassroom(scene,room);
    lighting=window.setupClassroomLighting(scene,camera,engine,room);
    lighting.setQuality(window.AULA_PREFS.quality);
    projection=window.createClassroomProjector(scene,camera,engine,()=>{state.active=true;clearInput();refreshUI();canvas.focus();},room,lighting);
    experience=window.createAulaExperience({navigate,openMaterial,openOverlay,closeOverlay,toast,resizeQuality,openCatalogueBook(book){closeAllContent();openLibrary(book,true);},backToCatalogue(){closeAllContent();openOverlay($('catalogue-dialog'));}});
    lesson = window.createKiteLesson({
      navigate, openMaterial, openOverlay, closeOverlay,
      stopTour: experience.endTour,
      walk() {
        closeAllContent();
        state.active=true;
        refreshUI();
        canvas.focus();
      },
      writeBoard: room.writeLessonBoard
    });
    selectionGlow=new BABYLON.HighlightLayer('objeto bajo la mira',scene,{mainTextureRatio:.5,blurTextureSizeRatio:.5,isStroke:true});
    selectionGlow.innerGlow=false;selectionGlow.outerGlow=true;
    selectionGlow.blurHorizontalSize=.6;selectionGlow.blurVerticalSize=.6;
    selectionGlow.isEnabled=false;
    camera.position.set(room.spawn.x,room.spawn.y,room.spawn.z);
    camera.rotation.set(room.spawn.pitch,room.spawn.yaw,0);
    scene.metadata={classroom:{deskRows:room.deskRows,obstacles:room.obstacles,bookPosition:room.bookPosition,libraryBooks:room.libraryBooks,diversityPosition:room.diversity.position,diversityApproach:room.diversity.approach,spawn:room.spawn}};
    let count=0;
    engine.runRenderLoop(()=>{
      const dt=Math.min(.04,engine.getDeltaTime()/1000);
      if(state.active) { lookWithKeys(dt); move(dt); }
      room.courtyard?.update(dt,state.active&&!window.AULA_PREFS.reduceMotion&&!document.hidden,window.AULA_PREFS.quality==='fluid');
      projection.update(dt);
      updateSelection();
      scene.render();
      projection.align();
      if(++count%3===0)drawMap();
    });
    scene.executeWhenReady(async()=>{
      try { await coverReady; } catch (_) { return; }
      ready = true;
      $('enter').disabled=false;$('enter').innerHTML='Entrar al salón <svg class="arrow-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
      $('go-video').disabled=!window.AULA_VIDEO.url;
      $('go-video').hidden=!window.AULA_VIDEO.url;
      document.body.dataset.ready='true';
      window.aulaStarted=true;
      experience.ready();
      const supportId=new URLSearchParams(location.search).get('apoyo');
      if(supportId && window.AULA_SUPPORTS.some(item=>item.id===supportId))openSupports(supportId,true,true);
      drawMap();
    });
    window.addEventListener('resize',resizeQuality);
  }

  $('enter').addEventListener('click',enter);
  $('go-video').addEventListener('click',openProjection);
  function openWhenReady(link,open){
    link.addEventListener('click',event=>{
      if(!ready||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
      event.preventDefault();open();
    });
  }
  openWhenReady($('go-book'),()=>openBook(true));
  openWhenReady($('go-supports'),()=>openSupports('overview',true));
  $('close-supports').addEventListener('click',closeSupports);
  $('return-supports').addEventListener('click',closeSupports);
  supportDialog.addEventListener('cancel',e=>{e.preventDefault();closeSupports();});
  $('home').addEventListener('click',e=>{e.preventDefault();reset();});
  $('help').addEventListener('click',()=>{if(state.started)pause();else{state.started=true;pause();}});
  $('resume').addEventListener('click',resume);
  $('reset').addEventListener('click',reset);
  $('book-hint').addEventListener('click',openNearbyBook);
  $('close-library').addEventListener('click',closeLibrary);
  $('return-library').addEventListener('click',closeLibrary);
  libraryDialog.addEventListener('cancel',e=>{e.preventDefault();closeLibrary();});
  $('return-class').addEventListener('click',closeBook);
  $('close-book').addEventListener('click',closeBook);
  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>setBookView(button.dataset.view)));
  bookDialog.addEventListener('cancel',e=>{e.preventDefault();closeBook();});
  pauseDialog.addEventListener('cancel',e=>{e.preventDefault();resume();});
  $('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(_){toast('La pantalla completa no está disponible en este navegador.');}});
  document.addEventListener('pointerlockchange',()=>{
    if(document.pointerLockElement!==canvas){
      if(state.suppressUnlock){state.suppressUnlock=false;return;}
      if(state.active)pause();
    }
  });
  document.addEventListener('pointerlockerror',()=>{if(state.active)toast('Mantén presionado y arrastra para mirar alrededor.');});
  document.addEventListener('keydown',e=>{
    if(e.code==='Escape') { if(projection?.isOpen){e.preventDefault();projection.close();return;} if(state.active){e.preventDefault();pause();}return; }
    if(!state.active)return;
    if (e.code==='KeyM' && !e.repeat) {
      e.preventDefault();
      releaseMouse();
      $('map-toggle').click();
      if (!$('map-details').hidden) $('map-destinations').querySelector('button').focus();
      else canvas.focus();
      return;
    }
    if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}
    if(e.code==='KeyE'&&!e.repeat){e.preventDefault();if(!openNearbyBook())toast('Acércate y apunta a un libro, un apoyo, el pizarrón o el control del proyector junto al pizarrón.');}
  });
  document.addEventListener('keyup',e=>keys.delete(e.code));
  window.addEventListener('blur',()=>{clearInput();if(state.active)pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){projection?.pause();clearInput();if(state.active)pause();}});
  canvas.addEventListener('pointerdown',e=>{
    if(!state.active||!e.isPrimary||e.button!==0)return;
    lastX=e.clientX;lastY=e.clientY;pointerTravel=0;state.dragging=true;
    if(e.pointerType!=='touch'&&document.pointerLockElement!==canvas)grabMouse();
    try{canvas.setPointerCapture(e.pointerId);}catch(_){}
  });
  canvas.addEventListener('pointerup',e=>{
    if(!e.isPrimary)return;
    state.dragging=false;
    if(state.active&&e.pointerType==='touch'&&pointerTravel<5)openNearbyBook();
  });
  canvas.addEventListener('pointercancel',()=>{state.dragging=false;pointerTravel=Infinity;});
  document.addEventListener('pointermove',e=>{
    if(!state.active)return;
    const locked=document.pointerLockElement===canvas;
    const dx=locked?e.movementX:e.clientX-lastX,dy=locked?e.movementY:e.clientY-lastY;
    if(state.dragging)pointerTravel+=Math.hypot(dx,dy);
    if(locked||state.dragging){turn(dx,dy);lastX=e.clientX;lastY=e.clientY;}
  });
  canvas.addEventListener('click',e=>{
    if(!state.active||e.button!==0||e.pointerType==='touch'||pointerTravel>=5)return;
    openNearbyBook();
  });
  document.querySelectorAll('[data-move]').forEach(button=>{
    button.addEventListener('pointerdown',e=>{e.preventDefault();touchMoves.add(button.dataset.move);button.setPointerCapture(e.pointerId);});
    ['pointerup','pointercancel','lostpointercapture'].forEach(event=>button.addEventListener(event,()=>touchMoves.delete(button.dataset.move)));
  });
  function applyContent(data) {
    window.AULA_LIBRARY=data.books;
    window.AULA_SUPPORTS=data.supports;
    spread=data.spread?.visible?data.spread:null;
    supportForSpread=data.supports.find(item=>item.id===spread?.supportId);
    $('open-spread').hidden=!spread;
    window.AULA_VIDEO=data.video || {title:'Video del aula',url:''};
    window.aulaCatalogue.renderMaterials('book-samples', data.samples);
    window.aulaCatalogue.renderMaterials('bench-materials', data.materials);
    const hasSupports=data.supports.length>0;
    supportDialog.querySelector('.support-layout').hidden=!hasSupports;
    supportDialog.querySelector('.scenario-picker').hidden=!hasSupports;
    data.supports.forEach(item=>{
      const button=document.createElement('button');
      button.type='button';
      button.dataset.support=item.id;
      button.setAttribute('aria-pressed','false');
      button.setAttribute('aria-controls','support-panel');
      button.innerHTML=supportIcon(item.id);
      const label=document.createElement('span');
      label.textContent=item.object;
      button.append(label);
      button.addEventListener('click',()=>showSupport(item.id));
      $('support-options').append(button);
    });
  }
  window.aulaCatalogue.pending.then(data=>{
    applyContent(data);
    init();
  }).catch(error=>{
    console.error(error);
    $('error').hidden=false;
    $('error-text').textContent='No se pudo preparar el aula. Comprueba tu conexión y vuelve a intentarlo con WebGL habilitado.';
  });
})();
