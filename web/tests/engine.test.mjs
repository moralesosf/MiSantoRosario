import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {familyFor,buildFrames,changeSessionMode,validateConfig,streakFor,completeDay,previousDay,recordPreviousDay,updateChantCatalog} from '../engine.mjs';
const c=JSON.parse(fs.readFileSync(new URL('../rosario.json',import.meta.url)));
test('selección de los misterios de los siete días',()=>{['gloriosos','gozosos','dolorosos','gloriosos','luminosos','dolorosos','gozosos'].forEach((family,day)=>assert.equal(familyFor(c,new Date(2026,9,11+day,12)),family));});
test('cada familia recorre cruz y diez cuentas, y finaliza después de todas las oraciones de cierre',()=>{validateConfig(c);for(const key of Object.keys(c.mysteries)){const f=buildFrames(c,key);assert.equal(f.length,70);assert.deepEqual(f.slice(0,3).map(x=>x.page),c.flow.opening);for(let m=0;m<5;m++){const states=f.filter(x=>x.mystery===m);assert.deepEqual(states.map(x=>x.count),Array.from({length:12},(_,i)=>i-1));assert.ok(states.every(x=>x.family===key));}assert.equal(f.at(-2).page,'personal-3');assert.equal(f.at(-1).layout,'completion');}});
test('modo físico: cinco misterios completos, todas las páginas de apertura y cierre y un único final',()=>{
 for(const family of Object.keys(c.mysteries)){const frames=buildFrames(c,family,'physical');assert.equal(frames.length,15);assert.deepEqual(frames.slice(0,3).map(f=>f.page),c.flow.opening);assert.deepEqual(frames.slice(3,8).map(f=>[f.mystery,f.count]),[[0,10],[1,10],[2,10],[3,10],[4,10]]);assert.deepEqual(frames.slice(8,-1).map(f=>f.page),c.flow.closing);assert.equal(frames.at(-1).layout,'completion');}
});
test('cambiar entre modos conserva la página o el misterio de sesiones actuales y anteriores',()=>{
 const frames=buildFrames(c,'gozosos');
 for(let index=0;index<frames.length;index++){
  const s={family:'gozosos',index,date:'2026-10-11'},physical=changeSessionMode(c,s,'physical');const p=buildFrames(c,s.family,'physical')[physical.index];assert.equal(p.page,frames[index].page);assert.equal(p.mystery,frames[index].mystery);
  const app=changeSessionMode(c,physical,'app'),f=frames[app.index];assert.equal(f.page,frames[index].page);assert.equal(f.mystery,frames[index].mystery);if(f.mystery!==undefined)assert.equal(f.count,-1);
 }
});
test('racha: una fecha no se cuenta dos veces, y tolera el día de hoy pendiente',()=>{const days=completeDay(completeDay(['2026-10-09'],'2026-10-10'),'2026-10-10');assert.equal(days.length,2);assert.equal(streakFor(days,'2026-10-11'),2);assert.equal(streakFor(completeDay(days,'2026-10-11'),'2026-10-11'),3);assert.equal(streakFor(days,'2026-10-12'),0);assert.equal(streakFor(completeDay(days,'2026-10-12'),'2026-10-12'),1);});
test('racha a través de mes, año y año bisiesto',()=>{assert.equal(previousDay('2026-01-01'),'2025-12-31');assert.equal(previousDay('2024-03-01'),'2024-02-29');assert.equal(streakFor(['2025-12-31','2026-01-01'],'2026-01-01'),2);});
test('días anteriores: valida fechas reales, excluye hoy/futuro y cuenta solo días consecutivos',()=>{
 const today='2026-03-01';let days=recordPreviousDay([],'2026-02-27',today);assert.equal(streakFor(days,today),0);days=recordPreviousDay(days,'2026-02-28',today);assert.equal(streakFor(days,today),2);assert.equal(recordPreviousDay(days,'2026-02-28',today).length,2);
 for(const day of ['2026-03-01','2026-03-02','2026-02-29','2026-02-30','not-a-date'])assert.throws(()=>recordPreviousDay(days,day,today));
 assert.deepEqual(recordPreviousDay([],'2024-02-29','2024-03-01'),['2024-02-29']);
});
test('catálogo de cantos: migra una sola vez y conserva textos y órdenes personalizados después',()=>{
 const old=structuredClone(c);delete old.chantCatalogVersion;old.chants=[{title:'Eran cien ovejas',blocks:[{type:'text',text:'Texto propio'}]},{title:'Canto personal',blocks:[]}];const changed=updateChantCatalog(old,c);assert.equal(changed.chants[0].blocks[0].text,'Texto propio');assert.equal(changed.chants.filter(p=>p.title==='Eran cien ovejas').length,1);
 const snapshot=JSON.stringify(changed);updateChantCatalog(changed,c);assert.equal(JSON.stringify(changed),snapshot);validateConfig(changed);
 const unsafe=structuredClone(c);unsafe.chants[0].listenUrl='javascript:alert(1)';assert.throws(()=>validateConfig(unsafe),/https/);
});
test('JSON inválido y referencias rotas se rechazan',()=>{const broken=structuredClone(c);broken.pages.sign.blocks[0].ref='missing';assert.throws(()=>validateConfig(broken),/missing/);const layout=structuredClone(c);layout.layouts.intro.type='javascript';assert.throws(()=>validateConfig(layout),/layout/);});
test('editar texto y reordenar páginas funciona sin cambiar el motor',()=>{const edited=structuredClone(c);edited.prayers.ave.text='Mi oración personalizada';edited.flow.opening.reverse();validateConfig(edited);assert.equal(buildFrames(edited,'gozosos')[0].page,'invocation');assert.equal(edited.prayers.ave.text,'Mi oración personalizada');});
test('los módulos y recursos locales referenciados existen sin una red o service worker',()=>{
 const root=new URL('../',import.meta.url);
 for(const name of ['index.html','app.js','editor.js','native.mjs','engine.mjs','visuals.mjs','calendar.mjs','donations.mjs','editor-model.mjs','style.css','editor.css','rosario.json'])assert.ok(fs.existsSync(new URL(name,root)),name);
 for(const name of ['app.js','editor.js','engine.mjs','visuals.mjs','style.css','editor.css']){
  const source=fs.readFileSync(new URL(name,root),'utf8');
  for(const m of source.matchAll(/(?:from\s*['"]|url\(['"]?)(\.\.?\/[^'"\)]+)['"\)]/g))assert.ok(fs.existsSync(new URL(m[1],new URL(name,root))),name+': '+m[1]);
 }
});

test('migración de letras: cambia solo descripciones originales y respeta contenido propio o eliminado después',()=>{
 const old=structuredClone(c);old.chantCatalogVersion=1;
 for(const song of old.chants)if(song.legacyDescription)song.blocks=[{type:'text',text:song.legacyDescription}];
 old.chants.find(p=>p.title==='Venid y vamos todos').blocks=[{type:'text',text:'Texto elegido por mí'}];
 const changed=updateChantCatalog(old,c);validateConfig(changed);
 assert.match(changed.chants.find(p=>p.title==='Bendita sea tu pureza').blocks[0].text,/y eternamente lo sea/i);
 assert.equal(changed.chants.find(p=>p.title==='Venid y vamos todos').blocks[0].text,'Texto elegido por mí');
 changed.chants.find(p=>p.title==='Bendita sea tu pureza').blocks=[];updateChantCatalog(changed,c);assert.deepEqual(changed.chants.find(p=>p.title==='Bendita sea tu pureza').blocks,[]);
});

test('letras aportadas: actualiza las catorce letras distribuidas conservando textos, enlaces y orden propios',()=>{
 const old=structuredClone(c);old.chantCatalogVersion=3;
 const supplied=old.chants.filter(song=>song.previousBlocks);assert.equal(supplied.length,14);
 for(const song of supplied)song.blocks=structuredClone(song.previousBlocks);
 const changed=updateChantCatalog(old,c);validateConfig(changed);
 for(const song of supplied)assert.deepEqual(song.blocks,c.chants.find(p=>p.title===song.title).blocks,song.title);
 const custom=structuredClone(c);custom.chantCatalogVersion=3;
 const own=custom.chants.find(song=>song.title==='La Guadalupana');own.blocks=[{type:'text',text:'Mi versión personal'}];own.listenUrl='https://example.com/mi-video';own.lyricsSource='https://example.com/mi-fuente';
 custom.chants.reverse();const order=custom.chants.map(song=>song.title);
 updateChantCatalog(custom,c);assert.deepEqual(custom.chants.map(song=>song.title),order);assert.equal(own.blocks[0].text,'Mi versión personal');assert.equal(own.listenUrl,'https://example.com/mi-video');assert.equal(own.lyricsSource,'https://example.com/mi-fuente');
 own.blocks=[];updateChantCatalog(custom,c);assert.deepEqual(own.blocks,[]);
});
