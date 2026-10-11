import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const engine=fs.readFileSync(new URL('../engine.mjs',import.meta.url),'utf8');
const config=JSON.parse(fs.readFileSync(new URL('../rosario.json',import.meta.url)));
const cross=JSON.parse(fs.readFileSync(new URL('../assets/cross-path.json',import.meta.url)));
import {localDay,previousDay,buildFrames} from '../engine.mjs';
import {shiftMonth,monthDays} from '../calendar.mjs';
const lastFrame=buildFrames(config,'gloriosos').length-1;
test('Android: haptics use the native channel and never vibrate twice',async()=>{
 const b=await boot({}, {android:true});
 assert.equal(b.nativeMessages.at(-1).type,'ready');
 b.click('start');b.swipe(-100);
 assert.deepEqual(b.nativeMessages.at(-1),{type:'vibrate',kind:'swipe'});
 assert.equal(b.pulses.length,0);
 b.click('settings');b.change('haptic','',false);b.click('home');b.click('start');b.chooseDialog(1);b.click('next');
 assert.equal(b.nativeMessages.filter(m=>m.type==='vibrate').length,1);
});
test('Android: Back closes an overlay, then returns home, and allows exit only at home',async()=>{
 const b=await boot({}, {android:true});assert.equal(b.nativeBack(),false);
 b.click('collection',{collection:'es'});b.click('read-prayer',{index:'0'});
 assert.equal(b.nativeBack(),true);assert.match(b.app.innerHTML,/Más oraciones/);assert.equal(b.hasDialog(),false);
 assert.equal(b.nativeBack(),true);assert.match(b.app.innerHTML,/streak-number/);assert.equal(b.nativeBack(),false);
 b.click('start');b.click('home');b.click('start');assert.equal(b.hasDialog(),true);
 assert.equal(b.nativeBack(),true);assert.equal(b.hasDialog(),false);assert.equal(b.nativeBack(),false);
});
test('Android: Back protects unsaved personalization changes',async()=>{
 const b=await boot({}, {android:true});b.click('settings');b.click('editor');b.edit('add-item',{group:'opening'});
 assert.equal(b.nativeBack(),true);assert.equal(b.hasDialog(),true);
 assert.equal(b.nativeBack(),true);assert.equal(b.hasDialog(),false);assert.match(b.app.innerHTML,/Personalizar/);
 assert.equal(b.nativeBack(),true);b.chooseDialog(1);assert.match(b.app.innerHTML,/Ajustes/);
});
async function boot(seed={},options={}){
 if(!options.firstUse&&!seed['rosario.settings.v1'])seed={...seed,'rosario.settings.v1':JSON.stringify({haptic:true,enlarged:false,family:'auto',mode:'app'})};
 const stored=new Map(Object.entries(seed)),events={},windowEvents={},pulses=[],nativeMessages=[],nodes=new Map();
 const node=selector=>{if(!nodes.has(selector)){const classes=new Set();nodes.set(selector,{textContent:'',disabled:false,attributes:{},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},classes,classList:{add:c=>classes.add(c)},replaceWith(el){this.replacement=el;}});}return nodes.get(selector);};
 const app={innerHTML:'Preparando tu rosario…',classList:{toggle(){}},getBoundingClientRect:()=>({left:0,width:400,right:400}),addEventListener(name,fn){(events[name]??=[]).push(fn);},removeEventListener(name,fn){events[name]=events[name]?.filter(x=>x!==fn);},querySelector:selector=>selector==='#prayer-list'&&!app.innerHTML.includes('id="prayer-list"')?null:node(selector),querySelectorAll:()=>[]};
 const dispatch=(name,event)=>{for(const fn of [...(events[name]||[])])fn(event);};
 let dialog=null;
 function createElement(tag){const handlers={};const el={innerHTML:'',className:'',attributes:{},classList:{toggle(){}},setAttribute(name,value){this.attributes[name]=value;},querySelector:()=>null,addEventListener:(name,fn)=>handlers[name]=fn,showModal(){this.open=true;this.isConnected=true;},close(){this.open=false;},dispatchEvent(event){handlers[event.type]?.(event);return true;},remove(){this.isConnected=false;if(dialog===el)dialog=null;},emit(name,event){handlers[name]?.(event);}};return el;}
 const entries=structuredClone(options.historyEntries||[null]);let cursor=options.historyCursor??entries.length-1;
 const history={get state(){return entries[cursor];},get length(){return entries.length;},get entries(){return structuredClone(entries);},get cursor(){return cursor;},pushState(state){entries.splice(cursor+1);entries.push(structuredClone(state));cursor++;},replaceState(state){entries[cursor]=structuredClone(state);},go(delta){const next=cursor+delta;if(next<0||next>=entries.length)return;cursor=next;for(const fn of windowEvents.popstate||[])fn({state:structuredClone(entries[cursor])});},back(){this.go(-1);},forward(){this.go(1);}};
 const live={textContent:''},images=[],fontLoads=[];
 class PreparedImage{
  constructor(){images.push(this);}
  async decode(){if(options.imageFailure)throw Error('Image failed');await options.imageGate;this.decoded=true;}
 }
 const fonts={async load(spec){fontLoads.push(spec);if(options.fontFailure)throw Error('Font failed');await options.fontGate;return options.missingFont?[]:[{}];},ready:options.fontReadyGate||Promise.resolve()};
 const context=vm.createContext({console,structuredClone,Date,setTimeout,URL,Blob,Image:PreparedImage,Event,
   RosarioAndroid:options.android?{postMessage:message=>nativeMessages.push(JSON.parse(message))}:undefined,
   document:{fonts,querySelector(selector){return selector==='#app'?app:selector==='#live'?live:selector.startsWith('dialog')?dialog:node(selector);},createElement,body:{append:el=>dialog=el},addEventListener(){}},
   window:{history,getSelection:()=>({type:options.selectionRange?'Range':'None'}),scrollTo(){},addEventListener(name,fn){(windowEvents[name]??=[]).push(fn);},removeEventListener(){},matchMedia(){return {matches:!!options.standalone,addEventListener(){}};}},
   localStorage:{getItem:k=>stored.get(k)??null,setItem:(k,v)=>{if(options.blockStorage)throw Error('Storage blocked');stored.set(k,v);},removeItem:k=>stored.delete(k)},
   navigator:{standalone:options.appleStandalone,vibrate:n=>pulses.push(n),serviceWorker:{register:()=>Promise.resolve()}},
   fetch:async p=>({ok:true,json:async()=>structuredClone(p.includes('cross-path')?cross:config)})
 });
 const appModule=new vm.SourceTextModule(source,{context});
 const modules=new Map();
 async function link(specifier){if(!modules.has(specifier)){const code=specifier==='./engine.mjs'?engine:fs.readFileSync(new URL('../'+specifier,import.meta.url),'utf8');const module=new vm.SourceTextModule(code,{context});modules.set(specifier,module);await module.link(link);}return modules.get(specifier);}
 await appModule.link(link);const evaluation=appModule.evaluate();if(!options.pending)await evaluation;
 function click(action,extra={}){const element={dataset:{action,...extra}};dispatch('click',{target:{closest:s=>s==='[data-action]'?element:null}});}
 function bead(count,clientX){const element={dataset:{count:String(count)}};dispatch('click',{clientX,detail:clientX===undefined?0:1,target:{closest:s=>s==='[data-count]'?element:null}});}
 function swipe(dx,dy=0){dispatch('touchstart',{touches:[{clientX:200,clientY:200}],target:{closest:()=>null}});dispatch('touchend',{changedTouches:[{clientX:200+dx,clientY:200+dy}]});}
 function edit(action,extra={}){const element={dataset:{editAction:action,...extra}};dispatch('click',{target:{closest:s=>s==='[data-edit-action]'?element:null}});}
 function input(field,value){dispatch('input',{target:{dataset:{editField:field},tagName:'TEXTAREA',value}});}
 function tap(clientX,control=''){dispatch('click',{clientX,detail:1,target:{closest:selector=>control&&selector.split(',').includes(control)?{}:null}});}
 function change(id,value,checked=true){dispatch('change',{target:{id,value,checked}});}
 function closeReading(){dialog?.emit('click',{target:{closest:selector=>selector==='[data-reading-close]'?{}:null}});}
 function cancelReading(){dialog?.emit('cancel',{preventDefault(){}});}
 function donationAmount(value){dispatch('input',{target:{id:'donation-amount',value}});}
 function search(value){node('#prayer-search').value=value;dispatch('input',{target:{id:'prayer-search',value}});}
 function chooseDialog(index){dialog?.emit('click',{target:{closest:selector=>selector==='[data-modal]'?{dataset:{modal:String(index)}}:selector==='[data-dialog-index]'?{dataset:{dialogIndex:String(index)}}:null}});}
 async function windowEvent(name,event={}){for(const fn of windowEvents[name]||[])await fn(event);}
 return {get readingHTML(){return dialog?.className==='reading-dialog'?dialog.innerHTML:'';},get dialog(){return dialog;},closeReading,cancelReading,donationAmount,search,app,images,fontLoads,evaluation,stored,pulses,nativeMessages,nativeBack:()=>context.window.rosarioAndroidBack(),click,bead,swipe,edit,input,node,windowEvent,tap,change,chooseDialog,history,hasDialog:()=>!!dialog};
}
test('UI: avance, cuenta, swipe y finalización registran exactamente un día',async()=>{
 const b=await boot();assert.match(b.app.innerHTML,/streak-number/);assert.match(b.app.innerHTML,/home-background/);
 b.click('start');assert.match(b.app.innerHTML,/Inicio/);assert.doesNotMatch(b.app.innerHTML,/>Salir<|data-action="next"/);b.swipe(-100);assert.match(b.app.innerHTML,/Acto de contrición/);assert.doesNotMatch(b.app.innerHTML,/>Salir<|>Siguiente|data-action="next"/);b.click('next');assert.match(b.app.innerHTML,/Señor, ábreme/);b.click('next');assert.match(b.app.innerHTML,/Primer Misterio/);assert.doesNotMatch(b.app.innerHTML,/>Salir<|data-action="next"/);
 b.swipe(0,150);assert.equal(JSON.parse(b.stored.get('rosario.session.v1')).index,3);
 b.bead(0);assert.equal(JSON.parse(b.stored.get('rosario.session.v1')).index,4);assert.equal(b.pulses.at(-1),18);
 b.bead(8);assert.equal(JSON.parse(b.stored.get('rosario.session.v1')).index,4,'No se puede saltar a una cuenta futura');
 b.bead(1);assert.equal(JSON.parse(b.stored.get('rosario.session.v1')).index,5);
 await new Promise(resolve=>setTimeout(resolve,230));b.swipe(-100);assert.equal(JSON.parse(b.stored.get('rosario.session.v1')).index,6);
 for(let i=6;i<lastFrame;i++)b.click('next');
 assert.match(b.app.innerHTML,/Rosario completado/);assert.equal(JSON.parse(b.stored.get('rosario.days.v1')).length,1);assert.equal(b.stored.has('rosario.session.v1'),false);assert.match(b.app.innerHTML,/streak-increased/);assert.match(b.app.innerHTML,/<span>0<\/span><span>1<\/span>/);assert.doesNotMatch(b.app.innerHTML,/Que María te acompañe|oración consecutiva|se ha sumado a tu racha/);
 b.click('home');b.click('start');for(let i=0;i<lastFrame;i++)b.click('next');assert.equal(JSON.parse(b.stored.get('rosario.days.v1')).length,1);assert.doesNotMatch(b.app.innerHTML,/streak-increased/);assert.match(b.app.innerHTML,/<span>1<\/span><span>1<\/span>/);
});
test('UI: oraciones en español y latín y JSON personalizado se renderizan de forma segura',async()=>{
 const custom=structuredClone(config);custom.prayers.ave.text='<script>alert(1)</script> Mi oración';
 const b=await boot({'rosario.config.v1':JSON.stringify(custom)});b.click('collection',{collection:'es'});assert.match(b.app.innerHTML,/Más oraciones/);b.click('read-prayer',{index:'2'});assert.match(b.readingHTML,/&lt;script&gt;/);assert.doesNotMatch(b.readingHTML,/<script>/);
 b.click('home');b.click('collection',{collection:'la'});b.click('read-prayer',{index:'1'});assert.match(b.readingHTML,/Pater noster/);assert.equal(b.dialog.attributes.lang,'la');
});

