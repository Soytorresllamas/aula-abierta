/* Ceiling projector aligned to the screen, with Vimeo and MP4 playback. */
window.createClassroomProjector = function(scene, camera, engine, onClose, room, lighting) {
  'use strict';
  const B = BABYLON, $ = id => document.getElementById(id);
  const width = 3.24, height = width * 9 / 16, top = 2.75, x = -.45, z = 4.53;
  const ui = $('projection-controls'), surface = $('projection-surface');
  const interactive = [], lights = scene.lights.map(light => ({light, intensity:light.intensity}));
  const environment = scene.environmentIntensity;
  let phase = 'off', progress = 0, savedPose, player, mediaElement, generation = 0, timeout;
  let vimeoReady;
  const video=window.AULA_VIDEO;
  const source=window.aulaCatalogue.usableURL(/^\d+$/.test(video.url) ? 'https://vimeo.com/'+video.url : video.url);
  $('projection-title').textContent=video.title;
  if (source) {
    $('projection-source').href=source;
    $('projection-source').hidden=false;
  }
  function vimeoURL() {
    if (!source) return null;
    const url=new URL(source);
    if (!['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(url.hostname)) return null;
    const match=url.pathname.match(/^\/(?:video\/)?(\d+)(?:\/([a-zA-Z0-9]+))?\/?$/);
    if (!match) return null;
    const embed=new URL('https://player.vimeo.com/video/'+match[1]);
    const hash=match[2] || url.searchParams.get('h');
    if(hash) embed.searchParams.set('h',hash);
    for(const [key,value] of Object.entries({autoplay:1,playsinline:1,title:0,byline:0,portrait:0,dnt:1})) {
      embed.searchParams.set(key,String(value));
    }
    return embed.href;
  }
  function loadVimeo() {
    if(window.Vimeo) return Promise.resolve();
    if(!vimeoReady) vimeoReady=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='vendor/vimeo-player.js?v=20261124-10';
      script.onload=resolve;
      script.onerror=()=>{script.remove();vimeoReady=null;reject(new Error('Vimeo'));};
      document.head.append(script);
    });
    return vimeoReady;
  }
  let paused = true, muted = false, mediaReady = false;
  function material(name, color, metal = 0, roughness = .5) {
    const m = new B.PBRMaterial(name, scene);
    m.albedoColor = B.Color3.FromHexString(color).toLinearSpace(); m.metallic = metal; m.roughness = roughness;
    return m;
  }
  const ivory = material('carcasa satinada del proyector', '#e4e5e2', .18, .35);
  const dark = material('grafito del proyector', '#252d36', .3, .5);
  const metal = material('soporte del proyector', '#969fa7', .75, .28);
  const lensMat = material('cristal del lente', '#163e61', .45, .13);
  const ledMat = material('indicador de encendido', '#66c6ee', .05, .3);
  function box(name, w, h, d, pos, mat, selectable = false) {
    const bevel=name==='proyector de techo'?.035:name==='cajón de pantalla retráctil'?.025:0;
    const m=bevel?room.geometry.rounded(name,...pos,w,h,d,bevel,mat):B.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);
    m.position.copyFromFloats(...pos); m.material = mat; m.receiveShadows = true;
    if (selectable) {m.metadata = {interactive:'projector'}; interactive.push(m);}
    return m;
  }
  box('placa de techo del proyector', .25,.035,.25, [x,3.36,.5], metal);
  const stem = B.MeshBuilder.CreateCylinder('brazo del proyector', {height:.26, diameter:.045, tessellation:16}, scene);
  stem.position.set(x,3.21,.5); stem.material = metal;
  box('proyector de techo', .51,.18,.38, [x,2.99,.5], ivory, true);
  box('base del proyector', .46,.018,.33, [x,2.89,.5], dark, true);
  for (let i=0;i<9;i++) box('ventilación del proyector '+i,.006,.075,.012,[x-.257,2.99,.39+i*.025],dark,true);
  const lens = B.MeshBuilder.CreateCylinder('lente del proyector', {height:.06, diameter:.115,tessellation:32},scene);
  lens.position.set(x-.13,2.99,.705); lens.rotation.x=Math.PI/2; lens.material=lensMat;
  lens.metadata={interactive:'projector'};interactive.push(lens);
  const bezel=B.MeshBuilder.CreateTorus('anillo del lente',{diameter:.126,thickness:.014,tessellation:32},scene);bezel.position.set(x-.13,2.99,.731);bezel.rotation.x=Math.PI/2;bezel.material=dark;
  box('tapa inferior del proyector',.30,.006,.22,[x,2.873,.5],ivory,true);
  for(const dx of [-.18,.18])for(const dz of [-.12,.12]){const screw=B.MeshBuilder.CreateCylinder('tornillo del proyector',{height:.005,diameter:.014,tessellation:12},scene);screw.position.set(x+dx,2.874,.5+dz);screw.material=metal;}
  const cable=B.MeshBuilder.CreateTube('cable del proyector',{path:[new B.Vector3(x+.03,3.34,.5),new B.Vector3(x+.03,3.15,.47),new B.Vector3(x+.08,3.08,.36),new B.Vector3(x+.17,3.04,.32)],radius:.008,tessellation:10},scene);cable.material=dark;
  box('luz del proyector',.035,.015,.01,[x+.15,3.01,.695],ledMat,true);
  box('cajón de pantalla retráctil',width+.22,.13,.14,[x,2.84,z],ivory,true);
  box('ranura de pantalla',width+.08,.018,.08,[x,2.768,z],dark);
  const screenMat = new B.StandardMaterial('tela de proyección',scene);
  screenMat.diffuseColor = new B.Color3(.94,.95,.96);screenMat.specularColor=B.Color3.Black();
  screenMat.emissiveColor=new B.Color3(.15,.18,.2);
  const screen = box('pantalla de proyección',width+.08,height+.06,.025,[x,top-height/2,z],dark);
  const face = box('superficie de proyección',width,height,.006,[x,top-height/2,z-.017],screenMat);
  const bar = box('contrapeso de la pantalla',width+.16,.035,.05,[x,top,z],metal);
  [screen,face,bar].forEach(m=>{m.isPickable=false;m.setEnabled(false);});
  // The button occupies the gap between the whiteboard and the calendar.
  box('marco del control de proyección',.21,.27,.035,[1.99,1.25,4.765],ivory,true);
  const button = box('control del proyector',.17,.21,.014,[1.99,1.25,4.74],dark,true);
  const label = new B.DynamicTexture('símbolo de proyección',{width:256,height:320},scene,false);
  const ctx=label.getContext();ctx.fillStyle='#07599e';ctx.fillRect(0,0,256,320);
  ctx.strokeStyle='#fff';ctx.lineWidth=9;ctx.strokeRect(47,55,162,100);
  ctx.beginPath();ctx.moveTo(128,155);ctx.lineTo(128,193);ctx.moveTo(90,193);ctx.lineTo(166,193);ctx.stroke();
  ctx.fillStyle='#ffe000';ctx.beginPath();ctx.moveTo(108,78);ctx.lineTo(108,134);ctx.lineTo(153,106);ctx.fill();
  ctx.fillStyle='#fff';ctx.font='bold 29px sans-serif';ctx.textAlign='center';ctx.fillText('VIDEO',128,253);label.update();
  const labelMat=new B.StandardMaterial('control azul Valientes',scene);labelMat.diffuseTexture=label;labelMat.specularColor=B.Color3.Black();labelMat.emissiveColor=new B.Color3(.12,.12,.12);
  const labelPlane=B.MeshBuilder.CreatePlane('botón de video Valientes',{width:.168,height:.208},scene);
  labelPlane.position.set(1.99,1.25,4.731);labelPlane.material=labelMat;labelPlane.metadata={interactive:'projector'};interactive.push(labelPlane);
  const lightBeamMat=new B.StandardMaterial('haz tenue del proyector',scene);
  lightBeamMat.diffuseColor=B.Color3.Black();lightBeamMat.emissiveColor=new B.Color3(.5,.68,.85);lightBeamMat.alpha=.035;lightBeamMat.backFaceCulling=false;lightBeamMat.disableLighting=true;lightBeamMat.disableDepthWrite=true;
  const beam=B.MeshBuilder.CreateCylinder('haz de proyección',{height:3.9,diameterTop:.03,diameterBottom:1.2,tessellation:32,cap:0},scene);
  const beamStart=new B.Vector3(x-.13,2.99,.74),beamEnd=new B.Vector3(x,top-height/2,z-.03);
  beam.position.copyFrom(B.Vector3.Center(beamStart,beamEnd));
  beam.rotationQuaternion=B.Quaternion.FromUnitVectorsToRef(B.Axis.Y,beamStart.subtract(beamEnd).normalize(),new B.Quaternion());
  beam.material=lightBeamMat;beam.isPickable=false;beam.setEnabled(false);

  function status(message) { $('projection-status').textContent=message; }
  function syncButtons() {
    $('projection-play').textContent=paused?'Reproducir':'Pausar';
    $('projection-play').disabled=!mediaReady;
    $('projection-mute').textContent=muted?'Activar sonido':'Silenciar';
    $('projection-mute').setAttribute('aria-pressed',String(muted));
    $('projection-mute').disabled=!mediaReady;
    ui.dataset.playback=mediaReady?(paused?'paused':'playing'):'loading';
  }
  function fail() {
    if(phase==='off'||phase==='closing')return;
    clearTimeout(timeout);
    status('Puedes reintentar la reproducción o abrir el video en otra pestaña.');
    $('projection-retry').hidden=false;
    placeCamera();
  }
  function stopMedia() {
    generation++;
    clearTimeout(timeout);
    mediaReady=false;
    if(player) player.destroy().catch(()=>{});
    player=null;
    if(mediaElement instanceof HTMLVideoElement) {
      mediaElement.pause();
      mediaElement.removeAttribute('src');
      mediaElement.load();
    }
    mediaElement?.remove();
    mediaElement=null;
    surface.hidden=true;
  }
  async function loadMedia() {
    stopMedia();
    const token=generation;
    const valid=()=>generation===token && phase==='watching';
    paused=true;
    muted=false;
    syncButtons();
    $('projection-retry').hidden=true;
    status('Cargando video…');
    const started=()=>{if(valid()){paused=false;status(video.title);syncButtons();}};
    const stopped=()=>{if(valid()){paused=true;syncButtons();}};
    const ended=()=>{if(valid()){paused=true;status('Fin del video. Puedes volver a reproducirlo o continuar el recorrido.');syncButtons();}};
    const failure=()=>{if(valid())fail();};
    const ready=()=>{if(valid()){clearTimeout(timeout);mediaReady=true;$('projection-retry').hidden=true;status(paused?'Pulsa reproducir para ver el video.':video.title);syncButtons();}};
    timeout=setTimeout(failure,20000);
    const embed=vimeoURL();
    if (embed) {
      try {
        await loadVimeo();
        if(!valid())return;
        const frame=document.createElement('iframe');
        frame.src=embed;
        frame.title=video.title;
        frame.allow='autoplay; fullscreen; picture-in-picture; encrypted-media';
        frame.referrerPolicy='strict-origin-when-cross-origin';
        frame.allowFullscreen=true;
        mediaElement=frame;
        surface.replaceChildren(frame);
        surface.hidden=false;
        const current=player=new Vimeo.Player(frame);
        current.on('play',started);
        current.on('pause',stopped);
        current.on('ended',ended);
        current.on('error',failure);
        current.on('volumechange',data=>{if(valid()){muted=data.volume===0||data.muted;syncButtons();}});
        await current.ready();
        if(!valid())return;
        ready();
        current.play().catch(()=>{if(valid())status('Pulsa reproducir para ver el video.');});
      } catch(_) { failure(); }
      return;
    }
    if (!source) {failure();return;}
    const element=document.createElement('video');
    mediaElement=element;
    element.controls=true;
    element.playsInline=true;
    element.setAttribute('aria-label', video.title);
    element.addEventListener('loadeddata',ready,{once:true});
    element.addEventListener('play',started);
    element.addEventListener('pause',stopped);
    element.addEventListener('ended',ended);
    element.addEventListener('error',failure);
    element.addEventListener('volumechange',()=>{if(valid()){muted=element.muted||element.volume===0;syncButtons();}});
    element.src=source;
    surface.replaceChildren(element);
    surface.hidden=false;
    element.play().catch(()=>{if(valid() && mediaReady)status('Pulsa reproducir para ver el video.');});
  }
  function placeCamera() {
    const canvas=engine.getRenderingCanvas(), viewportH=canvas.clientHeight, aspect=canvas.clientWidth/viewportH;
    camera.fov=savedPose.fov;
    // Reserve real space for the toolbar, including portrait and short landscape screens.
    const toolbarHeight=ui.getBoundingClientRect().height||150;
    const available=Math.max(120,viewportH-toolbarHeight-110);
    const fraction=Math.min(.7,available/viewportH);
    const tangent=Math.tan(camera.fov/2);
    let distance=Math.max(3.65,width/(2*tangent*aspect*.8),height/(2*tangent*fraction));
    if(distance>9.1){camera.fov=2*Math.atan(tangent*distance/9.1);distance=9.1;}
    camera.position.set(0,1.65,z-distance);
    const centerY=(75+viewportH-toolbarHeight-35)/2;
    const offset=(centerY/viewportH-.5)*2*Math.tan(camera.fov/2)*distance;
    camera.setTarget(new B.Vector3(x,top-height/2+offset,z));
  }
  function setDrop(value) {
    const amount=Math.max(.001,value);
    screen.scaling.y=face.scaling.y=amount;
    screen.position.y=face.position.y=top-height*amount/2;
    bar.position.y=top-height*amount-.025;
    lights.forEach(({light,intensity})=>{light.intensity=intensity*(1-value*.48);});
    scene.environmentIntensity=environment*(1-value*.35);
    lensMat.emissiveColor=new B.Color3(.28,.48,.7).scale(value);
    ledMat.emissiveColor=new B.Color3(.12,.7,1).scale(value);
  }
  function finishClose() {
    phase='off';progress=0;setDrop(0);
    [screen,face,bar,beam].forEach(m=>m.setEnabled(false));
    camera.position.copyFrom(savedPose.position);camera.rotation.copyFrom(savedPose.rotation);camera.fov=savedPose.fov;
    ui.hidden=true;document.body.classList.remove('projecting');onClose();
  }
  function open() {
    if(phase!=='off')return;
    savedPose={position:camera.position.clone(),rotation:camera.rotation.clone(),fov:camera.fov};
    phase='opening';progress=0;
    [screen,face,bar].forEach(m=>m.setEnabled(true));setDrop(0);
    document.body.classList.add('projecting');ui.hidden=false;status('Bajando la pantalla…');
    $('projection-retry').hidden=true;mediaReady=false;syncButtons();placeCamera();$('projection-close').focus();
  }
  function close(instant=false) {
    if(phase==='off')return;
    stopMedia();phase='closing';status('Guardando la pantalla…');
    if(instant)finishClose();
  }
  function update(dt) {
    const reduced=window.AULA_PREFS?.reduceMotion??matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(phase==='opening'){
      progress=reduced?1:Math.min(1,progress+dt/1.1);setDrop(progress);
      if(progress===1){phase='watching';beam.setEnabled(true);loadMedia();}
    }else if(phase==='closing'){
      progress=reduced?0:Math.max(0,progress-dt/.7);setDrop(progress);
      if(progress===0)finishClose();
    }
  }
  function align() {
    if(phase!=='watching')return;
    // Project world corners into CSS pixels; the homography keeps native video controls on the fabric.
    const viewport=new B.Viewport(0,0,engine.getRenderingCanvas().clientWidth,engine.getRenderingCanvas().clientHeight);
    const pts=[[-width/2,0],[width/2,0],[width/2,-height],[-width/2,-height]].map(([dx,dy])=>B.Vector3.Project(new B.Vector3(x+dx,top+dy,z-.022),B.Matrix.Identity(),scene.getTransformMatrix(),viewport));
    const [p0,p1,p2,p3]=pts;
    const renderW=Math.max(240,Math.round(Math.hypot(p1.x-p0.x,p1.y-p0.y)/4)*4),renderH=Math.round(renderW*9/16);
    surface.style.width=renderW+'px';surface.style.height=renderH+'px';
    const dx1=p1.x-p2.x,dx2=p3.x-p2.x,dx3=p0.x-p1.x+p2.x-p3.x;
    const dy1=p1.y-p2.y,dy2=p3.y-p2.y,dy3=p0.y-p1.y+p2.y-p3.y;
    const den=dx1*dy2-dx2*dy1;
    const g=Math.abs(den)<1e-8?0:(dx3*dy2-dx2*dy3)/den,h=Math.abs(den)<1e-8?0:(dx1*dy3-dx3*dy1)/den;
    surface.style.transform=`matrix3d(${(p1.x-p0.x+g*p1.x)/renderW},${(p1.y-p0.y+g*p1.y)/renderW},0,${g/renderW},${(p3.x-p0.x+h*p3.x)/renderH},${(p3.y-p0.y+h*p3.y)/renderH},0,${h/renderH},0,0,1,0,${p0.x},${p0.y},0,1)`;
  }
  $('projection-close').addEventListener('click',()=>close());
  $('projection-retry').addEventListener('click',()=>{if(phase==='watching')loadMedia();});
  $('projection-play').addEventListener('click',()=>{
    if(!mediaReady)return;
    if(mediaElement instanceof HTMLVideoElement){
      if(paused)mediaElement.play().catch(()=>status('Utiliza el control de reproducción dentro de la pantalla.'));
      else mediaElement.pause();
      return;
    }
    if(!player)return;
    (paused?player.play():player.pause()).catch(()=>status('Utiliza el control de reproducción dentro de la pantalla.'));
  });
  $('projection-mute').addEventListener('click',()=>{
    if(mediaElement instanceof HTMLVideoElement && mediaReady){
      mediaElement.muted=!muted;
      if(!mediaElement.muted && mediaElement.volume===0)mediaElement.volume=1;
    } else if(player&&mediaReady)player.setVolume(muted?1:0).catch(()=>status('Ajusta el sonido desde los controles del video.'));
  });
  interactive.filter(m=>m.position.z<1).forEach(m=>lighting.shadows.addShadowCaster(m));
  return {meshes:interactive,control:button,open,close,update,align,
    get isOpen(){return phase!=='off';},
    resize(){if(phase!=='off'){placeCamera();}},
    pause(){if(mediaElement instanceof HTMLVideoElement)mediaElement.pause();else if(player&&mediaReady)player.pause().catch(()=>{});}
  };
};
