/* Classroom coordinates: x -4..4, z -5..5; front is +z. */
window.buildClassroom = function (scene) {
  'use strict';
  const B = BABYLON, shadowCasters = [], obstacles = [], materials = {}, deskNodes = {};
  const v = (x,y,z) => new B.Vector3(x,y,z);
  function mat(name, color) { const m = new B.StandardMaterial(name,scene); m.diffuseColor = B.Color3.FromHexString(color); m.specularColor = new B.Color3(.035,.035,.035); materials[name]=m; return m; }
  const cream=mat('yeso marfil','#F4EFE2'), teal=mat('zócalo verde','#5F9394'), trim=mat('molduras','#FCF9EF'), metal=mat('metal salvia','#657D78'), wood=mat('madera','#D6A96C'), darkWood=mat('cantos madera','#AD8053'), page=mat('papel','#F9F4DF'), whiteboard=mat('pizarrón blanco','#FCFDFD'), charcoal=mat('tinta','#354C4A'), terracotta=mat('macetas','#BE7E61'), leaf=mat('hojas','#6C9254'), navy=mat('mochila azul','#5C748D'), rose=mat('mochila coral','#BC7F72'), yellow=mat('amarillo cálido','#DBB75E');
  let seed=173;
  function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
  function tex(name,w,h,paint){const t=new B.DynamicTexture(name,{width:w,height:h},scene,true);const c=t.getContext();paint(c,w,h);t.update();return t;}
  const floorMat=mat('terrazo','#DBD9CD');
  floorMat.diffuseTexture=tex('terrazo artesanal',1024,1024,(c,w,h)=>{c.fillStyle='#d8d7ca';c.fillRect(0,0,w,h);for(let i=0;i<13000;i++){c.fillStyle=['#b2b9ae','#ece9dd','#c3c7bc','#d0c6b2'][i%4];c.fillRect(rnd()*w,rnd()*h,1+rnd()*3,1+rnd()*3);}c.strokeStyle='#b8bdb3';c.lineWidth=2;for(let i=0;i<=4;i++){c.beginPath();c.moveTo(i*256,0);c.lineTo(i*256,h);c.moveTo(0,i*256);c.lineTo(w,i*256);c.stroke();}});
  floorMat.diffuseTexture.uScale=2;floorMat.diffuseTexture.vScale=2.5;
  wood.diffuseTexture=tex('veta de madera',512,512,(c,w,h)=>{c.fillStyle='#d9b780';c.fillRect(0,0,w,h);for(let i=0;i<130;i++){c.strokeStyle='rgba(137,91,43,'+(.035+rnd()*.07)+')';c.beginPath();let y=rnd()*h;c.moveTo(0,y);c.bezierCurveTo(150,y+rnd()*10,300,y-rnd()*10,w,y);c.stroke();}});
  function box(name,x,y,z,sx,sy,sz,m,cast=true){const o=B.MeshBuilder.CreateBox(name,{width:sx,height:sy,depth:sz},scene);o.position=v(x,y,z);o.material=m;o.receiveShadows=true;if(cast)shadowCasters.push(o);return o;}
  function cylinder(name,x,y,z,d,h,m){const o=B.MeshBuilder.CreateCylinder(name,{diameter:d,height:h,tessellation:16},scene);o.position=v(x,y,z);o.material=m;shadowCasters.push(o);return o;}
  function sphere(name,x,y,z,sx,sy,sz,m){const o=B.MeshBuilder.CreateSphere(name,{diameter:1,segments:8},scene);o.position=v(x,y,z);o.scaling=v(sx,sy,sz);o.material=m;return o;}
  // Six independently UV-mapped faces, projected onto a rounded cuboid.
  function rounded(name,x,y,z,sx,sy,sz,r,m){
    const mesh=new B.Mesh(name,scene),data=new B.VertexData(),positions=[],normals=[],uvs=[],indices=[];
    const half=[sx/2,sy/2,sz/2],core=half.map(h=>h-r);
    function stops(h){return [-h,-h+r*.134,-h+r*.5,-h+r,h-r,h-r*.5,h-r*.134,h];}
    for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
      const a=(axis+1)%3,b=(axis+2)%3,aa=stops(half[a]),bb=stops(half[b]),base=positions.length/3;
      for(let j=0;j<8;j++)for(let i=0;i<8;i++){
        const p=[0,0,0];p[axis]=sign*half[axis];p[a]=aa[i];p[b]=bb[j];
        const q=p.map((v,k)=>Math.max(-core[k],Math.min(core[k],v))),d=p.map((v,k)=>v-q[k]),len=Math.hypot(...d);
        const n=d.map(v=>v/len),out=q.map((v,k)=>v+n[k]*r);positions.push(...out);normals.push(...n);
        // Top uses x/z mapping so the full board has stable horizontal wood grain.
        uvs.push(axis===1?(out[0]/sx+.5):(out[a]/(half[a]*2)+.5),axis===1?(out[2]/sz+.5):(out[b]/(half[b]*2)+.5));
      }
      for(let j=0;j<7;j++)for(let i=0;i<7;i++){const k=base+j*8+i;if(sign===1)indices.push(k,k+9,k+1,k,k+8,k+9);else indices.push(k,k+1,k+9,k,k+9,k+8);}
    }
    data.positions=positions;data.normals=normals;data.uvs=uvs;data.indices=indices;data.applyToMesh(mesh);mesh.position=v(x,y,z);mesh.material=m;mesh.receiveShadows=true;shadowCasters.push(mesh);return mesh;
  }
  function tube(name,start,end,d,m){const delta=end.subtract(start),o=cylinder(name,0,0,0,d,delta.length(),m);o.position=start.add(end).scale(.5);const direction=delta.normalize(),axis=B.Vector3.Cross(B.Axis.Y,direction),angle=Math.acos(Math.max(-1,Math.min(1,B.Vector3.Dot(B.Axis.Y,direction))));o.rotationQuaternion=axis.lengthSquared()<1e-10?(direction.y>0?B.Quaternion.Identity():B.Quaternion.RotationAxis(B.Axis.X,Math.PI)):B.Quaternion.RotationAxis(axis.normalize(),angle);return o;}
  const graphite=mat('acero grafito','#444B4B'),rubber=mat('goma patas','#282D2C'),screw=mat('tornillería acero','#9DA4A2');
  function obstacle(x,z,w,d){obstacles.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});}
  box('suelo',0,-.08,0,8,.16,10,floorMat,false);
  box('pared del frente',0,1.7,5,8,3.4,.12,cream,false);
  box('pared trasera',0,1.7,-5,8,3.4,.12,cream,false);
  box('pared derecha',4,1.7,0,.12,3.4,10,cream,false);
  // Window bays are openings in the left wall rather than opaque panes.
  box('muro izquierdo inferior',-4,.54,0,.12,1.08,10,cream,false);
  box('muro izquierdo superior',-4,3.04,0,.12,.72,10,cream,false);
  const windowCenters=[-2.5,0,2.5];
  [-4.7,-3.75,-1.25,1.25,3.75,4.7].forEach((z,i)=>box('pilar ventana '+i,-4,1.9,z,.14,1.64,i===0||i===5?.6:.38,cream,false));
  box('techo',0,3.44,0,8,.08,10,trim,false);
  box('zócalo frente',0,.44,4.91,7.9,.88,.045,teal,false);
  box('zócalo fondo',0,.44,-4.91,7.9,.88,.045,teal,false);
  box('zócalo derecha',3.91,.44,0,.045,.88,9.85,teal,false);
  box('zócalo izquierda',-3.91,.44,0,.045,.88,9.85,teal,false);
  box('borde frente',0,.91,4.87,7.9,.055,.065,trim,false);
  box('borde fondo',0,.91,-4.87,7.9,.055,.065,trim,false);
  [-3.88,3.88].forEach(x=>box('borde lateral',x,.91,0,.055,.055,9.85,trim,false));
  const courtyard=window.buildSchoolCourtyard(scene,{B,v,mat,tex,box,cylinder,rounded,tube,wood,shadowCasters});
  windowCenters.forEach((z,i)=>{box('alféizar '+i,-3.9,1.1,z,.28,.08,2.12,trim,false);[-1.03,1.03].forEach(dz=>box('marco vertical',-3.92,1.92,z+dz,.09,1.64,.065,trim,false));[1.13,2.72].forEach(y=>box('marco horizontal',-3.92,y,z,.08,.065,2.15,trim,false));box('parteluz',-3.92,1.92,z,.085,1.6,.055,trim,false);});
  const glass=mat('vidrio ventanas','#D6E6E4');glass.alpha=.07;glass.backFaceCulling=false;glass.specularColor=new B.Color3(.55,.55,.55);
  windowCenters.forEach((z,i)=>{[-.52,.52].forEach(dz=>box('vidrio ventana '+i,-3.99,1.925,z+dz,.008,1.5,.98,glass,false));[1.18,2.66].forEach(y=>box('riel ventana '+i,-3.86,y,z,.03,.018,2.04,graphite,false));[-.08,.08].forEach(dz=>{box('placa cierre ventana',-3.85,1.85,z+dz,.018,.13,.025,graphite,false);box('tirador ventana',-3.82,1.85,z+dz,.04,.08,.016,screw,false);});});
  const stone=mat('zócalo piedra','#777C74'),outlet=mat('contactos marfil','#E9E5D9');
  box('base piedra frente',0,.065,4.865,7.85,.13,.045,stone,false);box('base piedra fondo',0,.065,-4.865,7.85,.13,.045,stone,false);[-3.865,3.865].forEach(x=>box('base piedra lateral',x,.065,0,.045,.13,9.75,stone,false));
  [-2.9,1.65].forEach(x=>{rounded('contacto fondo',x,.31,-4.855,.095,.14,.016,.005,outlet);[-.027,.027].forEach(dy=>[-.015,.015].forEach(dx=>box('ranura contacto',x+dx,.31+dy,-4.842,.005,.018,.004,graphite,false)));});
  box('puerta madera',2.85,1.18,-4.88,1.08,2.35,.055,wood,false);
  [2.27,3.43].forEach(x=>box('marco puerta',x,1.22,-4.83,.075,2.45,.1,trim,false));box('dintel puerta',2.85,2.46,-4.83,1.24,.075,.1,trim,false);
  const handle=mat('latón','#B7A45C');sphere('manija',2.43,1.02,-4.8,.07,.07,.07,handle);
  const aluminum=mat('aluminio pizarrón','#C9D0D2');
  box('pizarrón blanco',-.45,1.96,4.85,4.65,1.44,.08,whiteboard,false);
  [-2.82,1.92].forEach(x=>rounded('marco aluminio pizarrón',x,1.96,4.79,.055,1.55,.07,.012,aluminum));
  [1.2,2.72].forEach(y=>rounded('marco aluminio pizarrón',-.45,y,4.79,4.79,.055,.07,.012,aluminum));
  const drawOriginalBoard=(c,w,h)=>{
    c.fillStyle='#fcfdfd';c.fillRect(0,0,w,h);
    c.fillStyle='#13588e';c.font='500 136px sans-serif';c.fillText('Hoy descubrimos historias',230,275);
    c.fillStyle='#303c46';c.font='76px sans-serif';c.fillText('Escuchamos  ·  Imaginamos  ·  Compartimos',230,450);
    c.strokeStyle='#159ab3';c.lineWidth=7;c.lineCap='round';c.beginPath();c.moveTo(230,530);c.bezierCurveTo(1000,525,2450,541,3760,532);c.stroke();
    c.fillStyle='#303c46';c.font='88px sans-serif';c.fillText('Cada voz tiene algo que contar.',230,760);
    c.fillStyle='#13588e';c.font='70px sans-serif';c.fillText('¡Bienvenidos a nuestro salón!',230,1060);
    c.strokeStyle='#13588e';c.lineWidth=9;
    c.beginPath();c.moveTo(3410,1020);c.quadraticCurveTo(3310,940,3150,960);c.lineTo(3150,680);c.quadraticCurveTo(3310,665,3410,745);c.quadraticCurveTo(3510,665,3670,680);c.lineTo(3670,960);c.quadraticCurveTo(3510,940,3410,1020);c.lineTo(3410,745);c.stroke();
  };
  const boardTex=tex('lección en plumón',4096,1250,drawOriginalBoard);
  function writeLessonBoard(lines) {
    const context=boardTex.getContext();
    if (!lines) drawOriginalBoard(context,4096,1250);
    else {
      context.fillStyle='#fcfdfd';
      context.fillRect(0,0,4096,1250);
      context.fillStyle='#07599e';
      context.font='bold 137px sans-serif';
      context.fillText('La historia del papalote',215,260);
      context.fillStyle='#00a0bc';
      context.fillRect(215,340,3600,9);
      context.fillStyle='#163f60';
      context.font='88px sans-serif';
      lines.forEach((line,i)=>context.fillText(line,215,545+i*195,3580));
    }
    boardTex.update();
  }
  boardTex.anisotropicFilteringLevel=16;
  const inkBoard=mat('pizarrón blanco escrito','#FFFFFF');inkBoard.diffuseTexture=boardTex;
  const bp=B.MeshBuilder.CreatePlane('escritura del pizarrón',{width:4.59,height:1.4},scene);bp.position=v(-.45,1.96,4.798);bp.material=inkBoard;bp.metadata={interactive:'board'};
  rounded('bandeja plumones',-.45,1.17,4.69,4.79,.04,.2,.012,aluminum);
  rounded('borrador',1.5,1.215,4.66,.21,.06,.09,.012,charcoal);
  ['#165785','#333D46','#D84E49'].forEach((color,i)=>{
    const z=4.64+i*.035,x=.85-i*.26,cap=mat('tapa plumón '+i,color);
    cylinder('plumón blanco '+i,x,1.206,z,.023,.17,trim).rotation.z=Math.PI/2;
    cylinder('tapa plumón '+i,x-.10,1.206,z,.028,.044,cap).rotation.z=Math.PI/2;
  });
  // Supplied calendar, full image at its native aspect ratio, beside the board.
  const calendarWidth=1.05,calendarHeight=calendarWidth*1346/1040;
  const calendarPaper=mat('papel del calendario','#FFFFFF');
  box('soporte del calendario',2.88,1.9,4.929,calendarWidth+.012,calendarHeight+.012,.016,calendarPaper);
  const calendarMat=mat('calendario SM original','#FFFFFF');
  const calendarTexture=new B.Texture('assets/calendario-escolar-sm-2026-2027.png',scene);
  calendarTexture.anisotropicFilteringLevel=16;calendarMat.diffuseTexture=calendarTexture;
  const calendar=B.MeshBuilder.CreatePlane('calendario escolar SM 2026–2027',{width:calendarWidth,height:calendarHeight},scene);
  calendar.position=v(2.88,1.9,4.916);calendar.material=calendarMat;calendar.receiveShadows=true;
  [-.45,.45].forEach(dx=>{const pin=cylinder('chincheta calendario',2.88+dx,1.9+calendarHeight/2-.035,4.903,.018,.009,screw);pin.rotation.x=Math.PI/2;});
  function poster(name,text,x,y,z,width,height,side=false,bg='#FAF4DD'){const m=mat(name,'#FFFFFF');m.diffuseTexture=tex(name+' gráfico',512,512,(c,w,h)=>{c.fillStyle=bg;c.fillRect(0,0,w,h);c.strokeStyle='#90aca0';c.lineWidth=12;c.strokeRect(14,14,w-28,h-28);c.textAlign='center';c.fillStyle='#355e59';const lines=text.split('\n');lines.forEach((line,i)=>{c.font=(lines.length>4?'bold 47px':'bold 48px')+' sans-serif';c.fillText(line,w/2,90+i*83);});});const p=B.MeshBuilder.CreatePlane(name,{width,height},scene);p.position=v(x,y,z);if(side)p.rotation.y=Math.PI/2;p.material=m;return p;}
  const alphabetMat=mat('abecedario impreso','#FFFFFF');
  alphabetMat.diffuseTexture=tex('franja abecedario',2048,168,(c,w,h)=>{c.fillStyle='#f6f0dc';c.fillRect(0,0,w,h);c.strokeStyle='#afbbad';c.lineWidth=5;c.strokeRect(3,3,w-6,h-6);const letters='ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');const colors=['#476f6a','#a87867','#677f97','#99854d'];c.font='bold 77px sans-serif';c.textAlign='center';c.textBaseline='middle';letters.forEach((letter,i)=>{c.fillStyle=colors[i%4];c.fillText(letter,45+i*(w-90)/(letters.length-1),h/2+4);});});
  const alphabetPlane=B.MeshBuilder.CreatePlane('abecedario',{width:4.6,height:.38},scene);alphabetPlane.position=v(-.5,3.04,4.91);alphabetPlane.material=alphabetMat;
  // Two shallow suspended fluorescent housings with paired diffuser strips.
  const diffuser=mat('difusor luminaria','#FFF9E8');diffuser.emissiveColor=new B.Color3(.65,.63,.53);
  [-2,2].forEach((z,i)=>{box('carcasa luminaria '+i,0,3.28,z,1.5,.1,.43,metal,false);box('marco luminaria '+i,0,3.215,z,1.43,.035,.38,trim,false);[-.105,.105].forEach(dz=>box('difusor fluorescente '+i,0,3.193,z+dz,1.31,.012,.12,diffuser,false));});
  window.buildValientesPoster(scene,{B,v,mat,tex,rounded});
  poster('números','CONTAMOS\n1  2  3  4  5\n6  7  8  9  10',3.88,2.15,1.9,1.05,1.2,true,'#F3DFBF');
  poster('convivencia','NUESTRO SALÓN\nEscuchamos\nCuidamos\nCompartimos',3.88,2.1,-.5,1.15,1.2,true,'#DDE9DF');
  poster('bienvenida','¡BIENVENIDOS!\nUn lugar para\naprender juntos',-.95,2,-4.91,1.35,.9); // Rotate to face into room on rear wall.
  scene.getMeshByName('bienvenida').rotation.y=Math.PI;
  const clockFace=mat('reloj blanco','#F8F4E6');
  clockFace.diffuseTexture=tex('esfera reloj numerada',512,512,(c,w,h)=>{c.fillStyle='#f8f4e6';c.fillRect(0,0,w,h);c.translate(w/2,h/2);c.fillStyle='#353b39';c.textAlign='center';c.textBaseline='middle';c.font='38px sans-serif';for(let n=1;n<=12;n++){const a=n*Math.PI/6;c.fillText(String(n),Math.sin(a)*191,-Math.cos(a)*191);}for(let n=0;n<60;n++){const a=n*Math.PI/30;c.save();c.rotate(a);c.fillRect(-1.5,-239,3,n%5===0?17:8);c.restore();}});
  const clock=B.MeshBuilder.CreateCylinder('reloj',{diameter:.48,height:.055,tessellation:64},scene);clock.position=v(2.62,2.87,4.8);clock.rotation.x=Math.PI/2;clock.material=graphite;
  const clockPlane=B.MeshBuilder.CreateDisc('esfera frontal reloj',{radius:.2225,tessellation:64},scene);clockPlane.position=v(2.62,2.87,4.765);clockPlane.material=clockFace;
  const rim=B.MeshBuilder.CreateTorus('aro reloj',{diameter:.455,thickness:.022,tessellation:64},scene);rim.rotation.x=Math.PI/2;rim.position=v(2.62,2.87,4.756);rim.material=screw;
  box('aguja horas',2.62,2.925,4.748,.015,.13,.006,graphite,false);const minute=box('aguja minutos',2.68,2.89,4.741,.15,.009,.006,graphite,false);minute.rotation.z=.3;sphere('eje reloj',2.62,2.87,4.736,.028,.028,.012,graphite);
  function desk(x,z,id){
    const start=scene.meshes.length,anchor=new B.TransformNode('pupitre '+id,scene);anchor.position=v(x,0,z);deskNodes[id]=anchor;
    rounded('mesa '+id,x,.72,z,.95,.055,.59,.015,wood);
    rounded('canto mesa '+id,x,.681,z,.92,.033,.56,.008,darkWood);
    for(const dx of [-.39,.39])for(const dz of [-.21,.21]){cylinder('pata mesa '+id,x+dx,.347,z+dz,.032,.65,graphite);cylinder('contera mesa '+id,x+dx,.014,z+dz,.042,.028,rubber);rounded('escuadra mesa '+id,x+dx,.669,z+dz,.10,.02,.085,.004,graphite);const bolt=cylinder('perno mesa '+id,x+dx,.655,z+dz,.012,.008,screw);}
    tube('travesaño mesa '+id,v(x-.39,.25,z+.2),v(x+.39,.25,z+.2),.025,graphite);obstacle(x,z,.95,.59);
    const chairStart=scene.meshes.length;
    const cz=z-.51;rounded('asiento '+id,x,.435,cz,.44,.045,.43,.015,wood);const back=rounded('respaldo '+id,x,.685,cz-.19,.44,.32,.035,.015,wood);back.rotation.x=-Math.PI/36;
    for(const dx of [-.18,.18]){cylinder('pata silla '+id,x+dx,.21,cz+.16,.028,.42,graphite);tube('pata respaldo '+id,v(x+dx,.014,cz-.16),v(x+dx,.845,cz-.204),.028,graphite);for(const dz of [-.16,.16])cylinder('contera silla '+id,x+dx,.012,cz+dz,.038,.024,rubber);tube('soporte asiento '+id,v(x+dx,.40,cz-.17),v(x+dx,.40,cz+.17),.024,graphite);for(const dy of [-.09,.09]){const bolt=cylinder('tornillo respaldo '+id,x+dx,.685+dy,cz-.162,.012,.007,screw);bolt.rotation.x=Math.PI/2;}}
    tube('travesaño silla '+id,v(x-.18,.24,cz-.17),v(x+.18,.24,cz-.17),.023,graphite);
    const chairYaw=[2,6,10,13,18,22].includes(id)?(id%2?-.065:.075):0;
    const chairShift=chairYaw?-.025:0;
    const chairRoot=new B.TransformNode('posición silla '+id,scene);chairRoot.position=v(x,0,cz+chairShift);chairRoot.rotation.y=chairYaw;
    scene.meshes.slice(chairStart).forEach(mesh=>{mesh.position.subtractInPlace(v(x,0,cz));mesh.parent=chairRoot;});
    const withBag=id%7===0;
    obstacle(x,cz+chairShift-(withBag?.045:0),Math.max(withBag?.50:0,.44*Math.cos(chairYaw)+.43*Math.abs(Math.sin(chairYaw))),Math.max(withBag?.54:0,.43*Math.cos(chairYaw)+.44*Math.abs(Math.sin(chairYaw))));
    if(id%7===0){rounded('mochila '+id,x+.11,.25,cz-.2,.28,.34,.14,.025,id%2?rose:navy);rounded('bolsillo mochila '+id,x+.11,.21,cz-.285,.2,.15,.035,.012,id%2?rose:navy);}
    if(id!==3&&[5,10,16,22].includes(id)){rounded('cuaderno alumno '+id,x-.12,.757,z+.03,.22,.019,.29,.005,navy);box('hojas cuaderno '+id,x-.12,.767,z+.03,.208,.003,.276,page);const pencil=cylinder('lápiz alumno '+id,x+.20,.7535,z,.012,.25,yellow);pencil.rotation.z=Math.PI/2;pencil.rotation.y=.25;}
    // Furniture and its existing props share one anchor, preserving their world pose.
    const roots=new Set(scene.meshes.slice(start).map(mesh=>{let root=mesh;while(root.parent)root=root.parent;return root;}));
    roots.forEach(root=>root.setParent(anchor));
  }
  const deskRows=[-3.25,-1.4,.45,2.3];
  let id=0;deskRows.forEach(z=>[-2.55,-.9,.9,2.55].forEach(x=>desk(x,z,++id)));
  box('mesa docente',2.65,.78,4.06,1.52,.075,.72,wood);for(const dx of [-.65,.65])box('lateral mesa docente',2.65+dx,.385,4.06,.08,.74,.64,metal);box('frente mesa docente',2.65,.55,4.29,1.32,.35,.04,teal);obstacle(2.65,4.06,1.52,.72);
  // Teacher chair is tucked behind the desk within the front-right zone.
  box('asiento docente',2.65,.46,4.65,.45,.065,.4,charcoal);box('respaldo docente',2.65,.75,4.81,.45,.38,.05,charcoal);
  [-.18,.18].forEach(dx=>{box('pata silla docente',2.65+dx,.23,4.52,.035,.46,.035,metal);box('soporte respaldo docente',2.65+dx,.43,4.78,.035,.86,.035,metal);});obstacle(2.65,4.65,.45,.4);
  box('cuaderno docente',2.33,.835,4.03,.26,.035,.34,rose);cylinder('vaso lápices',3.03,.91,4.15,.12,.21,teal);[-.035,0,.035].forEach((dx,i)=>{const p=cylinder('lápiz docente',3.03+dx,1.055,4.15,.012,.2,i===1?rose:yellow);p.rotation.z=dx*3;});
  // Face-out books use the original catalog covers at their native aspect ratios.
  box('librero respaldo',3.84,.96,-3.8,.055,1.92,1.65,teal);
  [-4.64,-2.96].forEach(z=>rounded('librero lateral',3.67,.96,z,.39,1.92,.055,.012,wood));
  [.10,.68,1.25,1.83].forEach(y=>rounded('librero repisa',3.67,y,-3.8,.39,.065,1.7,.012,wood));
  obstacle(3.68,-3.8,.42,1.74);
  const libraryBooks=[];
  function shelfCover(book) {
    const cover=mat('cubierta biblioteca '+book.id,'#FFFFFF');
    const asset=window.aulaCatalogue.usableURL(book.asset);
    const fallback=()=>tex('rotulación '+book.id,256,352,ctx=>{
      ctx.drawImage(window.aulaCatalogue.placeholder(book),0,0,256,352);
    });
    if (!asset) {
      cover.diffuseTexture=fallback();
    } else if (asset.startsWith(new URL('assets/library/', document.baseURI).href)) {
      const texture=new B.Texture(asset,scene,false,true,B.Texture.TRILINEAR_SAMPLINGMODE,null,()=>{
        cover.diffuseTexture=fallback();
      });
      texture.anisotropicFilteringLevel=8;
      cover.diffuseTexture=texture;
    } else {
      // A publisher's external cover may load slowly or disallow canvas access.
      // Keep the named book selectable while its shelf thumbnail is decoded.
      const texture=cover.diffuseTexture=fallback();
      scene.executeWhenReady(()=>{
        const image=new Image();
        image.crossOrigin='anonymous';
        image.onload=()=>{
          const ctx=texture.getContext();
          ctx.drawImage(image,0,0,256,352);
          texture.update();
        };
        image.src=asset;
      });
    }
    return cover;
  }
  window.AULA_LIBRARY.slice(0,9).forEach((book,i)=>{
    const row=Math.floor(i/3),base=[1.25,.68,.10][row],z=[-3.23,-3.8,-4.37][i%3];
    const ratio=Math.min(5,Math.max(.2,Number(book.width)/Number(book.height) || .7));
    const height=Math.min(.44,.47/ratio),width=height*ratio,y=base+.035+height/2;
    const cover=shelfCover(book);
    rounded('páginas biblioteca '+book.id,3.57,y,z,.045,height-.006,width-.005,.002,page);
    box('contracubierta biblioteca '+book.id,3.597,y,z,.005,height,width,teal);
    const front=B.MeshBuilder.CreatePlane('portada biblioteca '+book.id,{width,height},scene);
    front.position=v(3.544,y,z);front.rotation.y=Math.PI/2;front.material=cover;front.receiveShadows=true;
    front.metadata={interactive:'library',libraryId:book.id};
    libraryBooks.push({id:book.id,position:front.position.clone()});
  });
  function plant(x,y,z){cylinder('maceta',x,y+.11,z,.22,.22,terracotta);for(let i=0;i<5;i++){const a=i*1.256;const o=sphere('hoja',x+Math.sin(a)*.1,y+.36,z+Math.cos(a)*.1,.14,.35,.09,leaf);o.rotation.z=Math.sin(a)*.55;}}
  plant(3.65,1.88,-3.55);plant(-3.7,1.15,2.9);
  window.addClassroomLife(scene,{deskNodes,deskRows,B,v,mat,tex,box,cylinder,rounded,tube,wood,page,teal,navy,rose,yellow,graphite,shadowCasters});
  const diversity=window.buildDiversityBench(scene,{B,v,mat,tex,box,cylinder,rounded,tube,wood,page,graphite,shadowCasters,obstacle});
  scene.meshes.forEach(mesh=>mesh.freezeWorldMatrix());
  // Original unfolded cover. Texture v=1 is image top: top/title edge lies at +z.
  const bookRoot=new B.TransformNode('Valientes Español 1',scene);bookRoot.position=v(.9,.7635,-3.25);bookRoot.setParent(deskNodes[3]);
  const bookMeshes=[];function bookChild(m){m.parent=bookRoot;m.metadata={interactive:'book'};bookMeshes.push(m);return m;}
  const coverMat=mat('cubierta Valientes original','#FFFFFF');const coverTexture=new B.Texture('assets/valientes-espanol-1-cubierta.jpg',scene);coverTexture.anisotropicFilteringLevel=16;coverMat.diffuseTexture=coverTexture;coverMat.backFaceCulling=false;
  function quad(name,pts,uv){const mesh=new B.Mesh(name,scene),d=new B.VertexData();d.positions=pts.flat();d.indices=[0,1,2,0,2,3];d.uvs=uv.flat();d.normals=[];B.VertexData.ComputeNormals(d.positions,d.indices,d.normals);d.applyToMesh(mesh);mesh.material=coverMat;return bookChild(mesh);}
  const bw=.33,bd=.44,bh=.032;
  const pages=bookChild(box('bloque páginas',0,0,0,bw-.006,bh-.006,bd-.01,page));
  quad('cubierta frontal',[[-bw/2,bh/2,-bd/2],[bw/2,bh/2,-bd/2],[bw/2,bh/2,bd/2],[-bw/2,bh/2,bd/2]],[[.521,0],[1,0],[1,1],[.521,1]]);
  quad('contracubierta',[[-bw/2,-bh/2,bd/2],[bw/2,-bh/2,bd/2],[bw/2,-bh/2,-bd/2],[-bw/2,-bh/2,-bd/2]],[[.479,1],[0,1],[0,0],[.479,0]]);
  quad('lomo',[[-bw/2,-bh/2,-bd/2],[-bw/2,bh/2,-bd/2],[-bw/2,bh/2,bd/2],[-bw/2,-bh/2,bd/2]],[[.479,0],[.521,0],[.521,1],[.479,1]]);
  const edge=mat('líneas páginas','#DBD5C1');for(let i=0;i<5;i++)bookChild(box('borde páginas '+i,bw/2-.002,-.01+i*.004,0,.001,.0007,bd-.012,edge,false));
  bookMeshes.forEach(m=>{m.receiveShadows=true;if(!shadowCasters.includes(m))shadowCasters.push(m);});
  return {writeLessonBoard,deskNodes,deskRows,geometry:{rounded},courtyard,bookRoot,bookMeshes,libraryBooks,diversity,bookPosition:bookRoot.getAbsolutePosition().clone(),obstacles,spawn:{x:0,y:1.65,z:-4.25,yaw:0,pitch:.05},shadowCasters,materials};
};
