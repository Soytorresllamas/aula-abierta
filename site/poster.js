/* Printed classroom poster using the supplied, unchanged Valientes artwork. */
window.buildValientesPoster = function(scene, h) {
  const {B,v,mat,tex,rounded}=h;
  const paper=mat('papel del póster Valientes','#ffffff');
  const paint=(c,w,h)=>{
    const gradient=c.createLinearGradient(0,0,0,h);gradient.addColorStop(0,'#07599e');gradient.addColorStop(.55,'#069ed4');gradient.addColorStop(1,'#63c4ea');
    c.fillStyle=gradient;c.fillRect(0,0,w,h);
    c.fillStyle='#ffffff';c.textAlign='center';c.font='800 218px Montserrat, sans-serif';c.fillText('Aprender es',w/2,365);c.fillText('de Valientes',w/2,655);
    c.fillStyle='#ffe000';c.fillRect(850,797,348,20);
    c.fillStyle='#07599e';c.beginPath();c.moveTo(0,2100);c.lineTo(w/2,2816);c.lineTo(w,2100);c.lineTo(w,2470);c.lineTo(w/2,2816);c.lineTo(0,2470);c.fill();
    c.fillStyle='#ffe000';c.beginPath();c.moveTo(1720,2290);c.lineTo(1885,2440);c.lineTo(1750,2620);c.lineTo(1585,2470);c.closePath();c.fill();
    c.fillStyle='#ec008c';c.beginPath();c.arc(260,2470,95,0,Math.PI*2);c.fill();
    c.fillStyle='#74d0ef';c.beginPath();c.arc(375,2565,75,0,Math.PI*2);c.fill();
  };
  paper.diffuseTexture=tex('Aprender es de Valientes',2048,2816,paint);
  paper.diffuseTexture.anisotropicFilteringLevel=16;
  document.fonts.ready.then(()=>{paint(paper.diffuseTexture.getContext(),2048,2816);paper.diffuseTexture.update();});
  const root=new B.TransformNode('póster Aprender es de Valientes',scene);root.position=v(3.872,2.07,3.62);root.rotation.y=Math.PI/2;
  const backing=mat('respaldo azul del póster','#07599e');
  const frame=rounded('soporte del póster Valientes',0,0,.012,1.145,1.545,.021,.009,backing);frame.parent=root;
  const poster=B.MeshBuilder.CreatePlane('mensaje Aprender es de Valientes',{width:1.12,height:1.52},scene);poster.parent=root;poster.material=paper;
  const art=mat('ilustración original del póster Valientes','#ffffff');
  art.diffuseTexture=new B.Texture('assets/valientes-espanol-1-cubierta.jpg',scene);
  // Sample only the illustration on the front cover; the source JPG stays untouched.
  art.diffuseTexture.uOffset=.55;art.diffuseTexture.uScale=.45;art.diffuseTexture.vOffset=.49;art.diffuseTexture.vScale=.33;art.diffuseTexture.anisotropicFilteringLevel=16;
  const illustration=B.MeshBuilder.CreatePlane('niño ave y papalote del póster',{width:1.12,height:.52},scene);illustration.parent=root;illustration.position=v(0,-.10,-.003);illustration.material=art;
  return root;
};
