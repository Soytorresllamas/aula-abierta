/* An optional classroom story. All student work stays in this page's memory. */
window.createKiteLesson = function createKiteLesson(api) {
  const byId = id => document.getElementById(id);
  const dialog = byId('lesson-dialog');
  const content = byId('lesson-content');
  const places = {
    patio: ['el patio de la escuela', 'El hilo quedó atrapado en la portería.'],
    jardin: ['el jardín', 'Una rama bajita detuvo el hilo.'],
    ventana: ['la ventana del salón', 'La cola de colores asomó por el marco.']
  };
  const cards = [
    'El grupo encuentra el hilo.',
    'Una amiga sostiene el papalote.',
    'Una ráfaga lo devuelve al cielo.'
  ];
  const createDraft = () => ({
    step: 'idle', place: 'patio', mode: '', order: [], marks: [], ink: '#07599e', oralDone: false
  });
  let draft = createDraft();

  function station() {
    if (draft.step === 'bench') return 'apoyos';
    if (['place','closing'].includes(draft.step)) return 'pizarron';
    return 'libro';
  }

  function goTo(destination) {
    api.navigate(destination);
    if (destination === 'libro') api.openMaterial('libro');
    else open();
  }

  const walking = () => byId('lesson-walk')?.checked;
  function nextStation() {
    if (walking()) api.walk();
    else goTo(station());
  }

  function refreshRoute(isActive) {
    const route = byId('lesson-route');
    if (!route) return;
    route.hidden = !(isActive && walking() && ['place','bench','closing'].includes(draft.step));
    if (!route.hidden) {
      const name = station() === 'apoyos' ? 'la banca de apoyos' : 'el pizarrón';
      route.textContent = 'Siguiente parada: ' + name;
      route.title = 'Acercarme y abrir la actividad';
    }
  }

  function showDestination() {
    const starting = draft.step === 'idle' || draft.step === 'finished';
    if (byId('lesson-start')) byId('lesson-start').textContent = starting ? 'La historia del papalote' : 'Continuar la historia del papalote';
    if (byId('lesson-from-menu')) byId('lesson-from-menu').textContent = starting ? 'Ir a la miniclase' : 'Continuar la miniclase';
  }

  function opening() {
    return 'El papalote se soltó y cayó en ' + places[draft.place][0] + '.';
  }

  function start() {
    api.stopTour();
    if (draft.step === 'idle' || draft.step === 'finished') {
      draft = createDraft();
      draft.step = 'place';
      api.writeBoard(['El papalote se soltó de la mano del niño.', 'Elige dónde caerá.']);
    }
    showDestination();
    nextStation();
  }

  function action(label, onClick, primary = false) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = primary ? 'button lesson-primary' : 'button secondary';
    element.textContent = label;
    element.addEventListener('click', onClick);
    return element;
  }

  function putText(tag, text, target = content) {
    const element = document.createElement(tag);
    element.textContent = text;
    target.append(element);
    return element;
  }

  function stationHeading(label, instruction) {
    putText('h3', label);
    putText('p', instruction);
  }

  function renderPlace() {
    stationHeading('Pizarrón · Elige dónde cae', 'En la portada, el niño sostiene el hilo. Imagina que una ráfaga se lo lleva.');
    const label = putText('label', 'Lugar de la caída');
    label.htmlFor = 'kite-place';
    const select = document.createElement('select');
    select.id = 'kite-place';
    Object.entries(places).forEach(([key, [place]]) => {
      select.add(new Option(place.charAt(0).toUpperCase() + place.slice(1), key));
    });
    select.value = draft.place;
    content.append(select);
    const preview = putText('p', opening());
    preview.className = 'kite-opening';
    preview.setAttribute('aria-live','polite');
    select.addEventListener('change', () => {
      draft.place = select.value;
      preview.textContent = opening();
    });
    content.append(action(walking() ? 'Caminar a la banca' : 'Continuar en la banca', () => {
      draft.step = 'bench';
      api.writeBoard([opening(), places[draft.place][1], 'En la banca, inventa cómo vuelve a volar.']);
      nextStation();
    }, true));
  }

  function hasEnding() {
    if (draft.mode === 'cards') return draft.order.length === cards.length;
    if (draft.mode === 'drawing') return draft.marks.length > 0;
    return draft.mode === 'oral' && draft.oralDone;
  }

  function renderCards(work, update) {
    putText('p','Elige las tres tarjetas en el orden en que contarías el final.',work);
    const choices = document.createElement('div');
    choices.className = 'kite-cards';
    const sequence = document.createElement('ol');
    sequence.className = 'kite-sequence';
    sequence.setAttribute('aria-label','Tu secuencia');
    sequence.setAttribute('aria-live','polite');
    const buttons = [2,0,1].map(id => {
      const button = action(cards[id], () => {
        draft.order.push(id);
        sync();
      });
      choices.append(button);
      return [id,button];
    });
    const undo = action('Quitar la última tarjeta',() => { draft.order.pop(); sync(); });
    function sync() {
      buttons.forEach(([id,b]) => { b.disabled = draft.order.includes(id); });
      sequence.replaceChildren();
      draft.order.forEach(id => putText('li',cards[id],sequence));
      undo.disabled = !draft.order.length;
      update();
    }
    work.append(choices,sequence,undo);
    sync();
  }

  function paint(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fffdf6';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.lineJoin = ctx.lineCap = 'round';
    draft.marks.forEach(mark => {
      if (mark.stamp) {
        const x = mark.x, y = mark.y;
        ctx.fillStyle = '#ec168b';
        ctx.beginPath(); ctx.moveTo(x,y-32); ctx.lineTo(x+24,y-4);
        ctx.lineTo(x,y+30); ctx.lineTo(x-24,y-4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffd32b'; ctx.beginPath(); ctx.moveTo(x,y-32);
        ctx.lineTo(x+24,y-4); ctx.lineTo(x,y+30); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#07599e'; ctx.lineWidth = 3; ctx.beginPath();
        ctx.moveTo(x,y+30); ctx.bezierCurveTo(x-32,y+57,x+17,y+58,x-18,y+78); ctx.stroke();
      } else {
        ctx.strokeStyle = ctx.fillStyle = mark.color;
        ctx.lineWidth = 5;
        const [first,...rest] = mark.points;
        ctx.beginPath(); ctx.arc(first.x,first.y,2.5,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(first.x,first.y);
        rest.forEach(point => ctx.lineTo(point.x,point.y));
        ctx.stroke();
      }
    });
  }

  function paper(label) {
    const canvas = document.createElement('canvas');
    canvas.width = 800; canvas.height = 360;
    canvas.className = 'kite-paper';
    canvas.setAttribute('role','img');
    canvas.setAttribute('aria-label',label);
    return canvas;
  }

  function renderDrawing(work, update) {
    putText('p','Dibuja quién encuentra el papalote y cómo lo ayuda. También puedes colocar un papalote con el botón de sello.',work);
    const canvas = paper('Hoja para dibujar el desenlace');
    const tools = document.createElement('div');
    tools.className = 'kite-tools';
    const color = document.createElement('select');
    color.setAttribute('aria-label','Color de lápiz');
    [['Azul','#07599e'],['Rosa','#c00066'],['Verde','#19734f']].forEach(([label,value]) => color.add(new Option(label,value)));
    color.value = draft.ink;
    color.onchange = () => { draft.ink = color.value; };
    let pointer = null;
    function coords(event) {
      const rect = canvas.getBoundingClientRect();
      return {x:(event.clientX-rect.left)*800/rect.width, y:(event.clientY-rect.top)*360/rect.height};
    }
    function refreshDrawing() {
      paint(canvas);
      undo.disabled = !draft.marks.length;
      update();
    }
    canvas.onpointerdown = event => {
      if (pointer !== null || event.button !== 0) return;
      pointer = event.pointerId;
      canvas.setPointerCapture(pointer);
      draft.marks.push({color:draft.ink,points:[coords(event)]});
      refreshDrawing();
    };
    canvas.onpointermove = event => {
      if (pointer !== event.pointerId) return;
      draft.marks.at(-1).points.push(coords(event));
      paint(canvas);
    };
    canvas.onlostpointercapture = canvas.onpointercancel = canvas.onpointerup = () => { pointer = null; };
    const stamp = action('Estampar papalote',() => {
      const count = draft.marks.filter(m => m.stamp).length;
      draft.marks.push({stamp:true,x:160+(count%4)*147,y:100+Math.floor(count/4)%2*100});
      refreshDrawing();
    });
    const undo = action('Deshacer',() => { draft.marks.pop(); refreshDrawing(); });
    tools.append(color,stamp,undo);
    work.append(canvas,tools);
    refreshDrawing();
  }

  function renderOral(work, update) {
    putText('p',places[draft.place][1] + ' Cuenta a alguien quién se acercó, qué hizo y cómo terminó el vuelo.',work);
    const label = document.createElement('label');
    label.className = 'choice';
    const done = document.createElement('input');
    done.type = 'checkbox';
    done.checked = draft.oralDone;
    done.onchange = () => { draft.oralDone = done.checked; update(); };
    label.append(done,'Ya conté mi desenlace en voz alta');
    work.append(label);
  }

  function renderBench() {
    stationHeading('Banca de apoyos · Inventa el desenlace',opening());
    const choices = document.createElement('div');
    choices.className = 'kite-tools';
    choices.setAttribute('role','group');
    choices.setAttribute('aria-label','Forma de contar el desenlace');
    const work = document.createElement('section');
    work.className = 'kite-work';
    const finish = action(walking() ? 'Caminar al pizarrón' : 'Llevar mi desenlace al pizarrón', () => {
      if (!hasEnding()) return;
      draft.step = 'closing';
      api.writeBoard([opening(),places[draft.place][1],'Comparte cómo volvió a volar el papalote.']);
      nextStation();
    },true);
    const update = () => { finish.disabled = !hasEnding(); };
    const modes = [
      ['cards','Ordenar tarjetas',renderCards],
      ['drawing','Dibujar',renderDrawing],
      ['oral','Contar en voz alta',renderOral]
    ];
    function choose(mode) {
      draft.mode = mode;
      [...choices.children].forEach(b => b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
      work.replaceChildren();
      const selected = modes.find(([id]) => id===mode);
      if (selected) selected[2](work,update);
      work.hidden = !selected;
      update();
    }
    modes.forEach(([id,label]) => {
      const b = action(label,() => choose(id));
      b.dataset.mode = id;
      choices.append(b);
    });
    content.append(choices,work,finish);
    choose(draft.mode);
  }

  function printStory() {
    byId('kite-print')?.remove();
    const sheet = document.createElement('article');
    sheet.id = 'kite-print';
    putText('p','Valientes · Español 1',sheet);
    putText('h1','La historia del papalote',sheet);
    putText('h2','Así comenzó',sheet);
    putText('p',opening()+' '+places[draft.place][1],sheet);
    if (draft.mode === 'cards') {
      putText('h2','Nuestro desenlace',sheet);
      const list = document.createElement('ol');
      sheet.append(list);
      draft.order.forEach(id => putText('li',cards[id],list));
    } else if (draft.mode === 'drawing') {
      putText('h2','Nuestro dibujo',sheet);
      const art = paper('Dibujo del grupo');
      paint(art);
      sheet.append(art);
    } else {
      putText('h2','El final que contamos',sheet);
      putText('p','Ilustra aquí el desenlace que compartiste en voz alta.',sheet);
      const space = document.createElement('div');
      space.className = 'illustration-space';
      sheet.append(space);
    }
    document.body.append(sheet);
    window.addEventListener('afterprint',() => sheet.remove(),{once:true});
    window.print();
  }

  function renderClosing() {
    stationHeading('Pizarrón · Comparte tu historia',opening());
    if (draft.mode === 'cards') {
      const sequence = document.createElement('ol');
      sequence.className = 'kite-sequence';
      draft.order.forEach(id => putText('li',cards[id],sequence));
      content.append(sequence);
    } else if (draft.mode === 'drawing') {
      const drawing = paper('Dibujo del desenlace hecho en la banca');
      content.append(drawing);
      paint(drawing);
    } else putText('p','Vuelve a contar tu final al grupo. Invita a alguien a elegir el momento que más le gustó.');
    putText('p','Para cerrar, comparte qué hizo posible que el papalote volviera a volar y quién ayudó.').className='kite-opening';
    content.append(action('Imprimir mi historia',printStory));
    content.append(action('Terminar la miniclase',() => {
      draft.step = 'finished';
      showDestination();
      api.closeOverlay(dialog);
    },true));
  }

  function open() {
    if (!['place','bench','closing'].includes(draft.step)) return;
    content.replaceChildren();
    if (draft.step === 'place') renderPlace();
    if (draft.step === 'bench') renderBench();
    if (draft.step === 'closing') renderClosing();
    api.openOverlay(dialog);
    dialog.scrollTop = 0;
    byId('lesson-title').focus({preventScroll:true});
  }

  byId('lesson-route')?.addEventListener('click',() => goTo(station()));
  byId('lesson-start')?.addEventListener('click',start);
  byId('lesson-from-menu')?.addEventListener('click',() => {
    api.stopTour();
    goTo(station());
  });
  return {
    start, open, refreshRoute,
    at: id => !['idle','finished'].includes(draft.step) && station() === id,
    reset() {
      if (draft.step !== 'idle') api.writeBoard(null);
      draft = createDraft();
      showDestination();
    }
  };
};
