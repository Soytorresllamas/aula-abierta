/* Physically based surfaces. Source hashes and delivered encodings are in assets/materials/sources.json. */
window.enhanceClassroom = function(scene, room) {
  'use strict';
  const B = BABYLON;
  const white = () => new B.Color3(1,1,1);
  const color = hex => B.Color3.FromHexString(hex).toLinearSpace();
  const textures = new Map();
  function map(name, type, scale=1) {
    const key = name + '-' + type + '-' + scale;
    if (textures.has(key)) return textures.get(key);
    const t = new B.Texture('assets/materials/'+name+'-'+type+(type==='albedo'?'.webp':'.jpg'),scene);
    t.gammaSpace = type === 'albedo';
    t.uScale=scale;t.vScale=scale;t.anisotropicFilteringLevel=16;
    if(type === 'normal') t.level=.35;
    textures.set(key,t);return t;
  }
  function physicalMaps(m,name,scale=1) {
    // The painted walls get their color from the material, so only load their relief and roughness.
    m.albedoTexture=name==='plaster'?null:map(name,'albedo',scale);
    m.bumpTexture=map(name,'normal',scale);
    m.metallicTexture=map(name,'arm',scale);
    m.useRoughnessFromMetallicTextureAlpha=false;
    m.useRoughnessFromMetallicTextureGreen=true;
    m.useMetallnessFromMetallicTextureBlue=true;
    m.useAmbientOcclusionFromMetallicTextureRed=true;
    m.invertNormalMapY=true;
    m.metallic=1;m.roughness=1;
  }
  const replacements = new Map();
  for (const old of scene.materials.slice()) {
    if (!(old instanceof B.StandardMaterial)) continue;
    const m = new B.PBRMaterial(old.name,scene);
    m.albedoColor=old.diffuseColor.toLinearSpace();
    m.albedoTexture=old.diffuseTexture;
    m.emissiveColor=old.emissiveColor.clone();
    m.alpha=old.alpha;m.backFaceCulling=old.backFaceCulling;
    m.metallic=0;m.roughness=.78;
    m.maxSimultaneousLights=6;
    m.enableSpecularAntiAliasing=true;
    const n=old.name;
    if(n==='madera') {
      physicalMaps(m,'wood');m.albedoColor=white();m.roughness=.82;m.bumpTexture.level=.035;
      m.clearCoat.isEnabled=true;m.clearCoat.intensity=.07;m.clearCoat.roughness=.48;
    } else if(n==='terrazo') {
      physicalMaps(m,'floor');m.albedoColor=white();m.roughness=.82;
      m.bumpTexture.level=.22;
    } else if(n==='yeso marfil'||n==='zócalo verde'||n==='molduras') {
      physicalMaps(m,'plaster');
      m.albedoColor=color(n==='yeso marfil'?'#f7f6ed':n==='zócalo verde'?'#76a49c':'#fafaf2');
      m.bumpTexture.level=.018;m.roughness=n==='zócalo verde'?.78:1;
      // Paint retains fine plaster relief, with the source's unevenness visible at grazing light.
    } else if(n==='metal salvia') {
      m.albedoColor=color('#66716f');m.metallic=.45;m.roughness=.34;
    } else if(/metal|tornillo|acero|latón|herraje|aluminio/i.test(n)) {
      m.metallic=.75;m.roughness=.29;
    } else if(/goma|caucho/i.test(n)) {
      m.albedoColor=color('#333632');m.roughness=.92;
    } else if(n==='cantos madera') {
      physicalMaps(m,'wood');m.albedoColor=color('#a68a66');m.roughness=.72;
    } else if(n==='cubierta Valientes original'||n.startsWith('cubierta biblioteca ')) {
      m.albedoColor=white();m.roughness=.43;
      m.clearCoat.isEnabled=true;m.clearCoat.intensity=.18;m.clearCoat.roughness=.35;
    } else if(n==='huellas de uso madera') {
      m.useAlphaFromAlbedoTexture=true;m.transparencyMode=B.PBRMaterial.PBRMATERIAL_ALPHABLEND;m.roughness=.9;
    } else if(n==='pizarrón blanco escrito'||n==='pizarrón blanco') {
      m.roughness=.28;m.clearCoat.isEnabled=true;m.clearCoat.intensity=.15;m.clearCoat.roughness=.3;
    } else if(/vidrio/i.test(n)) {
      m.albedoColor=color('#e5f4fb');m.alpha=.018;m.roughness=.12;m.unlit=true;
      m.transparencyMode=B.PBRMaterial.PBRMATERIAL_ALPHABLEND;
    } else if(n==='difusor luminaria') {
      m.albedoColor=white();m.emissiveColor=new B.Color3(2.2,2.12,1.95);m.roughness=.35;
    } else if(n==='cielo patio') {
      m.unlit=true;m.albedoColor=white();m.emissiveColor=new B.Color3(0,0,0);
    } else if(n==='hojas patio detalle'||n==='avioncito de colores') {
      m.useAlphaFromAlbedoTexture=true;m.transparencyMode=B.PBRMaterial.PBRMATERIAL_ALPHATEST;m.alphaCutOff=.4;m.roughness=.86;
      if(n==='hojas patio detalle'){m.emissiveColor=new B.Color3(.035,.065,.012);m.backFaceCulling=false;}
    }
    replacements.set(old,m);
    if(room.materials[n]) room.materials[n]=m;
  }
  scene.meshes.forEach(mesh=>{if(replacements.has(mesh.material))mesh.material=replacements.get(mesh.material);});
  // Planar, world-sized UVs keep plaster and floor grains consistent across architectural faces.
  for(const mesh of scene.meshes) {
    if(!['yeso marfil','zócalo verde','molduras','terrazo'].includes(mesh.material?.name))continue;
    const p=mesh.getVerticesData(B.VertexBuffer.PositionKind);
    const n=mesh.getVerticesData(B.VertexBuffer.NormalKind);
    if(!p||!n)continue;
    const uv=[];mesh.computeWorldMatrix(true);
    const tile=mesh.material.name==='terrazo'?2.0:2.4;
    for(let i=0;i<p.length;i+=3){
      const q=B.Vector3.TransformCoordinates(new B.Vector3(p[i],p[i+1],p[i+2]),mesh.getWorldMatrix());
      const ax=Math.abs(n[i]),ay=Math.abs(n[i+1]),az=Math.abs(n[i+2]);
      uv.push((ax>ay&&ax>az?q.z:q.x)/tile,(ay>ax&&ay>az?q.z:q.y)/tile);
    }
    mesh.setVerticesData(B.VertexBuffer.UVKind,uv);
  }
  // Mix the photographed grain with its midtone before the lighting pass.
  class WoodGrain extends B.MaterialPluginBase {
    constructor(material) {
      super(material,'WoodGrain',160);
      this._enable(true);
    }
    getCustomCode(stage) {
      if (stage !== 'fragment') return null;
      return {CUSTOM_FRAGMENT_UPDATE_ALBEDO:
        'surfaceAlbedo = mix(surfaceAlbedo, vec3(0.43, 0.28, 0.16), 0.24);'};
    }
  }
  const baseWood=room.materials['madera'];
  const variants=[];
  for(let i=0;i<6;i++) {
    const m=baseWood.clone('madera barnizada '+i);
    const tint=1-i*.013;m.albedoColor=new B.Color3(tint,tint,tint);
    for(const key of ['albedoTexture','bumpTexture','metallicTexture']) {
      m[key]=baseWood[key].clone();
      m[key].uScale=1;m[key].vScale=1;
      m[key].uOffset=(i*.17)%1;m[key].vOffset=(i*.11)%1;
    }
    new WoodGrain(m);
    variants.push(m);
  }
  scene.meshes.forEach(mesh=>{
    if(mesh.material===baseWood) {
      const positions=mesh.getVerticesData(B.VertexBuffer.PositionKind),normals=mesh.getVerticesData(B.VertexBuffer.NormalKind),uv=[];
      if(positions&&normals){for(let j=0;j<positions.length;j+=3){const ax=Math.abs(normals[j]),ay=Math.abs(normals[j+1]),az=Math.abs(normals[j+2]);uv.push((ax>ay&&ax>az?positions[j+2]:positions[j])/1.83,(ay>ax&&ay>az?positions[j+2]:positions[j+1])/1.83);}mesh.setVerticesData(B.VertexBuffer.UVKind,uv);}

      const id=Number(mesh.name.match(/\d+/)?.[0]||0);
      mesh.material=variants[id%variants.length];
    }
  });
  scene.environmentTexture=B.CubeTexture.CreateFromPrefilteredData('assets/materials/daylight.env',scene);
  scene.environmentTexture.rotationY=.8;
  scene.environmentIntensity=.72;
  // Architecture blocks direct sun; window openings now produce real bands of light.
  const casters=new Set(room.shadowCasters);
  scene.meshes.forEach(mesh=>{
    if(/^(pared|muro|pilar ventana|techo|marco vertical|marco horizontal|parteluz|alféizar|puerta|dintel)/.test(mesh.name))casters.add(mesh);
  });
  room.shadowCasters=[...casters];
  addDeskContactShadows(scene,room);
  return {textureCount:textures.size,materialCount:replacements.size};
};