test('UI del editor: crear pantalla, editar contenido, reordenar y guardar modifica el JSON usado por el rosario',async()=>{
 const b=await boot();b.click('settings');b.click('editor');assert.match(b.app.innerHTML,/<h1>Personalizar<\/h1>/);assert.match(b.app.innerHTML,/data-tab="flow"[^>]*>Rosario<\/button>/);assert.doesNotMatch(b.app.innerHTML,/HECHO A TU MANERA|Un espacio para dar tu voz|Recorrido/);assert.match(b.app.innerHTML,/Mantén pulsado/);
 b.edit('add-item',{group:'opening'});b.input('page-title','Intención personal');b.edit('edit-item',{group:'blocks',index:'0'});assert.match(b.app.innerHTML,/Texto de la oración/);b.input('block-text','Por mi familia.');b.edit('detail-back');b.edit('detail-back');assert.match(b.app.innerHTML,/Intención personal/);
 b.edit('move',{group:'opening',index:'3',offset:'-1'});b.edit('save');const saved=JSON.parse(b.stored.get('rosario.config.v1'));assert.equal(saved.pages[saved.flow.opening[2]].title,'Intención personal');assert.equal(saved.pages[saved.flow.opening[2]].blocks[0].text,'Por mi familia.');
 assert.match(b.node('#studio-notice').textContent,/guardados/);
 b.edit('close');assert.match(b.app.innerHTML,/Ajustes/);b.click('start');b.click('next');b.click('next');assert.match(b.app.innerHTML,/Por mi familia/);
});
test('UI del editor: el JSON inválido no reemplaza el borrador ni se guarda',async()=>{
 const b=await boot();b.click('settings');b.click('editor');b.edit('tab',{tab:'json'});assert.match(b.app.innerHTML,/Edición avanzada/);b.input('json','{broken');b.edit('save');assert.match(b.node('#studio-notice').textContent,/Revisa el JSON/);assert.equal(b.stored.has('rosario.config.v1'),false);b.edit('tab',{tab:'flow'});assert.match(b.app.innerHTML,/Edición avanzada/);
 b.input('json',JSON.stringify(config));b.edit('apply-json');b.edit('tab',{tab:'flow'});assert.match(b.app.innerHTML,/Al comenzar/);
});
test('instalación: no muestra botón en ningún modo ni después de ofertas del navegador',async()=>{
 for(const options of [{},{standalone:true},{appleStandalone:true}]){
  const b=await boot({},options);assert.doesNotMatch(b.app.innerHTML,/data-action="install"|home-install|Instalar app/);
  let prompted=false;await b.windowEvent('beforeinstallprompt',{preventDefault(){},async prompt(){prompted=true;}});
  await b.windowEvent('appinstalled');b.click('settings');b.click('home');assert.doesNotMatch(b.app.innerHTML,/data-action="install"|home-install|Instalar app/);assert.equal(prompted,false);
 }
});
test('calendario: marca varios días en borrador y actualiza la racha solo al guardar',async()=>{
 const today=localDay(),yesterday=previousDay(today),before=previousDay(yesterday);
 const b=await boot();b.click('settings');assert.match(b.app.innerHTML,/Sanctum Rosarium/);assert.match(b.app.innerHTML,/Versión 1\.5\.3/);assert.match(b.app.innerHTML,/Desarrollado por Andrés Morales Gil/);assert.match(b.app.innerHTML,/calendar-grid/);assert.doesNotMatch(b.app.innerHTML,/type="date"|Añadir día|history-streak|history-days/);
 b.click('calendar-day',{day:before});b.click('calendar-day',{day:yesterday});assert.equal(b.stored.has('rosario.days.v1'),false);assert.equal(b.node('#save-days').disabled,false);
 b.click('save-days');assert.deepEqual(JSON.parse(b.stored.get('rosario.days.v1')),[before,yesterday]);assert.equal(b.node('#save-days').disabled,true);assert.match(b.node('#history-status').textContent,/guardados/);
 b.click('home');assert.match(b.app.innerHTML,/aria-label="Racha de 2 días"/);b.click('start');for(let i=0;i<lastFrame;i++)b.click('next');assert.match(b.app.innerHTML,/<span>2<\/span><span>3<\/span>/);
 b.click('settings');b.click('calendar-day',{day:yesterday});assert.equal(JSON.parse(b.stored.get('rosario.days.v1')).length,3);b.click('save-days');assert.deepEqual(JSON.parse(b.stored.get('rosario.days.v1')),[before,today]);b.click('home');assert.match(b.app.innerHTML,/aria-label="Racha de 1 día"/);
});
test('cantos: el catálogo nuevo llega también a dispositivos con JSON personalizado sin borrar sus oraciones',async()=>{
 const old=structuredClone(config);delete old.chantCatalogVersion;old.chants=[{title:'Mi canto',blocks:[{type:'text',text:'Mi texto'}]}];old.prayers.ave.text='Mi Ave María';
 const b=await boot({'rosario.config.v1':JSON.stringify(old)});const migrated=JSON.parse(b.stored.get('rosario.config.v1'));assert.equal(migrated.prayers.ave.text,'Mi Ave María');assert.equal(migrated.chants[0].title,'Eran cien ovejas');assert.ok(migrated.chants.some(p=>p.title==='Mi canto'));
 b.click('collection',{collection:'chants'});assert.ok(b.app.innerHTML.indexOf('Eran cien ovejas')<b.app.innerHTML.indexOf('La Guadalupana'));b.click('read-prayer',{index:'0'});assert.match(b.readingHTML,/Escuchar canto/);assert.match(b.readingHTML,/https:\/\/www.youtube.com\/results/);assert.match(b.readingHTML,/rel="noopener noreferrer"/);
});
test('calendario: aplica solo fechas tocadas, respeta otra pestaña y conserva el borrador si falla guardar',async()=>{
 const yesterday=previousDay(localDay()),before=previousDay(yesterday);
 const b=await boot({'rosario.days.v1':JSON.stringify([before])});b.click('settings');b.click('calendar-day',{day:yesterday});b.stored.set('rosario.days.v1','[]');b.click('save-days');assert.deepEqual(JSON.parse(b.stored.get('rosario.days.v1')),[yesterday]);
 const blocked=await boot({}, {blockStorage:true});blocked.click('settings');blocked.click('calendar-day',{day:yesterday});blocked.click('save-days');assert.match(blocked.node('#history-status').textContent,/No se pudieron guardar/);assert.equal(blocked.stored.has('rosario.days.v1'),false);assert.equal(blocked.node('#save-days').disabled,false);assert.match(blocked.node('#streak-calendar').innerHTML,new RegExp('data-day="'+yesterday+'"[^>]*aria-pressed="true"'));blocked.click('home');assert.match(blocked.app.innerHTML,/aria-label="Racha de 0 días"/);
});
test('navegación: Atrás del dispositivo vuelve de la lectura al listado y después a Inicio',async()=>{
 for(const collection of ['es','la','chants']){
  const b=await boot();b.click('collection',{collection});assert.match(b.app.innerHTML,/class="back-arrow"/);assert.doesNotMatch(b.app.innerHTML,/para acompañar tu oración|footer-hint/);
  b.click('read-prayer',{index:'0'});assert.equal(b.history.state.sanctumRosarium.view,'reading');
  b.history.back();assert.equal(b.history.state.sanctumRosarium.view,'collection');assert.match(b.app.innerHTML,/id="prayer-list"/);
  b.click('back');assert.equal(b.history.state.sanctumRosarium.view,'home');assert.match(b.app.innerHTML,/home-nav/);assert.equal(b.history.cursor,0);
  b.history.forward();assert.match(b.app.innerHTML,/id="prayer-list"/);b.history.forward();assert.equal(b.history.state.sanctumRosarium.collection,collection);assert.match(b.readingHTML,/reading-title/);
 }
});
test('navegación: Ajustes y Rosario regresan a Inicio y el progreso se conserva',async()=>{
 const b=await boot();b.click('settings');b.history.back();assert.match(b.app.innerHTML,/home-nav/);
 b.click('start');b.tap(350);assert.equal(JSON.parse(b.stored.get('rosario.session.v1')).index,1);b.history.back();assert.match(b.app.innerHTML,/home-nav/);
 b.click('start');assert.ok(b.hasDialog());b.chooseDialog(1);assert.match(b.app.innerHTML,/Acto de contrición/);assert.equal(JSON.parse(b.stored.get('rosario.session.v1')).index,1);
 for(let i=1;i<lastFrame;i++)b.click('next');b.click('home');assert.equal(b.history.cursor,0);assert.match(b.app.innerHTML,/home-nav/);
});
test('navegación: recargar una lectura conserva una ruta que puede volver al listado',async()=>{
 const b=await boot();b.click('collection',{collection:'chants'});b.click('read-prayer',{index:'0'});
 const reloaded=await boot({}, {historyEntries:b.history.entries});assert.match(reloaded.readingHTML,/Escuchar canto/);reloaded.history.back();assert.match(reloaded.app.innerHTML,/Buscar un canto/);reloaded.history.back();assert.match(reloaded.app.innerHTML,/home-nav/);
});
test('navegación: Atrás protege los cambios sin guardar del editor y permite descartarlos',async()=>{
 const b=await boot();b.click('settings');b.click('editor');b.edit('add-item',{group:'opening'});
 b.history.back();assert.ok(b.hasDialog());assert.equal(b.history.state.sanctumRosarium.view,'editor');assert.match(b.app.innerHTML,/Editar oración/);
 b.chooseDialog(0);assert.equal(b.hasDialog(),false);b.history.back();b.chooseDialog(1);assert.match(b.app.innerHTML,/Ajustes/);assert.equal(b.history.state.sanctumRosarium.view,'settings');assert.equal(b.stored.has('rosario.config.v1'),false);
 b.history.back();assert.match(b.app.innerHTML,/home-nav/);
});
test('tap: solo la mitad derecha avanza; los controles y los gestos no generan avances dobles',async()=>{
 const b=await boot();b.click('start');b.tap(100);b.tap(350,'button');b.tap(350,'a');assert.equal(JSON.parse(b.stored.get('rosario.session.v1')).index,0);
 b.tap(350);assert.equal(JSON.parse(b.stored.get('rosario.session.v1')).index,1);assert.ok(b.node('.page-content').classes.has('page-enter-next'));
 b.click('session-back');assert.equal(JSON.parse(b.stored.get('rosario.session.v1')).index,0);assert.ok(b.node('.page-content').classes.has('page-enter-back'));
 b.swipe(-100);b.tap(350);assert.equal(JSON.parse(b.stored.get('rosario.session.v1')).index,1);
 const scrolling=await boot();scrolling.click('start');scrolling.swipe(0,120);scrolling.tap(350);assert.equal(JSON.parse(scrolling.stored.get('rosario.session.v1')).index,0);
 const selection=await boot({}, {selectionRange:true});selection.click('start');selection.tap(350);assert.equal(JSON.parse(selection.stored.get('rosario.session.v1')).index,0);
});
test('tap: en el misterio avanza una sola cuenta, sin saltar hasta la cuenta tocada',async()=>{
 const b=await boot();b.click('start');for(let i=0;i<3;i++)b.tap(350);b.node('.page-content').classes.clear();b.bead(8,350);assert.equal(JSON.parse(b.stored.get('rosario.session.v1')).index,4);assert.equal(b.pulses.at(-1),18);assert.equal(b.node('.page-content').classes.size,0);
 b.tap(350);assert.equal(JSON.parse(b.stored.get('rosario.session.v1')).index,5);
});
test('primer uso: el modo físico muestra cinco misterios completos y registra la racha solo al finalizar',async()=>{
 const b=await boot({}, {firstUse:true});b.click('start');assert.match(b.app.innerHTML,/¿Cómo quieres rezar/);assert.match(b.app.innerHTML,/Con mi rosario físico/);assert.match(b.app.innerHTML,/Con el contador de la app/);assert.equal(b.stored.has('rosario.session.v1'),false);
 b.click('choose-mode',{mode:'physical'});assert.equal(JSON.parse(b.stored.get('rosario.settings.v1')).mode,'physical');assert.equal(b.history.length,2);
 for(let i=0;i<3;i++)b.tap(350);
 for(let mystery=0;mystery<5;mystery++){
  assert.match(b.app.innerHTML,/class="cross lit"/);assert.equal((b.app.innerHTML.match(/<circle class="lit"/g)||[]).length,10);assert.match(b.app.innerHTML,/class="decade-after"/);assert.doesNotMatch(b.app.innerHTML,/data-count|count-help/);assert.equal(b.stored.has('rosario.days.v1'),false);b.tap(350);
 }
 for(let i=0;i<config.flow.closing.length;i++)b.tap(350);assert.match(b.app.innerHTML,/Rosario completado/);assert.equal(JSON.parse(b.stored.get('rosario.days.v1')).length,1);b.tap(350);assert.equal(JSON.parse(b.stored.get('rosario.days.v1')).length,1);
 b.click('home');b.click('start');assert.doesNotMatch(b.app.innerHTML,/¿Cómo quieres rezar/);assert.equal(JSON.parse(b.stored.get('rosario.session.v1')).mode,'physical');
});
test('primer uso: el contador mantiene las cuentas y Ajustes permite cambiar el modo sin perder el misterio',async()=>{
 const b=await boot({}, {firstUse:true});b.click('start');b.click('choose-mode',{mode:'app'});for(let i=0;i<3+24+7;i++)b.click('next');
 assert.equal(JSON.parse(b.stored.get('rosario.session.v1')).index,34);b.history.back();b.click('settings');b.change('mode-physical','physical');let saved=JSON.parse(b.stored.get('rosario.session.v1'));assert.equal(saved.index,5);assert.equal(saved.mode,'physical');
 b.click('home');b.click('start');b.chooseDialog(1);assert.match(b.app.innerHTML,/Tercer Misterio/);assert.doesNotMatch(b.app.innerHTML,/data-count/);
 b.history.back();b.click('settings');b.change('mode-app','app');saved=JSON.parse(b.stored.get('rosario.session.v1'));assert.equal(saved.index,27);assert.equal(saved.mode,'app');
 b.click('home');b.click('start');b.chooseDialog(1);assert.match(b.app.innerHTML,/Tercer Misterio/);assert.match(b.app.innerHTML,/data-count="0"/);assert.match(b.app.innerHTML,/Desliza o toca la cruz/);
});
test('predeterminado: incluye el nuevo cierre y Restaurar recupera el JSON aprobado',async()=>{
 assert.deepEqual(config.flow.closing,['trinity','salve','litany','personal-2','offering','personal-3']);
 const b=await boot();b.click('start');for(let i=0;i<66;i++)b.click('next');assert.match(b.app.innerHTML,/Bajo tu amparo nos acogemos/);b.click('next');assert.match(b.app.innerHTML,/Ofrecimiento/);b.click('next');assert.match(b.app.innerHTML,/Ave María Purísima/);assert.equal(b.stored.has('rosario.days.v1'),false);b.click('next');assert.match(b.app.innerHTML,/Rosario completado/);
 const custom=structuredClone(config);custom.prayers.sign.text='Texto personalizado';custom.flow.closing=['offering'];
 const edited=await boot({'rosario.config.v1':JSON.stringify(custom)});edited.click('start');assert.match(edited.app.innerHTML,/Texto personalizado/);edited.click('home');edited.click('settings');edited.click('editor');edited.edit('restore');edited.chooseDialog(1);edited.edit('save');assert.deepEqual(JSON.parse(edited.stored.get('rosario.config.v1')),config);
});
test('calendario: conserva selecciones entre meses y deshacer un tap elimina ese cambio del borrador',async()=>{
 const month=localDay().slice(0,7),previous=shiftMonth(month,-1),last=monthDays(previous).days.at(-1),yesterday=previousDay(localDay());
 const b=await boot();b.click('settings');b.click('calendar-day',{day:yesterday});b.click('calendar-month',{offset:'-1'});assert.match(b.node('#streak-calendar').innerHTML,new RegExp('data-day="'+last+'"'));b.click('calendar-day',{day:last});b.click('calendar-month',{offset:'1'});assert.match(b.node('#streak-calendar').innerHTML,new RegExp('data-day="'+yesterday+'"[^>]*aria-pressed="true"'));b.click('save-days');assert.deepEqual(JSON.parse(b.stored.get('rosario.days.v1')),[...new Set([last,yesterday])].sort());
 b.click('calendar-day',{day:yesterday});b.click('calendar-day',{day:yesterday});assert.equal(b.node('#save-days').disabled,true);
});
test('calendario: acepta hoy, bloquea el futuro y descarta un borrador que no se guardó',async()=>{
 const today=localDay(),date=new Date(today+'T12:00:00');date.setDate(date.getDate()+1);const tomorrow=localDay(date);
 const b=await boot();b.click('settings');b.click('calendar-day',{day:today});b.click('save-days');assert.deepEqual(JSON.parse(b.stored.get('rosario.days.v1')),[today]);
 for(const day of [tomorrow,'2099-01-01','2026-02-30','']){b.click('calendar-day',{day});assert.match(b.node('#history-status').textContent,/fechas válidas/);assert.deepEqual(JSON.parse(b.stored.get('rosario.days.v1')),[today]);}
 const before=b.node('#streak-calendar').innerHTML;b.click('calendar-month',{offset:'1'});assert.equal(b.node('#streak-calendar').innerHTML,before);
 b.click('calendar-day',{day:today});b.click('back');b.click('settings');assert.match(b.app.innerHTML,new RegExp('data-day="'+today+'"[^>]*aria-pressed="true"'));assert.match(b.app.innerHTML,/data-action="save-days" disabled/);
});

