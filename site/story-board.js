window.setupStoryBoard = function(root) {
  const $=id=>root.querySelector('#'+id);
  $('create-story').addEventListener('click',()=>{const characters={ave:'El ave encontró',papalote:'El papalote descubrió','niña':'Una niña encontró'},places={patio:'en el patio de la escuela',jardín:'en un jardín',biblioteca:'en la biblioteca'};$('story-opening').textContent=`${characters[$('story-character').value]} una pequeña caja azul ${places[$('story-place').value]}. Dentro había algo que necesitaba la ayuda de todo el grupo…`;$('story-result').hidden=false;});
};