window.setupClassroomLighting = function(scene,camera,engine,room) {
  const B=BABYLON;
  scene.clearColor=new B.Color4(.55,.79,.96,1);
  scene.ambientColor=new B.Color3(0,0,0);
  scene.imageProcessingConfiguration.toneMappingEnabled=true;
  scene.imageProcessingConfiguration.toneMappingType=B.ImageProcessingConfiguration.TONEMAPPING_ACES;
  scene.imageProcessingConfiguration.exposure=1.16;
  scene.imageProcessingConfiguration.contrast=1.05;
  const sky=new B.HemisphericLight('luz difusa del patio',new B.Vector3(-1,.6,0),scene);
  // Warm floor bounce lifts the ceiling and furniture undersides; sky light stays neutral.
  sky.intensity=.48;sky.diffuse=new B.Color3(.9,.95,1);sky.groundColor=new B.Color3(.74,.72,.65);
  const sun=new B.DirectionalLight('sol a través de ventanas',new B.Vector3(1,-.55,.18).normalize(),scene);
  sun.position=new B.Vector3(-10,6,-4);
  sun.diffuse=new B.Color3(1,.95,.86);sun.intensity=3.4;
  sun.shadowMinZ=.1;sun.shadowMaxZ=30;
  const bounce=new B.PointLight('rebote del ventanal',new B.Vector3(-2.6,2.35,0),scene);
  bounce.diffuse=new B.Color3(.91,.96,1);bounce.intensity=13;bounce.range=6.8;
  [-2,2].forEach(z=>{
    const light=new B.PointLight('fluorescente '+z,new B.Vector3(0,3.09,z),scene);
    light.diffuse=new B.Color3(1,.98,.93);light.intensity=4.1;light.range=8;
  });
  const shadows=new B.ShadowGenerator(4096,sun);
  shadows.usePercentageCloserFiltering=true;
  shadows.filteringQuality=B.ShadowGenerator.QUALITY_HIGH;
  shadows.bias=.00025;shadows.normalBias=.009;shadows.setDarkness(0);
  room.shadowCasters.forEach(mesh=>shadows.addShadowCaster(mesh));
  let ao;
  if(B.SSAO2RenderingPipeline.IsSupported&&engine.webGLVersion>1) {
    ao=new B.SSAO2RenderingPipeline('contacto de superficies',scene,{ssaoRatio:.85,blurRatio:1},[camera],true);
    ao.radius=.14;ao.totalStrength=.68;ao.base=.08;ao.samples=16;ao.maxZ=22;ao.minZAspect=.03;ao.expensiveBlur=true;
  }
  const finish=new B.DefaultRenderingPipeline('acabado fotográfico',true,scene,[camera]);
  finish.fxaaEnabled=engine.webGLVersion<2;
  finish.bloomEnabled=true;finish.bloomThreshold=1.6;finish.bloomWeight=.045;finish.bloomKernel=32;
  finish.sharpenEnabled=true;finish.sharpen.edgeAmount=.12;finish.sharpen.colorAmount=1;
  finish.imageProcessing.ditheringEnabled=true;
  scene.textures.forEach(texture=>{texture.anisotropicFilteringLevel=16;});
  let mode='';
  return {shadows,finish,ao,setQuality(next){
    if(mode===next)return;mode=next;const high=next==='high';
    shadows.mapSize=high?4096:2048;
    if(high&&engine.webGLVersion>1){shadows.useContactHardeningShadow=true;shadows.contactHardeningLightSizeUVRatio=.015;}
    else shadows.usePercentageCloserFiltering=true;
    shadows.filteringQuality=high?B.ShadowGenerator.QUALITY_HIGH:B.ShadowGenerator.QUALITY_MEDIUM;
    const maxSamples=engine.getCaps().maxMSAASamples||1;
    finish.samples=engine.webGLVersion>1?Math.min(high?4:2,maxSamples):1;
    // Furniture and sunlight are fixed. A second-frame shadow refresh still follows the swaying leaves.
    shadows.getShadowMap().refreshRate=B.RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYTWOFRAMES;
    finish.bloomEnabled=high;
    if(ao){if(high)scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline(ao.name,[camera],true);else scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline(ao.name,[camera]);}
  }};
};