function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
test('carga visual: no muestra Inicio hasta tener fondo decodificado, fuentes y layout listos',async()=>{
 const image=deferred(),fonts=deferred(),layout=deferred();
 const b=await boot({}, {pending:true,imageGate:image.promise,fontGate:fonts.promise,fontReadyGate:layout.promise});
 assert.match(b.app.innerHTML,/Preparando/);assert.equal(b.images.length,1);
 assert.ok(b.fontLoads.includes('400 16px RosarioSerif'),'La fuente regular de misterios se prepara desde el inicio');
 await b.windowEvent('beforeinstallprompt',{preventDefault(){}});await b.windowEvent('storage',{key:'rosario.days.v1'});
 assert.doesNotMatch(b.app.innerHTML,/home-nav/,'Los eventos no adelantan la primera pantalla');
 fonts.resolve();image.resolve();await new Promise(resolve=>setTimeout(resolve,0));assert.doesNotMatch(b.app.innerHTML,/home-nav/);
 layout.resolve();await b.evaluation;assert.match(b.app.innerHTML,/home-nav/);assert.ok(b.images[0].decoded);
 assert.equal(b.node('.home-art').replacement,b.images[0]);
 b.click('start');b.click('next');b.click('next');b.click('next');assert.match(b.app.innerHTML,/Primer Misterio/);
 b.click('home');assert.equal(b.images.length,1);assert.equal(b.fontLoads.length,4,'Navegar no solicita más fuentes');assert.equal(b.node('.home-art').replacement,b.images[0]);
});
test('carga visual: fondo pendiente retiene la pantalla aunque las fuentes estén listas',async()=>{
 const image=deferred();const b=await boot({}, {pending:true,imageGate:image.promise});
 await new Promise(resolve=>setTimeout(resolve,0));assert.doesNotMatch(b.app.innerHTML,/home-nav/);
 image.resolve();await b.evaluation;assert.match(b.app.innerHTML,/home-nav/);
});
test('carga visual: un recurso fallido ofrece reintento y nunca muestra UI incompleta',async()=>{
 for(const options of [{imageFailure:true},{fontFailure:true},{missingFont:true}]){
  const b=await boot({},options);assert.match(b.app.innerHTML,/startup-error/);assert.match(b.app.innerHTML,/Reintentar/);assert.doesNotMatch(b.app.innerHTML,/home-nav/);
  await b.windowEvent('beforeinstallprompt',{preventDefault(){}});assert.match(b.app.innerHTML,/startup-error/);
 }
});

