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

/* HGR 4.5.5z: a normal user-gesture fullscreen action for Control.
 * Browser fullscreen cannot survive cross-document navigation automatically.
 * iOS/iPadOS native WebKit input safety stays in force. Installed standalone
 * PWAs already own their display frame, so don't pretend Fullscreen API is on.
 */
(() => {
  'use strict';
  const button = document.getElementById('controlFullscreen');
  if (!button) return;
  const apple = /iPad|iPhone|iPod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia('(display-mode: standalone)').matches
    || navigator.standalone === true;
  // Android installed PWAs may support Fullscreen API too. The old
  // standalone guard hid the action in portrait even when it worked.
  const supported = !apple
    && typeof document.documentElement.requestFullscreen === 'function';
  // Keep the action discoverable on phones. Unsupported browsers show a
  // truthful explanation instead of removing the control entirely.
  button.hidden = false;
  if (!supported) {
    button.disabled = true;
    button.textContent = standalone ? 'App display' : 'Full screen unavailable';
    button.title = standalone
      ? 'Installed app display is managed by your browser and device.'
      : 'This browser does not support fullscreen on this device.';
    button.setAttribute('aria-label', button.title);
    return;
  }
  const sync = () => {
    const active = Boolean(document.fullscreenElement);
    button.textContent = active ? 'Exit Full Screen' : 'Full Screen';
    button.setAttribute('aria-label', active ? 'Exit full screen' : 'Enter full screen');
    button.setAttribute('aria-pressed', String(active));
  };
  button.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      button.textContent = 'Full screen unavailable';
      button.setAttribute('aria-label', 'Full screen unavailable');
    }
  });
  document.addEventListener('fullscreenchange', sync);
  sync();
})();
