/* Small traces of an ordinary school day. Illustrations and exercise pages are fictional. */
window.addClassroomLife = function(scene, h) {
  'use strict';
  const {B,v,mat,tex,box,cylinder,rounded,tube,wood,page,teal,navy,rose,yellow,graphite,shadowCasters}=h;
  let seed=241;
  const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const first=scene.meshes.length;
  function plane(name,w,height,x,y,z,material,rx=0,ry=0,rz=0){
    const p=B.MeshBuilder.CreatePlane(name,{width:w,height},scene);
    p.position=v(x,y,z);p.rotation.set(rx,ry,rz);p.material=material;p.receiveShadows=true;return p;
  }
  const ink=mat('grafito de lápiz','#4F5052'),pink=mat('goma rosa','#D99198');
  const tape=mat('cinta de papel','#D9CCA7');tape.alpha=.8;
  const cork=mat('corcho del mural','#B89164');
  cork.diffuseTexture=tex('corcho fino',512,512,(c,w,height)=>{
    c.fillStyle='#b89164';c.fillRect(0,0,w,height);
    for(let i=0;i<7000;i++){c.fillStyle=i%2?'#99784b55':'#e4c89866';c.fillRect(rand()*w,rand()*height,1+rand()*3,1+rand()*2);}
  });
  const artwork=['Mi comunidad','El jardín','Una aventura'].map((label,i)=>{
    const m=mat('dibujo escolar '+i,'#FFFFFF');
    m.diffuseTexture=tex('lámina de colores '+i,768,576,(c,w,height)=>{
      c.fillStyle=['#fff9e9','#f8faf0','#fff8f3'][i];c.fillRect(0,0,w,height);
      c.lineCap='round';c.lineJoin='round';
      const stroke=(color,points,width=7)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],j)=>j?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
      // Short overlapping strokes give the drawings a colored-pencil character.
      for(let k=0;k<34;k++)stroke('#7dab6925',[[55+k*19,449+rand()*22],[75+k*19,423+rand()*26]],4);
      c.fillStyle='#efcd57';c.beginPath();c.arc(640,108,39,0,Math.PI*2);c.fill();
      for(let k=0;k<9;k++){const a=k*Math.PI*2/9;stroke('#e7bf43',[[640+Math.cos(a)*53,108+Math.sin(a)*53],[640+Math.cos(a)*70,108+Math.sin(a)*70]],5);}
      if(i===0){
        stroke('#6b9bb9',[[85,431],[88,224],[300,227],[304,434],[85,431]]);
        stroke('#ce8064',[[58,222],[194,118],[330,224]],11);
        stroke('#7c9179',[[171,430],[173,327],[222,325],[223,431]]);
        stroke('#75aac1',[[115,263],[150,264],[150,306],[115,304],[115,263]],5);
        stroke('#85694f',[[485,433],[485,298]],10);
        c.fillStyle='#92b36b';[[452,268],[495,228],[523,276]].forEach(([x,y])=>{c.beginPath();c.arc(x,y,56,0,7);c.fill();});
      }else if(i===1){
        [160,326,496].forEach((x,k)=>{const y=225+k*25;stroke('#679d69',[[x,428],[x-4,y]],8);stroke('#679d69',[[x,363],[x-52,328],[x,346],[x+47,318]],6);c.fillStyle=['#d78692','#e8bb60','#8e98c5'][k];for(let petal=0;petal<6;petal++){const a=petal*Math.PI/3;c.beginPath();c.ellipse(x+Math.cos(a)*31,y+Math.sin(a)*31,26,21,a,0,7);c.fill();}c.fillStyle='#f0cf68';c.beginPath();c.arc(x,y,17,0,7);c.fill();});
      }else{
        stroke('#5685b5',[[132,424],[320,189],[475,419]],8);stroke('#87ad7d',[[346,422],[523,231],[686,430]],8);
        stroke('#d0829d',[[390,93],[461,166],[400,241],[335,163],[390,93]],9);stroke('#c78d72',[[400,240],[390,301],[424,344],[405,409]],4);
        stroke('#91b8c4',[[97,149],[127,133],[156,149],[183,133],[211,148]],6);
      }
      c.fillStyle='#6b6a5b';c.font='28px cursive';c.fillText(label,48,533);
      for(let k=0;k<80;k++){c.fillStyle='#beac8420';c.fillRect(rand()*w,rand()*height,1,1);}
    });m.diffuseTexture.anisotropicFilteringLevel=8;return m;
  });
  function drawing(name,x,y,z,w,height,kind,rear,tilt){
    const sheet=plane(name,w,height,x,y,z,artwork[kind],0,rear?Math.PI:0,tilt);
    shadowCasters.push(sheet);
    const frontZ=z+(rear?.006:-.006);
    [-.32,.32].forEach((dx,i)=>{const strip=box('cinta '+name+' '+i,x+dx*w,y+height*.48,frontZ,.075,.028,.002,tape,false);strip.rotation.z=tilt+(i?-.12:.09);});
  }
  // Three small works beside the whiteboard, plus a pinboard on the rear wall.
  [0,1,2].forEach(i=>drawing('trabajo junto al pizarrón '+i,-3.39,2.62-i*.52,4.916,.48,.36,i,false,[.028,-.035,.018][i]));
  rounded('marco mural de trabajos',-2.73,2.0,-4.864,1.70,1.12,.052,.012,wood);
  box('corcho mural de trabajos',-2.73,2.0,-4.828,1.61,1.03,.012,cork,false);
  for(let i=0;i<6;i++)drawing('trabajo en mural '+i,-2.73+[-.50,0,.50][i%3],2.0+(i<3?.23:-.23),-4.816,.42,.32,i%3,true,[.035,-.022,.017,-.018,.03,-.04][i]);

  const notebookMaterials=[0,1,2].map(i=>{
    const m=mat('cuaderno abierto '+i,'#FFFFFF');
    m.diffuseTexture=tex('ejercicio a lápiz '+i,1024,768,(c,w,height)=>{
      c.fillStyle='#fffdf2';c.fillRect(0,0,w,height);
      c.strokeStyle='#91b9d644';c.lineWidth=2;
      for(let y=90;y<720;y+=45){c.beginPath();c.moveTo(32,y);c.lineTo(485,y);c.moveTo(540,y);c.lineTo(995,y);c.stroke();}
      c.strokeStyle='#d6a19d77';[92,592].forEach(x=>{c.beginPath();c.moveTo(x,28);c.lineTo(x,744);c.stroke();});
      c.fillStyle='#545b68';c.font='40px cursive';
      const lines=[['Mi historia','Había una vez','un jardín lleno','de mariposas.'],['Contamos','2 + 3 = 5','4 + 2 = 6','5 + 1 = 6'],['Palabras','casa','árbol','amigos']][i];
      lines.forEach((line,n)=>c.fillText(line,115,130+n*89));
      c.font='36px cursive';c.fillText(['Un nuevo día','1  2  3  4  5','Mi dibujo'][i],615,130);
      c.strokeStyle=['#b78e5f','#84a6ad','#96b278'][i];c.lineWidth=8;c.beginPath();c.moveTo(642,565);c.lineTo(790,361);c.lineTo(937,565);c.stroke();
      c.strokeStyle='#739aa6';c.lineWidth=5;c.strokeRect(688,558,205,95);
      const gutter=c.createLinearGradient(487,0,537,0);gutter.addColorStop(0,'#74644800');gutter.addColorStop(.5,'#74644832');gutter.addColorStop(1,'#74644800');c.fillStyle=gutter;c.fillRect(487,0,50,height);
    });m.diffuseTexture.anisotropicFilteringLevel=8;return m;
  });
  function deskLocation(id){const anchor=h.deskNodes[id];if(!anchor)throw new Error('Missing desk '+id);return {x:anchor.position.x,z:anchor.position.z};}
  function pencil(name,x,z,angle,color){
    const root=new B.TransformNode(name,scene);root.position=v(x,.7535,z);root.rotation.y=angle;
    const body=cylinder(name+' cuerpo',0,0,0,.011,.16,color);body.rotation.z=Math.PI/2;body.parent=root;
    const point=B.MeshBuilder.CreateCylinder(name+' punta',{diameterTop:0,diameterBottom:.011,height:.018,tessellation:6},scene);point.rotation.z=-Math.PI/2;point.position.x=.089;point.material=ink;point.parent=root;
    const eraser=cylinder(name+' goma',-.085,0,0,.012,.012,pink);eraser.rotation.z=Math.PI/2;eraser.parent=root;
  }
  [2,6,9,11,14,15,13].forEach((id,i)=>{
    const {x,z}=deskLocation(id),angle=[.055,-.075,.025,-.04,.08,-.055,.03][i];
    const cover=rounded('tapas cuaderno en uso '+id,x-.09,.7535,z-.01,.385,.012,.276,.003,[navy,rose,teal][i%3]);cover.rotation.y=angle;
    const pages=box('páginas cuaderno en uso '+id,x-.09,.7635,z-.01,.373,.008,.267,page,false);pages.rotation.y=angle;
    plane('ejercicio sobre pupitre '+id,.373,.267,x-.09,.7678,z-.01,notebookMaterials[i%3],Math.PI/2,angle);
    pencil('lápiz en uso '+id,x+.23,z-.075,.24+i*.12,yellow);
    if([2,11,15].includes(id)){
      const pouch=rounded('estuche de tela '+id,x+.23,.7785,z+.16,.235,.062,.095,.018,[rose,navy,teal][i%3]);pouch.rotation.y=-.09;
      const zip=box('cremallera estuche '+id,x+.23,.811,z+.16,.19,.002,.005,graphite,false);zip.rotation.y=-.09;
    }
    if([6,14].includes(id)){
      cylinder('botella reutilizable '+id,x+.32,.8325,z+.14,.067,.17,teal);
      cylinder('tapa botella '+id,x+.32,.9275,z+.14,.053,.022,navy);
    }
  });
  // Reading bookmarks rest on the closed notebook covers.
  [5,16].forEach((id,i)=>{const {x,z}=deskLocation(id);box('separador cuaderno '+id,x-.17,.769,z+.03,.035,.001,.20,i?rose:yellow,false);});
  [7,14].forEach(id=>{const {x,z}=deskLocation(id);
    const path=[v(x+.045,.39,z-.71),v(x+.045,.46,z-.71),v(x+.11,.475,z-.71),v(x+.175,.46,z-.71),v(x+.175,.39,z-.71)];
    const loop=B.MeshBuilder.CreateTube('asa mochila '+id,{path,radius:.008,tessellation:6},scene);loop.material=navy;
    box('cremallera mochila '+id,x+.11,.285,z-.796,.15,.006,.003,graphite,false);
  });

  const wear=mat('huellas de uso madera','#FFFFFF');
  wear.diffuseTexture=tex('roces leves de pupitre',1024,640,(c,w,height)=>{
    c.clearRect(0,0,w,height);c.lineCap='round';
    for(let i=0;i<26;i++){
      const x=45+rand()*910,y=i<15?548+rand()*46:45+rand()*520;
      c.strokeStyle=i%3?'rgba(202,176,137,.22)':'rgba(78,61,42,.12)';c.lineWidth=1+rand()*1.3;
      c.beginPath();c.moveTo(x,y);c.lineTo(Math.min(975,x+12+rand()*54),y+rand()*4-2);c.stroke();
    }
  });wear.diffuseTexture.hasAlpha=true;wear.useAlphaFromDiffuseTexture=true;
  [1,6,10,15].forEach(id=>{const {x,z}=deskLocation(id);const marks=plane('roces pupitre '+id,.91,.55,x,.7485,z,wear,Math.PI/2,0,id%2?Math.PI:0);marks.metadata={selectionPassThrough:true};});
  const note=mat('nota de lectura','#F1DF95');note.diffuseTexture=tex('recordatorio manuscrito',256,256,(c,w,height)=>{
    c.fillStyle='#f1df95';c.fillRect(0,0,w,height);c.fillStyle='#626047';c.font='30px cursive';c.fillText('Leer',29,89);c.fillText('juntos',29,138);c.strokeStyle='#ad8b65';c.lineWidth=3;c.beginPath();c.moveTo(29,162);c.lineTo(191,158);c.stroke();
  });
  plane('nota junto al pizarrón',.21,.20,1.72,2.52,4.783,note,0,0,-.06);
  const magnet=cylinder('imán de nota',1.72,2.61,4.774,.026,.009,rose);magnet.rotation.x=Math.PI/2;
  // Anchor every desk accessory to the actual furniture node. Layout changes now
  // carry papers, pencils, pouches and bottles with their supporting desk.
  const attachments=new Map();
  scene.meshes.slice(first).forEach(mesh=>{
    if(!/^(tapas cuaderno en uso|páginas cuaderno en uso|ejercicio sobre pupitre|lápiz en uso|estuche de tela|cremallera estuche|botella reutilizable|tapa botella|separador cuaderno|asa mochila|cremallera mochila|roces pupitre) /.test(mesh.name))return;
    const id=Number(mesh.name.match(/ (\d+)(?: |$)/)[1]);mesh.metadata={...mesh.metadata,deskId:id};
    let root=mesh;while(root.parent)root=root.parent;attachments.set(root,id);
  });
  attachments.forEach((id,root)=>root.setParent(h.deskNodes[id]));
  // Props fit inside furniture footprints. The aim ray still treats them as visible blockers.
  scene.meshes.slice(first).forEach(mesh=>{mesh.isPickable=false;});
};
