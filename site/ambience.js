/* Optional synthesized breeze and birds. No audio starts before a user gesture. */
window.createPatioAmbience=function(){
  let context,master,wind,enabled=false,active=false,volume=.25,timer,revision=0,pending=Promise.resolve();
  function birds(){
    if(!enabled||!active||context?.state!=='running')return;
    const now=context.currentTime;
    for(let i=0;i<3;i++){
      const oscillator=context.createOscillator(),gain=context.createGain(),pan=context.createStereoPanner();
      oscillator.type='sine';oscillator.frequency.setValueAtTime(2200+i*240,now+i*.19);oscillator.frequency.exponentialRampToValueAtTime(3400-i*180,now+i*.19+.09);oscillator.frequency.exponentialRampToValueAtTime(2600,now+i*.19+.17);
      gain.gain.setValueAtTime(0,now+i*.19);gain.gain.linearRampToValueAtTime(.035,now+i*.19+.025);gain.gain.exponentialRampToValueAtTime(.0001,now+i*.19+.18);pan.pan.value=-.6+Math.random()*.3;
      oscillator.connect(gain);gain.connect(pan);pan.connect(master);oscillator.start(now+i*.19);oscillator.stop(now+i*.19+.2);
      oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();pan.disconnect();};
    }
  }
  function ensure(){
    if(context)return;
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)throw new Error('Audio unavailable');
    context=new Audio();master=context.createGain();master.gain.value=0;master.connect(context.destination);
    const buffer=context.createBuffer(1,context.sampleRate*4,context.sampleRate),data=buffer.getChannelData(0);let last=0;
    for(let i=0;i<data.length;i++){last=(last+.02*(Math.random()*2-1))/1.02;data[i]=last*.6*Math.sin(Math.PI*i/data.length)**2;}
    wind=context.createBufferSource();wind.buffer=buffer;wind.loop=true;const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=700;wind.connect(filter);filter.connect(master);wind.start();
  }
  function sync(){
    const current=++revision;clearInterval(timer);timer=null;
    if(context&&(!enabled||!active||document.hidden)){master.gain.cancelScheduledValues(context.currentTime);master.gain.value=0;}
    // Serialize Web Audio transitions: a pending resume must finish before suspend.
    pending=pending.catch(()=>{}).then(async()=>{
      if(current!==revision||!context||context.state==='closed')return;
      if(enabled&&active&&!document.hidden){
        await context.resume();
        if(current!==revision)return;
        master.gain.setTargetAtTime(volume,context.currentTime,.18);timer=setInterval(birds,6500);
      }else await context.suspend();
    });
    return pending;
  }
  return {
    async enable(value){enabled=value;if(value)ensure();await sync();},
    setActive(value){if(active===value)return;active=value;sync().catch(()=>{});},
    setVolume(value){volume=value;if(context&&enabled&&active)master.gain.setTargetAtTime(volume,context.currentTime,.1);},
    get state(){return {enabled,active,context:context?.state||'uncreated'};},
    dispose(){clearInterval(timer);if(context)context.close().catch(()=>{});}
  };
};
