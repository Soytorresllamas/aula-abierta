/* Start the catalogue request alongside the 3D engine download. */
(() => {
  const catalogueURL = new URL(document.getElementById('catalogue-endpoint').href);
  function usableURL(value) {
    if (!value || typeof value !== 'string') return '';
    try {
      const sitePath = /^\/(?:assets|media)\//.test(value) ? value.slice(1) : value;
      const url = new URL(sitePath, document.baseURI);
      if (url.username || url.password) return '';
      if (url.protocol === 'https:' || (url.origin === location.origin && url.protocol === 'http:')) return url.href;
    } catch (_) {}
    return '';
  }

  async function load() {
    const response = await fetch(catalogueURL, {cache:'no-store', credentials:'omit'});
    if (!response.ok) throw new Error('No se pudo cargar el catálogo del aula.');
    const data = await response.json();
    if (!data || !['books','samples','materials','supports'].every(key => Array.isArray(data[key]))) {
      throw new Error('Catálogo del aula incompleto.');
    }
    return data;
  }

  function placeholder(book) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 352;
    const context = canvas.getContext('2d');
    context.fillStyle = '#07599e';
    context.fillRect(0,0,256,352);
    context.fillStyle = '#48b5dc';
    context.fillRect(16,28,224,8);
    context.fillStyle = '#fff';
    context.font = 'bold 34px sans-serif';
    const words = book.title.split(/\s+/);
    let line = '', y = 104;
    for (const word of words) {
      if (line && context.measureText(line + ' ' + word).width > 215) {
        context.fillText(line,20,y,215);
        y += 40;
        if (y > 280) break;
        line = '';
      }
      line += (line ? ' ' : '') + word;
    }
    if (y <= 280) context.fillText(line,20,y,215);
    return canvas;
  }

  function setBookImage(img, book) {
    img.onerror = () => {
      img.onerror = null;
      img.src = placeholder(book).toDataURL('image/png');
    };
    const asset = usableURL(book.asset);
    if (asset) img.src = asset;
    else img.onerror();
  }

  function renderMaterials(id, items) {
    const section = document.getElementById(id);
    section.hidden = !items.length;
    const list = section.querySelector('ul');
    list.replaceChildren();
    items.forEach(item => {
      const li = document.createElement('li');
      const href = usableURL(item.url);
      const title = document.createElement(href ? 'a' : 'strong');
      title.textContent = item.title;
      if (href) {
        title.href = href;
        title.target = '_blank';
        title.rel = 'noopener noreferrer';
      }
      li.append(title);
      if (item.description) {
        const p = document.createElement('p');
        p.textContent = item.description;
        li.append(p);
      }
      list.append(li);
    });
  }

  const pending = load();
  pending.catch(() => {}); // app.js reports the failure once the shell is mounted.
  window.aulaCatalogue = {pending,usableURL,placeholder,setBookImage,renderMaterials};
})();