// Bake small occlusion footprints onto the desk surface. Each decal is parented
// to its desk and excluded from aiming, picking and collision.
function addDeskContactShadows(scene, room) {
  const B = BABYLON;
  const pixels = 512, width = .94, depth = .58;
  const mapX = value => (.5 + value / width) * pixels;
  const mapZ = value => (.5 - value / depth) * pixels;
  const types = /^(cuaderno alumno|tapas cuaderno en uso|lápiz alumno|estuche de tela|botella reutilizable|bloque páginas)\b|^lápiz en uso .* cuerpo$/u;
  function hull(points) {
    points.sort((a,b) => a.x-b.x || a.y-b.y);
    const half = items => {
      const result = [];
      for (const p of items) {
        while (result.length >= 2) {
          const [a,b] = result.slice(-2);
          if ((b.x-a.x)*(p.y-a.y) - (b.y-a.y)*(p.x-a.x) > 0) break;
          result.pop();
        }
        result.push(p);
      }
      result.pop();
      return result;
    };
    return [...half(points), ...half(points.slice().reverse())];
  }
  for (const [id, desk] of Object.entries(room.deskNodes)) {
    const props = desk.getChildMeshes().filter(mesh => types.test(mesh.name));
    if (!props.length) continue;
    const texture = new B.DynamicTexture('contacto de útiles '+id,pixels,scene,true);
    const context = texture.getContext();
    const inverse = desk.computeWorldMatrix(true).clone().invert();
    for (const mesh of props) {
      const matrix = mesh.computeWorldMatrix(true).multiply(inverse);
      const positions = mesh.getVerticesData(B.VertexBuffer.PositionKind);
      const points = [];
      for (let i=0;i<positions.length;i+=3) {
        const q = B.Vector3.TransformCoordinates(B.Vector3.FromArray(positions,i),matrix);
        points.push({x:mapX(q.x),y:mapZ(q.z)});
      }
      const outline = hull(points);
      context.beginPath();
      outline.forEach((p,i) => i ? context.lineTo(p.x,p.y) : context.moveTo(p.x,p.y));
      context.closePath();
      context.fillStyle='rgba(50,32,21,.48)';
      context.shadowColor='rgba(39,24,15,.53)';
      context.shadowBlur=4;
      context.shadowOffsetX=2;
      context.shadowOffsetY=1;
      context.fill();
    }
    texture.hasAlpha=true;
    texture.update();
    const material = new B.StandardMaterial('contacto sobre pupitre '+id,scene);
    material.diffuseTexture=texture;
    material.useAlphaFromDiffuseTexture=true;
    material.disableLighting=true;
    material.emissiveColor=B.Color3.White();
    material.disableDepthWrite=true;
    material.zOffset=-1;
    const decal=B.MeshBuilder.CreateGround('sombra de útiles '+id,{width,height:depth},scene);
    decal.parent=desk;
    decal.position.y=.74765;
    decal.material=material;
    decal.metadata={selectionPassThrough:true};
    decal.isPickable=false;
    decal.freezeWorldMatrix();
  }
}