test('lecturas: español, latín y cantos abren diálogos; Volver y Escape cierran sin perder filtro ni listado',async()=>{
 for(const collection of ['es','la','chants']){
  const b=await boot();b.click('collection',{collection});b.search('María');
  const list=b.app.innerHTML,filtered=b.node('#prayer-list').innerHTML;
  b.click('read-prayer',{index:'0'});assert.ok(b.hasDialog());assert.equal(b.dialog.className,'reading-dialog');assert.equal(b.dialog.attributes['aria-labelledby'],'reading-title');assert.equal(b.app.innerHTML,list);assert.ok(b.readingHTML.includes('reading-title'));
  const depth=b.history.cursor;b.closeReading();assert.equal(b.hasDialog(),false);assert.equal(b.history.cursor,depth-1);assert.equal(b.history.state.sanctumRosarium.view,'collection');assert.equal(b.app.innerHTML,list);assert.equal(b.node('#prayer-search').value,'María');assert.equal(b.node('#prayer-list').innerHTML,filtered);
  b.history.forward();assert.ok(b.hasDialog());b.cancelReading();assert.equal(b.hasDialog(),false);assert.equal(b.history.state.sanctumRosarium.view,'collection');
 }
});
test('lectura: recargar reconstruye el diálogo y Atrás lo cierra sin crear entradas extra',async()=>{
 const b=await boot();b.click('collection',{collection:'la'});b.click('read-prayer',{index:'1'});
 const reloaded=await boot({}, {historyEntries:b.history.entries});assert.match(reloaded.readingHTML,/Pater noster/);assert.match(reloaded.app.innerHTML,/prayer-list/);const length=reloaded.history.length;
 reloaded.history.back();assert.equal(reloaded.hasDialog(),false);assert.equal(reloaded.history.length,length);reloaded.history.back();assert.match(reloaded.app.innerHTML,/home-nav/);
});
test('cantos: letras tradicionales se muestran en el diálogo sin reemplazar textos personalizados',async()=>{
 const old=structuredClone(config);old.chantCatalogVersion=1;
 const song=old.chants.find(p=>p.title==='Bendita sea tu pureza');song.blocks=[{type:'text',text:song.legacyDescription}];
 const own=old.chants.find(p=>p.title==='Oh María, Madre mía');own.blocks=[{type:'text',text:'Mi letra aportada'}];
 const b=await boot({'rosario.config.v1':JSON.stringify(old)});b.click('collection',{collection:'chants'});b.click('read-prayer',{index:String(old.chants.indexOf(song))});assert.match(b.readingHTML,/y eternamente lo sea/i);assert.doesNotMatch(b.readingHTML,/Una ofrenda de amor/);
 const saved=JSON.parse(b.stored.get('rosario.config.v1'));assert.equal(saved.chants.find(p=>p.title===own.title).blocks[0].text,'Mi letra aportada');
});

