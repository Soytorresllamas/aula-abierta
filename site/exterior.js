/* A deeper, planted school courtyard. All surfaces are generated locally. */
window.buildSchoolCourtyard = function(scene, h) {
  const {B,v,mat,tex,box,cylinder,rounded,tube,wood,shadowCasters}=h;
  let seed=60217;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const sky=mat('cielo patio','#ffffff');
  sky.diffuseTexture=tex('cielo azul con nubes',4096,2048,(c,w,h)=>{
    const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#247bc4');g.addColorStop(.45,'#309fdc');g.addColorStop(.58,'#8ad6f4');g.addColorStop(1,'#acdff5');c.fillStyle=g;c.fillRect(0,0,w,h);
    for(let i=0;i<22;i++){
      const cx=random()*w,cy=h*(.29+random()*.17),scale=65+random()*95;
      for(let j=0;j<7;j++){
        const xx=cx+(random()-.5)*scale*3,yy=cy+(random()-.5)*scale*.35,r=scale*(.4+random()*.45);
        const cloud=c.createRadialGradient(xx,yy,0,xx,yy,r);cloud.addColorStop(0,'rgba(255,255,255,.75)');cloud.addColorStop(.55,'rgba(255,255,255,.48)');cloud.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=cloud;c.fillRect(xx-r,yy-r,r*2,r*2);
      }
    }
  });
  const dome=B.MeshBuilder.CreateSphere('cielo abierto del patio',{diameter:110,segments:32,sideOrientation:B.Mesh.BACKSIDE},scene);
  dome.material=sky;dome.isPickable=false;dome.metadata={selectionPassThrough:true};
  const pavement=mat('adoquín del patio','#ffffff');
  pavement.diffuseTexture=tex('losas finas del patio',1024,1024,(c,w,h)=>{
    c.fillStyle='#8faaa9';c.fillRect(0,0,w,h);
    for(let y=0;y<8;y++)for(let x=0;x<8;x++){const t=185+Math.floor(random()*16);c.fillStyle=`rgb(${t},${t+3},${t+1})`;c.fillRect(x*128+3,y*128+3,122,122);}
    for(let i=0;i<25000;i++){c.fillStyle=random()<.5?'#ffffff18':'#6b7c7b14';c.fillRect(random()*w,random()*h,1+random()*2,1+random()*2);}
  });pavement.diffuseTexture.uScale=4;pavement.diffuseTexture.vScale=5;pavement.diffuseTexture.anisotropicFilteringLevel=16;
  box('patio pavimentado',-10.8,-.025,0,13.6,.05,25,pavement,false);
  const grout=mat('juntas del patio','#94a5a3'),joints=[];
  for(let xx=-17.2;xx<-4.05;xx+=.8)joints.push(box('junta pavimento',xx,.003,0,.012,.004,25,grout,false));
  for(let zz=-12;zz<=12;zz+=.8)joints.push(box('junta pavimento',-10.8,.003,zz,13.6,.004,.012,grout,false));
  const jointMesh=B.Mesh.MergeMeshes(joints,true,true);jointMesh.name='retícula de juntas del patio';jointMesh.receiveShadows=true;
  const lawn=mat('césped del jardín','#ffffff');
  lawn.diffuseTexture=tex('hierba fina',512,512,(c,w,h)=>{
    c.fillStyle='#5e9c49';c.fillRect(0,0,w,h);
    for(let i=0;i<22000;i++){c.strokeStyle=['#91bb5a','#497e3b','#71a94d','#adc66e'][i%4];const x=random()*w,y=random()*h;c.beginPath();c.moveTo(x,y);c.lineTo(x+random()*4-2,y-random()*9-2);c.stroke();}
  });lawn.diffuseTexture.uScale=3;lawn.diffuseTexture.vScale=5;
  const border=mat('bordes claros del jardín','#e8e9db'),soil=mat('tierra jardín','#6a4d34');
  for(const [gx,gz,gw,gd] of [[-9.6,-7,4,4.5],[-10.8,6.3,5.5,6],[-15.4,0,2.3,5.2]]){
    rounded('jardinera exterior',gx,.1,gz,gw,.2,gd,.08,border);
    box('césped exterior',gx,.205,gz,gw-.15,.014,gd-.15,lawn,false);
  }
  const facade=mat('fachada luminosa','#fff5d8'),blue=mat('azul del patio','#139bd2'),deep=mat('marcos azul profundo','#07599e'),glass=mat('cristales del patio','#7cb8d0');
  box('edificio al otro lado del patio',-17,1.6,0,.3,3.2,25,facade,false);
  box('franja azul de fachada',-16.81,.43,0,.07,.85,25,blue,false);
  box('remate de fachada',-16.77,3.2,0,.38,.14,25,border,false);
  for(const zz of [-9,-5,5,9]){
    box('ventanal del edificio',-16.78,1.91,zz,.06,1.35,2.2,deep,false);
    box('reflejo de ventanal',-16.735,1.91,zz,.02,1.21,2.06,glass,false);
    box('parteluz exterior',-16.71,1.91,zz,.025,1.25,.055,border,false);
    box('travesaño exterior',-16.7,1.9,zz,.03,.05,2.1,border,false);
    box('alero azul',-16.4,2.72,zz,.8,.08,2.45,blue,false);
  }
  const mural=mat('mural del patio','#ffffff');
  mural.diffuseTexture=tex('papalotes y jardín del mural',2048,1024,(c,w,h)=>{
    c.fillStyle='#d3f0fa';c.fillRect(0,0,w,h);
    c.fillStyle='#40b9dd';c.beginPath();c.moveTo(0,h);c.bezierCurveTo(400,270,1100,1030,w,420);c.lineTo(w,h);c.fill();
    c.fillStyle='#0baab9';c.beginPath();c.moveTo(0,h);c.bezierCurveTo(600,520,1300,980,w,680);c.lineTo(w,h);c.fill();
    for(const [x,y,s,color] of [[500,300,180,'#ffe000'],[1250,240,220,'#ed1685']]){
      c.fillStyle=color;c.beginPath();c.moveTo(x,y-s);c.lineTo(x+s*.65,y);c.lineTo(x,y+s);c.lineTo(x-s*.65,y);c.closePath();c.fill();
      c.strokeStyle='#07599e';c.lineWidth=5;c.beginPath();c.moveTo(x,y+s);c.bezierCurveTo(x+50,y+330,x-120,y+300,x-50,810);c.stroke();
    }
    for(const [x,y] of [[220,190],[900,135],[1690,260]]){c.fillStyle='#ffffff';c.beginPath();c.ellipse(x,y,120,30,0,0,Math.PI*2);c.fill();c.beginPath();c.ellipse(x-35,y-18,43,35,0,0,Math.PI*2);c.fill();}
  });
  const muralPlane=B.MeshBuilder.CreatePlane('mural alegre del patio',{width:5.1,height:2.5},scene);muralPlane.rotation.y=-Math.PI/2;muralPlane.position.set(-16.69,1.65,0);muralPlane.material=mural;
  const bark=mat('corteza de árboles','#ffffff');
  bark.diffuseTexture=tex('corteza fina',256,512,(c,w,h)=>{
    c.fillStyle='#8b7354';c.fillRect(0,0,w,h);for(let i=0;i<160;i++){c.strokeStyle=i%2?'#65533d':'#b29a72';c.lineWidth=.5+random()*2;const x=random()*w;c.beginPath();c.moveTo(x,0);c.bezierCurveTo(x+9,150,x-9,350,x+random()*8,h);c.stroke();}
  });
  const leaf=mat('hojas patio detalle','#ffffff');
  leaf.diffuseTexture=tex('hojas con nervadura',128,256,(c,w,h)=>{
    c.clearRect(0,0,w,h);const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#699e32');g.addColorStop(.45,'#36792b');g.addColorStop(1,'#175125');c.fillStyle=g;c.beginPath();c.moveTo(64,5);c.bezierCurveTo(135,90,125,185,64,250);c.bezierCurveTo(3,185,-7,90,64,5);c.fill();c.strokeStyle='#80a950';c.lineWidth=1;c.beginPath();c.moveTo(64,240);c.lineTo(64,17);c.stroke();for(let y=55;y<230;y+=27){c.beginPath();c.moveTo(64,y+20);c.lineTo(25,y-10);c.moveTo(64,y+20);c.lineTo(102,y-10);c.stroke();}
  });leaf.diffuseTexture.hasAlpha=true;leaf.backFaceCulling=false;
  const foliage=B.MeshBuilder.CreatePlane('hojas individuales del patio',{width:.20,height:.34,sideOrientation:B.Mesh.DOUBLESIDE},scene);foliage.material=leaf;foliage.isPickable=false;
  const transforms=[];
  for(const [tx,tz,scale] of [[-8.9,-6,1],[-11.3,5,1.2],[-13.9,10,1.1],[-14.6,-9,1.15]]){
    const trunk=cylinder('tronco exterior',tx,1.32*scale,tz,.2*scale,2.64*scale,bark);trunk.receiveShadows=true;
    for(let j=0;j<7;j++){const angle=j*2.4,reach=.75*scale;tube('rama exterior',v(tx,1.5*scale+j*.12,tz),v(tx+Math.cos(angle)*reach,2.7*scale,tz+Math.sin(angle)*reach),.065*scale,bark);}
    for(let i=0;i<750;i++){
      const a=random()*Math.PI*2,u=random()*2-1,r=Math.cbrt(random()),s=.65+random()*.7;
      const pos=v(tx+Math.cos(a)*Math.sqrt(1-u*u)*r*1.5*scale,2.8*scale+u*r*1.2*scale,tz+Math.sin(a)*Math.sqrt(1-u*u)*r*1.5*scale);
      const matrix=B.Matrix.Compose(v(s,s,s),B.Quaternion.RotationYawPitchRoll(random()*6.28,random()*6.28,random()*6.28),pos);
      transforms.push(...matrix.asArray());
    }
  }
  const resting=new Float32Array(transforms),swaying=new Float32Array(transforms);
  foliage.thinInstanceSetBuffer('matrix',swaying,16,false);shadowCasters.push(foliage);
  const pot=mat('macetas terracota exteriores','#d58a56'),petalPink=mat('flores rosas','#ed5b9e'),petalYellow=mat('flores amarillas','#ffd742'),plantGreen=mat('arbustos verdes','#548a3c');
  for(const pz of [-3.6,0,3.6]){
    rounded('macetón junto a ventanas',-4.78,.23,pz,.65,.46,.85,.055,pot);
    box('tierra de macetón',-4.78,.465,pz,.54,.015,.73,soil,false);
    for(let j=0;j<7;j++){
      const px=-4.78+(random()-.5)*.45,zz=pz+(random()-.5)*.65,py=.63+random()*.22;
      tube('tallo de flor',v(px,.47,zz),v(px,py+.12,zz),.012,plantGreen);
      for(let k=0;k<3;k++){const a=k*2.1;const sprig=B.MeshBuilder.CreateSphere('hoja de jardinera',{diameter:1,segments:8},scene);sprig.scaling.set(.065,.17,.035);sprig.position.set(px+Math.cos(a)*.05,py-.08,zz+Math.sin(a)*.05);sprig.rotation.z=.7; sprig.rotation.y=a;sprig.material=plantGreen;}
      for(let k=0;k<5;k++){const a=k*1.256;const flower=B.MeshBuilder.CreateSphere('pétalos del patio',{diameter:1,segments:6},scene);flower.scaling.set(.065,.025,.09);flower.position.set(px+Math.cos(a)*.04,py+.12,zz+Math.sin(a)*.04);flower.rotation.y=-a;flower.material=j%2?petalPink:petalYellow;}
    }
  }
  const benchMetal=mat('metal de banca exterior','#086d9a');
  for(const zz of [-4.3,4.3]){
    for(const bx of [-12.3,-10.5]){box('pata banca patio',bx,.28,zz,.065,.56,.6,benchMetal);box('respaldo soporte patio',bx,.7,zz+.24,.05,.9,.05,benchMetal);}
    for(let i=0;i<4;i++)rounded('listón asiento patio',-11.4,.58,zz-.24+i*.16,2.05,.055,.12,.018,wood);
    for(let i=0;i<3;i++)rounded('listón respaldo patio',-11.4,.83+i*.14,zz+.27,2.05,.10,.05,.015,wood);
  }
  const game=mat('avioncito de colores','#ffffff');
  game.diffuseTexture=tex('juego pintado en el patio',512,1024,(c,w,h)=>{
    c.clearRect(0,0,w,h);const colors=['#159bd2','#efc92a','#ed6e92','#46bba5'];
    for(let i=0;i<8;i++){const y=920-i*112,x=i===2||i===5?32:164;c.fillStyle=colors[i%4];c.fillRect(x,y-98,180,96);c.strokeStyle='#ffffff';c.lineWidth=5;c.strokeRect(x+3,y-95,174,90);c.fillStyle='#ffffff';c.font='bold 65px sans-serif';c.textAlign='center';c.fillText(String(i+1),x+90,y-25);}
  });game.diffuseTexture.hasAlpha=true;game.backFaceCulling=false;
  let time=0,accumulated=0,wasMoving=false;
  const update=(dt,moving,fluid)=>{
    if(!moving){if(wasMoving){swaying.set(resting);foliage.thinInstanceBufferUpdated('matrix');wasMoving=false;}return;}
    time+=dt;accumulated+=dt;if(accumulated<(fluid?1/12:1/20))return;accumulated=0;wasMoving=true;
    for(let i=0;i<resting.length;i+=16){const phase=resting[i+12]*1.4+resting[i+14]*.7;const amount=Math.max(0,resting[i+13]-1.4)*.012;swaying[i+12]=resting[i+12]+Math.sin(time*.85+phase)*amount;swaying[i+14]=resting[i+14]+Math.cos(time*.7+phase)*amount*.55;}
    foliage.thinInstanceBufferUpdated('matrix');
  };
  const hop=B.MeshBuilder.CreateGround('avioncito del recreo',{width:1.2,height:3.5},scene);hop.position.set(-8.1,.007,.2);hop.material=game;
  return {update};
};
