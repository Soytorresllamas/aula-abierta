/* The PDF renderer is imported only when a published PDF is opened. */
window.openSpanishSpread = function(host, spread, support, openSupport) {
  const make=(tag,text)=>{const node=document.createElement(tag);if(text)node.textContent=text;return node;};
  const button=(text,run)=>{const node=make('button',text);node.type='button';node.onclick=run;return node;};
  const url=window.aulaCatalogue.usableURL(spread.url);
  const tools=make('div');tools.className='spread-tools';
  const scroller=make('div');scroller.className='spread-window';scroller.tabIndex=0;
  scroller.setAttribute('role','region');scroller.setAttribute('aria-label','Doble página ampliable');
  const sheet=make('div');sheet.className='spread-sheet';scroller.append(sheet);
  const message=make('p');message.setAttribute('role','status');message.className='spread-message';
  const scale=make('output');
  let zoom=100,job,dead=false;
  const less=button('−',()=>setZoom(zoom-25)),more=button('+',()=>setZoom(zoom+25));
  less.setAttribute('aria-label','Reducir zoom');more.setAttribute('aria-label','Aumentar zoom');
  function setZoom(value){
    zoom=value;sheet.style.width=zoom+'%';scale.textContent=zoom+' %';
    less.disabled=zoom<=100;more.disabled=zoom>=300;
    if(zoom===100)scroller.scrollTo(0,0);
  }
  const original=make('a','Abrir archivo original');original.href=url;original.target='_blank';original.rel='noopener noreferrer';
  tools.append(less,scale,more,original);setZoom(100);
  host.replaceChildren(make('h2',spread.title));
  if(spread.instruction)host.append(make('p',spread.instruction));
  if(support){const link=button('Ver apoyo de la banca · '+support.object,openSupport);link.className='support-jump';host.append(link);}
  host.append(tools,message,scroller);
  const failure=()=>{if(dead)return;message.textContent='El visor no pudo mostrar este archivo. Puedes abrir el original.';};
  if(/\.pdf$/i.test(new URL(url).pathname)){
    (async()=>{
      message.textContent='Preparando las páginas…';
      const lib=await import('./vendor/pdfjs/pdf.min.mjs');
      if(dead)return;
      const assets=new URL('./vendor/pdfjs/',document.baseURI).href;
      lib.GlobalWorkerOptions.workerSrc=assets+'pdf.worker.min.mjs';
      job=lib.getDocument({url,isEvalSupported:false,enableXfa:false,standardFontDataUrl:assets+'standard_fonts/',wasmUrl:assets+'wasm/',cMapUrl:assets+'cmaps/',cMapPacked:true});
      const pdf=await job.promise;
      let first=1,busy=false;
      const previous=button('Páginas anteriores',()=>show(first-2));
      const next=button('Páginas siguientes',()=>show(first+2));
      if(pdf.numPages>2)tools.append(previous,next);
      async function show(start){
        if(dead||busy)return;busy=true;first=start;previous.disabled=next.disabled=true;
        try{
          const count=Math.min(2,pdf.numPages-start+1),pages=document.createDocumentFragment();
          for(let i=start;i<start+count;i++){
            if(dead)return;
            const page=await pdf.getPage(i);
            const base=page.getViewport({scale:1});
            const viewport=page.getViewport({scale:Math.min(3.5,2400/Math.max(base.width,base.height))});
            const canvas=make('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
            canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Página '+i);
            await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
            pages.append(canvas);
          }
          if(dead)return;
          sheet.style.gridTemplateColumns='repeat('+count+', minmax(0,1fr))';sheet.replaceChildren(pages);
          scroller.scrollTo(0,0);
          message.textContent=count===1?'Página '+start+' de '+pdf.numPages:'Páginas '+start+' y '+(start+1)+' de '+pdf.numPages;
        }catch{failure();}finally{busy=false;previous.disabled=first<=1;next.disabled=first+2>pdf.numPages;}
      }
      await show(1);
    })().catch(failure);
  }else{
    const image=make('img');image.alt=spread.title;image.onerror=failure;image.src=url;sheet.append(image);
  }
  return ()=>{dead=true;if(job)job.destroy().catch(()=>{});host.replaceChildren();};
};
