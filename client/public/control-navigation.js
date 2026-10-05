(() => {
  'use strict';
  const key='hgr-fullscreen-navigation';
  const isControl=path=>path==='/control'||path.startsWith('/control/');
  const read=()=>{try{return sessionStorage.getItem(key)==='1';}catch{return false;}};
  const write=value=>{try{value?sessionStorage.setItem(key,'1'):sessionStorage.removeItem(key);}catch{/* Storage can be unavailable in private browsing. */}};
  const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  // Preserve HGR's deliberate WebKit native-input safety restriction.
  const apple=()=>/iPad|iPhone|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  function offerResume(){
    document.getElementById('hgr-fullscreen-recovery')?.remove();
    if(!read()||document.fullscreenElement||standalone())return;
    const panel=document.createElement('div');panel.id='hgr-fullscreen-recovery';panel.className='hgr-fullscreen-recovery';panel.setAttribute('role','status');
    const copy=document.createElement('span');copy.textContent='Navigation left browser fullscreen.';panel.append(copy);
    if(!apple()&&typeof document.documentElement.requestFullscreen==='function'){
      const resume=document.createElement('button');resume.type='button';resume.textContent='Resume fullscreen';
      resume.addEventListener('click',async()=>{try{await document.documentElement.requestFullscreen();write(false);panel.remove();}catch{copy.textContent='Fullscreen was unavailable. You can continue in this window.';}});panel.append(resume);
    }else copy.textContent='Continue in this responsive view. Fullscreen is unavailable on this device.';
    const dismiss=document.createElement('button');dismiss.type='button';dismiss.textContent='Stay in window';dismiss.addEventListener('click',()=>{write(false);panel.remove();});panel.append(dismiss);
    const header=document.querySelector('.control-topbar');
    if(header)header.before(panel);else document.body.prepend(panel);
  }
  document.addEventListener('click',event=>{
    const link=event.target.closest?.('a[href]');if(!link||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||link.target==='_blank')return;
    const target=new URL(link.href,location.href);
    if(target.origin===location.origin&&isControl(target.pathname)!==isControl(location.pathname)&&document.fullscreenElement)write(true);
  });
  window.addEventListener('pageshow',offerResume);
  if(document.readyState!=='loading')offerResume();else document.addEventListener('DOMContentLoaded',offerResume,{once:true});
})();