test('donativos: corazón, monedas, cantidades y Atrás permanecen dentro de la app',async()=>{
 const b=await boot();assert.match(b.app.innerHTML,/class="donation-button".*aria-label="Donativo voluntario"/);
 b.click('settings');assert.match(b.app.innerHTML,/class="utility coffee-settings" data-action="donation"/);b.click('donation');assert.match(b.app.innerHTML,/Si esta app te ha ayudado a rezar, considera apoyarme con una donación/);b.history.back();assert.match(b.app.innerHTML,/Ajustes/);b.click('home');b.click('donation');assert.match(b.app.innerHTML,/¿Me invitas un café\?/);assert.match(b.app.innerHTML,/currency_code=MXN&amp;amount=60.00/);
 b.click('donation-preset',{amount:'150'});assert.match(b.app.innerHTML,/currency_code=MXN&amp;amount=150.00/);
 b.click('donation-currency',{currency:'USD'});assert.match(b.app.innerHTML,/currency_code=USD&amp;amount=3.00/);
 b.donationAmount('7,25');const link=b.node('#donation-checkout');assert.equal(new URL(link.attributes.href).searchParams.get('amount'),'7.25');assert.equal(new URL(link.attributes.href).searchParams.get('currency_code'),'USD');
 b.donationAmount('0');assert.equal(link.attributes.href,undefined);assert.equal(link.attributes['aria-disabled'],'true');assert.match(b.node('#donation-status').textContent,/mayor que cero/);
 b.click('settings');b.history.back();assert.match(b.app.innerHTML,/id="donation-checkout".*aria-disabled="true"/);assert.doesNotMatch(b.app.innerHTML,/href="null"/);
 b.click('donation-preset',{amount:'10'});assert.match(b.app.innerHTML,/amount=10.00/);assert.match(b.app.innerHTML,/aria-invalid="false"/);
 const reloaded=await boot({}, {historyEntries:b.history.entries,historyCursor:b.history.cursor});assert.match(reloaded.app.innerHTML,/¿Me invitas un café\?/);reloaded.history.back();assert.match(reloaded.app.innerHTML,/home-nav/);
});
function streakDays(count){let day=localDay();return Array.from({length:count},()=>{const result=day;day=previousDay(day);return result;});}
test('café: con cinco días, el aviso se guarda al mostrarlo y no reaparece al volver o recargar',async()=>{
 const seed={'rosario.days.v1':JSON.stringify(streakDays(5))},b=await boot(seed);
 assert.match(b.dialog.innerHTML,/¿Me invitas un café/);assert.equal(JSON.parse(b.stored.get('rosario.support.v1')).lastShown,localDay());
 b.chooseDialog(1);assert.match(b.app.innerHTML,/¿Me invitas un café\?/);b.history.back();assert.equal(b.hasDialog(),false);
 await b.windowEvent('beforeinstallprompt',{preventDefault(){}});assert.equal(b.hasDialog(),false);
 const reloaded=await boot(Object.fromEntries(b.stored));assert.equal(reloaded.hasDialog(),false);
 const four=await boot({'rosario.days.v1':JSON.stringify(streakDays(4))});assert.equal(four.hasDialog(),false);
});
test('café: siete días entre avisos; Escape cierra el diálogo y respeta avisos de otra pestaña',async()=>{
 let sixDaysAgo=localDay();for(let i=0;i<6;i++)sixDaysAgo=previousDay(sixDaysAgo);
 const seed={'rosario.days.v1':JSON.stringify(streakDays(12)),'rosario.support.v1':JSON.stringify({lastShown:sixDaysAgo})};
 const quiet=await boot(seed);assert.equal(quiet.hasDialog(),false);
 const weekly=await boot({...seed,'rosario.support.v1':JSON.stringify({lastShown:previousDay(sixDaysAgo)})});assert.ok(weekly.hasDialog());
 weekly.dialog.emit('cancel',{});assert.equal(weekly.hasDialog(),false);weekly.click('settings');weekly.click('home');assert.equal(weekly.hasDialog(),false);
 const other=await boot(seed);other.click('settings');other.stored.set('rosario.support.v1',JSON.stringify({lastShown:localDay()}));other.click('home');assert.equal(other.hasDialog(),false);
 const blocked=await boot(seed,{blockStorage:true});assert.equal(blocked.hasDialog(),false);
 const firstBlocked=await boot({'rosario.days.v1':JSON.stringify(streakDays(5))},{blockStorage:true});firstBlocked.chooseDialog(0);firstBlocked.click('settings');firstBlocked.click('home');assert.equal(firstBlocked.hasDialog(),false);
});
test('café: completar el quinto día no interrumpe el rosario ni la celebración',async()=>{
 const before=streakDays(5).slice(1),b=await boot({'rosario.days.v1':JSON.stringify(before)});
 assert.equal(b.hasDialog(),false);b.click('start');for(let i=0;i<lastFrame;i++)b.click('next');
 assert.match(b.app.innerHTML,/Rosario completado/);assert.equal(b.hasDialog(),false);assert.equal(b.stored.has('rosario.support.v1'),false);
 b.click('home');assert.match(b.dialog.innerHTML,/¿Me invitas un café/);b.chooseDialog(0);assert.match(b.app.innerHTML,/Racha de 5 días/);
});
test('cantos: solo aparece YouTube, incluso con fuentes guardadas; la migración conserva los textos propios',async()=>{
 assert.ok(config.chants.every(song=>/^https:\/\//.test(song.lyricsSource)&&/^https:\/\//.test(song.listenUrl)));
 const old=structuredClone(config);old.chantCatalogVersion=2;
 for(const song of old.chants){delete song.lyricsSource;delete song.listenUrl;}
 old.chants[0].blocks=[{type:'text',text:'Mi letra aportada'}];old.chants[0].lyricsSource='https://example.com/mi-fuente';
 const b=await boot({'rosario.config.v1':JSON.stringify(old)}),saved=JSON.parse(b.stored.get('rosario.config.v1'));
 assert.equal(saved.chants[0].blocks[0].text,'Mi letra aportada');assert.equal(saved.chants[0].lyricsSource,'https://example.com/mi-fuente');
 assert.ok(saved.chants.every(song=>song.lyricsSource&&song.listenUrl));
 b.click('collection',{collection:'chants'});for(let index=0;index<config.chants.length;index++){
  b.click('read-prayer',{index:String(index)});assert.match(b.readingHTML,/Escuchar canto/);assert.doesNotMatch(b.readingHTML,/chant-source|Consultar letra y fuente|https:\/\/example.com\/mi-fuente/);assert.equal((b.readingHTML.match(/href=/g)||[]).length,1);b.closeReading();
 }
 const invalid=structuredClone(config);invalid.chants[0].lyricsSource='javascript:alert(1)';
 const {validateConfig}=await import('../engine.mjs');assert.throws(()=>validateConfig(invalid),/enlace de la letra/);
});

test('cantos: los dispositivos de la versión anterior reciben letras completas en sus diálogos',async()=>{
 const old=structuredClone(config);old.chantCatalogVersion=3;
 for(const song of old.chants)if(song.previousBlocks)song.blocks=structuredClone(song.previousBlocks);
 const b=await boot({'rosario.config.v1':JSON.stringify(old)});b.click('collection',{collection:'chants'});
 for(let index=0;index<config.chants.length;index++){
  const song=config.chants[index];if(!song.previousBlocks)continue;
  b.click('read-prayer',{index:String(index)});
  assert.ok(b.readingHTML.includes(song.blocks[0].text),song.title);assert.match(b.readingHTML,/Escuchar canto/);assert.doesNotMatch(b.readingHTML,/Consultar letra y fuente|chant-source/);b.closeReading();
 }
 assert.equal(JSON.parse(b.stored.get('rosario.config.v1')).chantCatalogVersion,4);
});
