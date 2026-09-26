// Flat exports from the same geometry used by the runtime React mark.
import { mkdir, writeFile, copyFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
const root=resolve(import.meta.dirname,'../client/public/brand');
const canonicalGlyph=await readFile(resolve(import.meta.dirname,'../assets/branding/icon-sets/glyphs/hgr-h.svg'),'utf8');
const HGR_H_PATH=canonicalGlyph.match(/<path\b[^>]*\bd="([^"]+)"/)?.[1];
if(!HGR_H_PATH) throw new Error('Canonical icon-set H path missing.');
// Static first-paint/PWA consumers are generated from the same master, never redrawn.
for(const relative of ['client/public/halieus-mark.svg','client/public/halieus-app-icon.svg','client/public/app-icon.svg','client/index.html']) {
 const file=resolve(import.meta.dirname,'..',relative);
 const text=await readFile(file,'utf8');
 const updated=text.replace(/(<path[^>]*?d=")[^"]*(")/,`$1${HGR_H_PATH}$2`);
 await writeFile(file,updated);
}
const motifs={start:'M44 43v12l10-6z',restart:'M53 43a8 8 0 1 0 2 9M53 39v7h-7',close:'m44 43 10 12m0-12L44 55',update:'M49 55V42m-6 6 6-6 6 6',powershell:'m43 43 6 6-6 6m8 0h6',openshard:'m49 41 7 8-7 8-7-8z'};
const presets={'brand-default':['#daa017','#000000','#ffffff'],'mono-light':['none','#ffffff','none'],'mono-dark':['none','#000000','none'],'light-mode':['#fff5d6','#000000','#daa017']};
const browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE});
try {
 const page=await browser.newPage({viewport:{width:256,height:256}});
 for(const [name,[bg,fg,accent]] of [...Object.entries(presets),...Object.keys(motifs).map(n=>[n,[{start:'#4e7f5d',restart:'#e67e22',close:'#b44848',update:'#4878bb',powershell:'#64748b',openshard:'#8b5bd6'}[n],'#000000','#ffffff']])]){
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><g transform="scale(16)"><rect x="3" y="3" width="58" height="58" rx="15" fill="var(--logo-bg,${bg})"/><path fill-rule="evenodd" d="${HGR_H_PATH}" fill="var(--logo-glyph,${fg})"/>${motifs[name]?`<circle cx="49" cy="49" r="12" fill="var(--logo-bg,${bg})"/><path d="${motifs[name]}" fill="none" stroke="var(--logo-accent,${accent})" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`:''}</g></svg>`;
  const folder=resolve(root,motifs[name]?'launcher':'flat');await mkdir(folder,{recursive:true});
  await writeFile(resolve(folder,name+'.svg'),svg+'\n');
  await page.setContent(`<style>body{margin:0}svg{display:block;width:256px;height:256px}</style>${svg}`);
  const png=await page.screenshot({omitBackground:true});await writeFile(resolve(folder,name+'.png'),png);
  if(motifs[name]){const h=Buffer.alloc(22);h.writeUInt16LE(1,2);h.writeUInt16LE(1,4);h.writeUInt16LE(1,10);h.writeUInt16LE(32,12);h.writeUInt32LE(png.length,14);h.writeUInt32LE(22,18);await writeFile(resolve(folder,name+'.ico'),Buffer.concat([h,png]));}
 }
 const glyphs=resolve(root,'glyphs');await mkdir(glyphs,{recursive:true});await writeFile(resolve(glyphs,'H.svg'),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><path transform="scale(16)" fill-rule="evenodd" fill="currentColor" d="${HGR_H_PATH}"/></svg>\n`);
 await copyFile(resolve(root,'flat/mono-light.png'),resolve(glyphs,'H-white.png'));
 await copyFile(resolve(root,'flat/mono-dark.png'),resolve(glyphs,'H-black.png'));
}finally{await browser.close();}
