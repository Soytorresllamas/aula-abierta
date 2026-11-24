window.buildDiversityBench = function(scene,h) {
  const {B,v,mat,tex,box,cylinder,rounded,tube,wood,page,graphite,shadowCasters,obstacle}=h;
  const groups={overview:[],lectura:[],pasos:[],manos:[],expresion:[]};
  const cx=-2.45,cz=4.1;
  const blue=mat('apoyos azul','#07599E'),cyan=mat('apoyos cian','#36B6DE');
  const pink=mat('apoyos rosa','#DC428D'),gold=mat('apoyos amarillo','#F2CE44');
  const leaf=mat('apoyos verde','#86B8A1'),rubber=mat('goma banca apoyos','#343E42');
  const tag=(m,id)=>{m.metadata={interactive:'support',supportId:id};groups[id].push(m);return m;};
  function graphic(name,w,height,paint){
    const m=mat(name,'#FFFFFF');m.diffuseTexture=tex(name+' lámina',w,height,paint);
    m.diffuseTexture.anisotropicFilteringLevel=8;return m;
  }
  function sheet(name,w,depth,x,y,z,angle,material,id){
    const mesh=B.MeshBuilder.CreatePlane(name,{width:w,height:depth},scene);
    mesh.rotation.set(Math.PI/2,angle,0);mesh.position=v(cx+x,y,cz+z);
    mesh.material=material;mesh.receiveShadows=true;shadowCasters.push(mesh);
    if(id)tag(mesh,id);return mesh;
  }
  function paper(name,w,depth,x,y,z,angle,material,id){
    const mesh=rounded(name,cx+x,y,cz+z,w,.006,depth,.002,material);
    mesh.rotation.y=angle;return tag(mesh,id);
  }
  const tabletop=tag(rounded('banca de apoyos',cx,.72,cz,1.4,.055,.8,.014,wood),'overview');
  rounded('canto banca de apoyos',cx,.681,cz,1.37,.035,.77,.009,wood);
  for(const dx of [-.59,.59])for(const dz of [-.30,.30]){
    cylinder('pata banca de apoyos',cx+dx,.347,cz+dz,.034,.65,graphite);
    cylinder('contera banca de apoyos',cx+dx,.014,cz+dz,.044,.028,rubber);
  }
  tube('travesaño banca de apoyos',v(cx-.59,.28,cz+.30),v(cx+.59,.28,cz+.30),.025,graphite);
  obstacle(cx,cz,1.4,.8);

  // A tucked, slightly turned chair keeps the central aisle clear.
  const firstChair=scene.meshes.length;
  rounded('asiento banca de apoyos',0,.435,0,.44,.045,.43,.015,wood);
  const back=rounded('respaldo banca de apoyos',0,.685,-.19,.44,.32,.035,.015,wood);back.rotation.x=-Math.PI/36;
  for(const dx of [-.18,.18]){
    cylinder('pata delantera silla apoyos',dx,.21,.16,.028,.42,graphite);
    tube('pata respaldo silla apoyos',v(dx,.014,-.16),v(dx,.845,-.204),.028,graphite);
    for(const dz of [-.16,.16])cylinder('contera silla apoyos',dx,.014,dz,.038,.028,rubber);
  }
  const chair=new B.TransformNode('silla girada de la banca',scene);chair.position=v(cx-.32,0,cz-.5);chair.rotation.y=.22;
  scene.meshes.slice(firstChair).forEach(m=>m.parent=chair);
  obstacle(chair.position.x,chair.position.z,.55,.54);

  // Offset folders and sheets give the bench the look of work in progress.
  paper('carpeta abierta de apoyos',.50,.39,-.33,.753,-.025,-.11,blue,'lectura');
  [-.045,.03].forEach((a,i)=>paper('hoja suelta de lectura '+i,.445,.33,-.32+i*.018,.760+i*.007,-.02-i*.012,a,page,'lectura'));
  const reading=graphic('lectura con guía',1024,768,(c,w,hh)=>{
    c.fillStyle='#fffdf5';c.fillRect(0,0,w,hh);c.fillStyle='#07599e';c.font='bold 52px sans-serif';c.fillText('Leemos juntos',65,100);
    c.font='38px sans-serif';c.fillStyle='#334957';['En el patio hay un árbol.','Sus hojas se mueven','cuando sopla el viento.'].forEach((line,i)=>c.fillText(line,65,235+i*80));
    c.fillStyle='#8ab8a0';c.beginPath();c.arc(740,570,87,0,7);c.fill();c.fillStyle='#a57d54';c.fillRect(730,635,20,88);
    c.strokeStyle='#c3dbdf';c.lineWidth=2;c.beginPath();c.moveTo(45,700);c.lineTo(620,700);c.stroke();
  });
  sheet('texto de lectura en banca',.44,.325,-.302,.773,-.03,.03,reading,'lectura');
  const guide=graphic('ventana de lectura',1024,160,(c,w,hh)=>{
    c.fillStyle='#87d3e9';c.fillRect(0,0,w,hh);c.fillStyle='#e9f9ff';c.fillRect(45,37,934,86);
    c.fillStyle='#214c69';c.font='37px sans-serif';c.fillText('Sus hojas se mueven',100,95);
  });
  sheet('guía azul sobre lectura',.42,.065,-.30,.779,-.013,.03,guide,'lectura');

  const steps=graphic('secuencia de tres pasos',768,1024,(c,w,hh)=>{
    c.fillStyle='#e9f7ff';c.fillRect(0,0,w,hh);c.fillStyle='#07599e';c.font='bold 60px sans-serif';c.fillText('Paso a paso',58,113);
    ['Miro','Hago','Reviso'].forEach((word,i)=>{
      const y=280+i*270;c.fillStyle=['#07599e','#007e9e','#ad0064'][i];c.beginPath();c.arc(139,y,60,0,7);c.fill();
      c.fillStyle='white';c.font='bold 62px sans-serif';c.fillText(String(i+1),119,y+22);c.fillStyle='#073966';c.font='bold 58px sans-serif';c.fillText(word,245,y+20);
    });
  });
  [-.19,.09,-.06].forEach((angle,i)=>paper('tarjeta apilada de pasos '+i,.25,.31,.285+i*.014,.756+i*.009,.14,angle,[gold,cyan,page][i],'pasos'));
  sheet('tarjeta visible de pasos',.25,.31,.313,.782,.14,-.06,steps,'pasos');

  const choices=graphic('tres maneras de responder',1024,512,(c,w,hh)=>{
    c.fillStyle='#ffdf55';c.fillRect(0,0,w,hh);c.fillStyle='#073966';c.font='bold 65px sans-serif';c.fillText('Puedo…',56,90);
    ['contar','dibujar','escribir'].forEach((label,i)=>{
      const x=58+i*320;c.fillStyle='#fffdf2';c.fillRect(x,140,278,245);c.strokeStyle='#07599e';c.lineWidth=9;
      if(i===0){c.strokeRect(x+60,190,160,85);c.beginPath();c.moveTo(x+85,275);c.lineTo(x+85,310);c.lineTo(x+125,275);c.stroke();}
      if(i===1){c.beginPath();c.moveTo(x+54,314);c.lineTo(x+145,200);c.lineTo(x+228,314);c.closePath();c.stroke();}
      if(i===2){[205,250,295].forEach(y=>{c.beginPath();c.moveTo(x+60,y);c.lineTo(x+218,y);c.stroke();});}
      c.fillStyle='#073966';c.font='bold 43px sans-serif';c.fillText(label,x+35,449);
    });
  });
  paper('tablero de opciones',.38,.20,-.38,.786,.26,.15,gold,'expresion');
  sheet('opciones de expresión en banca',.375,.195,-.38,.790,.26,.15,choices,'expresion');

  paper('base para agrupar fichas',.40,.26,.31,.756,-.22,.045,page,'manos');
  const blocks=[[-.11,-.07,blue],[-.04,-.065,blue],[-.08,.015,blue],[.09,-.04,gold],[.145,.025,gold],[.085,.08,pink],[.01,.07,leaf]];
  blocks.forEach(([x,z,m],i)=>{
    const cube=rounded('ficha de explorar '+i,cx+.31+x,.794,cz-.22+z,.055,.068,.055,.005,m);
    cube.rotation.y=i*.26;tag(cube,'manos');
  });
  // Everyday stationery bridges the material groups without adding new interactions.
  [-.05,.02].forEach((x,i)=>{
    const pencil=cylinder('lápiz suelto banca '+i,cx+x,.757,cz-.13,.014,.19,i?pink:gold);
    pencil.rotation.z=Math.PI/2;pencil.rotation.y=i?.48:-.18;
  });
  rounded('goma suelta banca',cx+.02,.765,cz+.15,.065,.028,.037,.006,pink);
  const labelMat=graphic('rótulo banca de apoyos',1536,288,(c,w,hh)=>{
    c.fillStyle='#07599e';c.fillRect(0,0,w,hh);c.fillStyle='#ffdf00';c.fillRect(0,0,40,hh);
    c.fillStyle='white';c.font='bold 113px sans-serif';c.textAlign='center';c.fillText('Banca de apoyos',w/2,183);
  });
  const sign=B.MeshBuilder.CreatePlane('rótulo frontal de la banca',{width:.86,height:.161},scene);
  sign.position=v(cx,.611,cz-.405);sign.material=labelMat;tag(sign,'overview');
  shadowCasters.push(sign);
  return {position:v(cx,.76,cz),groups,tabletop,approach:v(-1.2,1.65,3.65)};
};
