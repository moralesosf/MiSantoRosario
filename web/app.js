import {nativeMessage,exportJson} from './native.mjs';
import {normalizeReminderState,reminderSettingsMarkup} from './reminders.mjs';
import {prepareVisuals} from './visuals.mjs';
import {RosaryEditor} from './editor.js';
import {localDay,streakFor,completeDay,updateChantCatalog,familyFor,buildFrames,changeSessionMode,validateConfig} from './engine.mjs';
import {monthDays,shiftMonth,validPrayerDay,applyDayChanges} from './calendar.mjs';
import {donationPresets,paypalDonationUrl,shouldOfferCoffee} from './donations.mjs';

const APP_VERSION='1.6.0';
let reminderState=normalizeReminderState();
window.rosarioReminderState=value=>{reminderState=normalizeReminderState(value);if(view==='settings')render(false);};
let visuals=null,readingDialog=null;
const app=document.querySelector('#app');
const keys={config:'rosario.config.v1',settings:'rosario.settings.v1',dates:'rosario.days.v1',session:'rosario.session.v1',support:'rosario.support.v1'};
let persistence=true;
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{persistence=false;return false;}}
function remove(key){try{localStorage.removeItem(key);}catch{persistence=false;}}
let defaults,config,cross,settings=read(keys.settings,{haptic:true,enlarged:false,family:'auto'}),dates=read(keys.dates,[]),studio=null,session=null,frames=[],view='home',collection='es',selected=null;
if(!Array.isArray(dates))dates=[];
const escape=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const crossSvg=(cls='intro-cross')=>`<svg class="${cls}" viewBox="${cross.viewBox}" aria-hidden="true"><path fill="currentColor" transform="${cross.transform}" d="${cross.d}"/></svg>`;
const flame=(cls='')=>`<svg class="${cls}" viewBox="0 0 96 120" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M28 4c4-7 11-4 15 4l20 27 8-6c6-4 10-2 14 7 18 32 15 57-9 73-32 23-72 5-75-25-3-23 11-53 27-80Zm12 44c3-7 10-6 13 1l6 13 5-3c5-4 9-1 11 7 12 27-1 42-21 38-23-5-25-25-14-56Z"/></svg>`;
const backArrow='<svg class="back-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m10 5-7 7 7 7M3 12h18"/></svg>';
const coffeeMug='<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 11h18v11a6 6 0 0 1-6 6h-6a6 6 0 0 1-6-6V11ZM23 13h2a5 5 0 0 1 0 10h-2M3 30h23M9 2c-2 2 2 3 0 5m6-5c-2 2 2 3 0 5m6-5c-2 2 2 3 0 5"/></svg>';
let donationCurrency='MXN',donationValue=donationPresets.MXN[0],supportShown=null;
function donationScreen(){
 const url=paypalDonationUrl(donationCurrency,donationValue),custom=!donationPresets[donationCurrency].includes(donationValue);
 app.innerHTML=`<section class="screen">${header()}<article class="page-content donation-content"><div class="donation-mug">${coffeeMug}</div><h1 class="page-title">¿Me invitas un café?</h1><p class="donation-intro">Si esta app te ha ayudado a rezar, considera apoyarme con una donación.</p><div class="donation-card"><fieldset class="donation-currencies"><legend>Elige la moneda</legend>${Object.keys(donationPresets).map(currency=>`<button data-action="donation-currency" data-currency="${currency}" aria-pressed="${currency===donationCurrency}">${currency==='MXN'?'Pesos mexicanos':'Dólares'} <span>${currency}</span></button>`).join('')}</fieldset><fieldset class="donation-amounts"><legend>¿Cuánto te gustaría aportar?</legend><div class="donation-presets">${donationPresets[donationCurrency].map(amount=>`<button data-action="donation-preset" data-amount="${amount}" aria-pressed="${amount===donationValue}">$${amount}<small>${donationCurrency}</small></button>`).join('')}</div></fieldset><label class="donation-custom" for="donation-amount">Otra cantidad (${donationCurrency})<input id="donation-amount" type="text" inputmode="decimal" autocomplete="off" maxlength="9" placeholder="Escribe un importe" value="${custom?escape(donationValue):''}" aria-invalid="${!url}" aria-describedby="donation-status"></label><p id="donation-status" class="donation-status" role="status">${url?'':'Escribe una cantidad mayor que cero, con hasta dos decimales.'}</p><a id="donation-checkout" class="utility donation-checkout" ${url?`href="${escape(url)}"`:''} aria-disabled="${!url}" target="_blank" rel="noopener noreferrer">Continuar en PayPal <span aria-hidden="true">↗</span></a><p class="donation-note">Revisa la moneda y el importe en PayPal antes de confirmar.</p></div><p class="donation-thanks">Gracias por acompañar este proyecto.</p><p class="donation-author">Andrés Morales Gil<br><span>andresmorales.vc@gmail.com</span></p></article></section>`;
}
function updateDonationAmount(value){
 donationValue=value;
 const url=paypalDonationUrl(donationCurrency,value),checkout=document.querySelector('#donation-checkout'),status=document.querySelector('#donation-status');
 app.querySelectorAll('[data-action="donation-preset"]').forEach(button=>button.setAttribute('aria-pressed','false'));
 checkout.setAttribute('aria-disabled',String(!url));
 if(url)checkout.setAttribute('href',url);else checkout.removeAttribute('href');
 status.textContent=url?'':`Escribe una cantidad mayor que cero, con hasta dos decimales (${donationCurrency}).`;
 document.querySelector('#donation-amount').setAttribute('aria-invalid',String(!url));
}
function maybeOfferCoffee(){
 if(view!=='home'||document.querySelector('dialog'))return;
 const today=localDay(),support=read(keys.support,{}),streak=streakFor(dates);
 if(!shouldOfferCoffee(streak,support?.lastShown,today)||!shouldOfferCoffee(streak,supportShown,today))return;
 supportShown=today;save(keys.support,{lastShown:today});
 modal('¿Me invitas un café?','Si esta app te ha ayudado a rezar, considera apoyarme con una donación. Es totalmente voluntario.',[['Ahora no',()=>{}],['Invitar un café',()=>go('donation')]]);
}
function feedback(type='swipe'){if(!settings.haptic)return;if(nativeMessage('vibrate',{kind:type}))return;if(typeof navigator.vibrate==='function')try{navigator.vibrate(type==='bead'?18:type==='complete'?[30,50,30]:12);}catch{}}
function announce(t){document.querySelector('#live').textContent=t;}
function block(b){
 if(b.type==='prayer')return `<p class="prayer-block">${escape(config.prayers[b.ref].text)}</p>`;
 if(b.type==='dialogue')return `<p class="prayer-block"><span class="dialogue-leader">${escape(b.leader)}</span><br><span class="dialogue-response">${escape(b.response)}</span></p>`;
 return `<p class="prayer-block${b.type==='response'?' dialogue-response':''}">${escape(b.text)}${b.emphasis?`<strong>${escape(b.emphasis)}</strong>`:''}${escape(b.suffix||'')}</p>`;
}
function header(label='Volver',progress=null,action='back'){return `<header class="session-header"><button class="back" data-action="${action}">${label==='Volver'?backArrow:''}<span>${label}</span></button>${progress!==null?`<div class="progress" role="progressbar" aria-label="Progreso del rosario" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress)}"><span class="progress-filled" style="width:${progress}%"></span><span class="progress-rest"></span></div>`:''}</header>`;}
function home(){
 const streak=streakFor(dates),resume=validSavedSession();
 app.innerHTML=`<section class="screen home"><span class="home-art" data-asset="./assets/home-background.svg" aria-hidden="true"></span><div class="home-content"><button class="donation-button" data-action="donation" aria-label="Donativo voluntario">${coffeeMug}</button><button class="settings-button" data-action="settings" aria-label="Ajustes"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M2 5h15m7 0h6M2 16h4m7 0h17M2 27h21m7 0h0"/><circle cx="20" cy="5" r="3.5"/><circle cx="9" cy="16" r="3.5"/><circle cx="26" cy="27" r="3.5"/></svg></button>${flame('home-flame')}<p class="streak-number" aria-label="Racha de ${streak} ${streak===1?'día':'días'}">${streak}</p><nav class="home-nav" aria-label="Oraciones"><button class="pill" data-action="start">Rosario<span class="sr-only">${resume?', continuar oración':''}</span></button><button class="pill" data-action="collection" data-collection="es">Más oraciones</button><button class="pill" data-action="collection" data-collection="la">Oraciones en latín</button><button class="pill" data-action="collection" data-collection="chants">Cantos</button></nav></div></section>`;
 app.querySelector('.home-art').replaceWith(visuals.homeBackground);
}
function modeScreen(){app.innerHTML=`<section class="screen">${header()}<article class="page-content mode-content"><h1 class="page-title">¿Cómo quieres rezar?</h1><p class="mode-intro">Elige cómo acompañar tu rosario.</p><button class="mode-option" data-action="choose-mode" data-mode="physical">${crossSvg('mode-cross')}<span><strong>Con mi rosario físico</strong><small>Cuento con mi rosario. La app me muestra los misterios y las oraciones.</small></span></button><button class="mode-option" data-action="choose-mode" data-mode="app"><svg class="mode-beads" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="8" r="5"/><circle cx="38" cy="18" r="5"/><circle cx="33" cy="35" r="5"/><circle cx="15" cy="35" r="5"/><circle cx="10" cy="18" r="5"/></svg><span><strong>Con el contador de la app</strong><small>Avanzo cuenta por cuenta al tocar o deslizar.</small></span></button><p class="mode-note">Puedes cambiarlo en Ajustes cuando quieras.</p></article></section>`;}
function rosary(count,interactive=true){
 const points=Array.from({length:10},(_,i)=>[278+175*Math.sin(i*Math.PI/5),220-184*Math.cos(i*Math.PI/5)]);
 const attr=n=>interactive?`data-count="${n}" role="button" tabindex="0" aria-label="${n===0?'Padre Nuestro':`Ave María ${n} de 10`}${count>=n?', rezada':''}"`:'';
 return `<svg class="rosary" viewBox="0 0 556 438" role="group" aria-label="${count<0?'Inicia con la cruz':count===0?'Padre Nuestro':`${Math.min(count,10)} de 10 avemarías`}"><g ${attr(0)}><rect x="221" y="133" width="114" height="170" fill="transparent"/><path class="cross ${count>=0?'lit':''}" transform="translate(231,146) scale(3.76) ${cross.transform}" d="${cross.d}"/></g>${points.map(([x,y],i)=>`<g ${attr(i+1)}><circle class="${count>=i+1?'lit':''}" cx="${x}" cy="${y}" r="34.5"/></g>`).join('')}</svg>`;
}
function sessionScreen(){
 const f=frames[session.index];if(!f){session.index=0;return sessionScreen();}
 if(f.layout==='completion'){renderCompletion();return;}
 const layout=config.layouts[f.layout];
 const progress=15+(session.index/(frames.length-1))*78;
 if(layout.type==='decade'){
 const mystery=config.mysteries[f.family].items[f.mystery],ord=['Primer','Segundo','Tercer','Cuarto','Quinto'][f.mystery];
 app.innerHTML=`<section class="screen session-decade">${header('Volver',progress,'session-back')}<article class="page-content"><p class="mystery-label">${ord} Misterio ${escape(config.mysteries[f.family].label)}</p><h1 class="mystery-title">${escape(mystery.title).replace(/\n/g,'<br>')}</h1><div class="rosary-wrap">${rosary(f.count,session.mode!=='physical')}${f.count<10?`<button class="count-help" data-action="show-prayer">${f.count<0?'Desliza o toca la cruz':f.count===0?'Padre Nuestro · Ver oración':`Ave María ${f.count} de 10 · Ver oración`}</button>`:''}</div>${f.count===10?`<div class="decade-after">${config.decade.after.map(block).join('')}</div>`:''}</article></section>`;
 }else{
 const p=config.pages[f.page],cls=['intro','contrition'].includes(layout.className)?layout.className:'';
 app.innerHTML=`<section class="screen ${cls} ${layout.type==='dialogue'?'dialogue-page':''}">${header('Volver',progress,'session-back')}<article class="page-content ${layout.align==='center'?'center':''}">${p.title?`<h1 class="page-title">${escape(p.title)}</h1>`:''}${layout.showCross?crossSvg():''}${p.blocks.map(block).join('')}</article></section>`;
 }
}
function renderCompletion(){
 const streak=session.streakAfter??streakFor(dates),before=session.streakBefore??streak;
 app.innerHTML=`<section class="screen completion">${header('Inicio',100,'home')}<article class="page-content"><h1 class="page-title">Rosario completado</h1><div class="completion-rosary">${rosary(10,false)}</div><div class="streak-celebration ${before!==streak?'streak-increased':''}" role="img" aria-label="Racha de ${streak} ${streak===1?'día':'días'}"><div class="celebration-flame">${flame('flame-rise')}<i class="ember ember-one"></i><i class="ember ember-two"></i><i class="ember ember-three"></i></div><div class="streak-counter" aria-hidden="true"><div class="streak-counter-track"><span>${before}</span><span>${streak}</span></div></div></div>${!persistence?'<p class="note" role="alert">No se pudo guardar tu progreso en este navegador.</p>':''}<button class="pill" data-action="home">Volver al inicio</button></article></section>`;
}
function items(){return collection==='chants'?config.chants:config.collections[collection];}
function collectionScreen(){const title={es:'Más oraciones',la:'Oraciones en latín',chants:'Cantos'}[collection];app.innerHTML=`<section class="screen">${header()}<article class="page-content"><h1 class="collection-title">${title}</h1><input class="search" type="search" id="prayer-search" placeholder="${collection==='chants'?'Buscar un canto':'Buscar una oración'}" aria-label="Buscar"><div class="prayer-list" id="prayer-list">${listItems('')}</div></article></section>`;}
function listItems(query){const q=query.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();const result=items().map((p,i)=>({p,i})).filter(({p})=>p.title.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().includes(q));return result.length?result.map(({p,i})=>`<button class="prayer-item" data-action="read-prayer" data-index="${i}"><span>${escape(p.title)}</span><span aria-hidden="true">→</span></button>`).join(''):'<p class="note">No encontramos esa oración.</p>';}
function closeReadingDialog(){if(!readingDialog)return;readingDialog.close();readingDialog.remove();readingDialog=null;}
function readingScreen(){
 const p=items()[selected];if(!app.querySelector('#prayer-list'))collectionScreen();
 const d=document.createElement('dialog');d.className='reading-dialog';
 d.setAttribute('aria-labelledby','reading-title');d.setAttribute('lang',collection==='la'?'la':'es');
 d.classList.toggle('enlarged',!!settings.enlarged);
 d.innerHTML=`<header class="reading-header"><button class="reading-close" data-reading-close aria-label="Cerrar oración">${backArrow}<span>Volver</span></button></header><article class="reading-content"><h2 id="reading-title">${escape(p.title)}</h2>${p.blocks.map(block).join('')}${collection==='chants'&&p.listenUrl?`<a class="utility chant-listen" href="${escape(p.listenUrl)}" target="_blank" rel="noopener noreferrer">Escuchar canto <span aria-hidden="true">↗</span></a>`:''}</article>`;
 document.body.append(d);readingDialog=d;
 d.addEventListener('click',e=>{if(e.target.closest('[data-reading-close]')||e.target===d)back();});
 d.addEventListener('cancel',e=>{e.preventDefault();back();});
 d.showModal();
}

const dayLabel=day=>new Date(day+'T12:00:00').toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'});
let calendarMonth=localDay().slice(0,7),dayChanges=new Map();
const monthArrow=right=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${right?'m9 5 7 7-7 7':'m15 5-7 7 7 7'}"/></svg>`;
function resetCalendar(){calendarMonth=localDay().slice(0,7);dayChanges.clear();}
function calendarMarkup(){
 const today=localDay(),{offset,days}=monthDays(calendarMonth),label=new Date(calendarMonth+'-01T12:00:00').toLocaleDateString('es-MX',{month:'long',year:'numeric'});
 return `<div class="calendar-heading"><button class="calendar-arrow" data-action="calendar-month" data-offset="-1" aria-label="Mes anterior">${monthArrow(false)}</button><h3 class="calendar-month-label" tabindex="-1" aria-live="polite">${escape(label)}</h3><button class="calendar-arrow" data-action="calendar-month" data-offset="1" aria-label="Mes siguiente" ${calendarMonth>=today.slice(0,7)?'disabled':''}>${monthArrow(true)}</button></div><div class="calendar-weekdays" aria-hidden="true">${['L','M','M','J','V','S','D'].map(day=>`<span>${day}</span>`).join('')}</div><div class="calendar-grid" role="group" aria-label="Días de ${escape(label)}">${'<span aria-hidden="true"></span>'.repeat(offset)}${days.map(day=>{const completed=dayChanges.has(day)?dayChanges.get(day):dates.includes(day);return `<button class="calendar-day ${completed?'is-completed':''} ${day===today?'is-today':''}" data-action="calendar-day" data-day="${day}" aria-label="${escape(dayLabel(day))}" aria-pressed="${completed}" ${day===today?'aria-current="date"':''} ${day>today?'disabled':''}>${Number(day.slice(-2))}</button>`;}).join('')}</div>`;
}
function renderCalendar(focus=null){
 document.querySelector('#streak-calendar').innerHTML=calendarMarkup();
 document.querySelector('#save-days').disabled=dayChanges.size===0;
 if(focus)app.querySelector(focus)?.focus?.();
}
function toggleCalendarDay(day){
 const status=document.querySelector('#history-status');
 if(!validPrayerDay(day)){status.textContent='Solo puedes registrar fechas válidas hasta hoy.';return;}
 const saved=dates.includes(day),completed=!(dayChanges.has(day)?dayChanges.get(day):saved);
 if(completed===saved)dayChanges.delete(day);else dayChanges.set(day,completed);
 status.textContent='';renderCalendar(`[data-action="calendar-day"][data-day="${day}"]`);feedback('bead');
}
function navigateCalendar(offset){
 if(![-1,1].includes(offset))return;
 const next=shiftMonth(calendarMonth,offset);if(next>localDay().slice(0,7))return;
 calendarMonth=next;document.querySelector('#history-status').textContent='';renderCalendar('.calendar-month-label');
}
function settingsScreen(){app.innerHTML=`<section class="screen">${header()}<article class="page-content settings-content"><h1 class="page-title">Ajustes</h1><label class="setting-row">Vibración<input class="switch" type="checkbox" id="haptic" ${settings.haptic?'checked':''}></label><label class="setting-row">Texto más grande<input class="switch" type="checkbox" id="enlarged" ${settings.enlarged?'checked':''}></label><label class="setting-row" for="family">Misterios</label><select id="family"><option value="auto" ${settings.family==='auto'?'selected':''}>Automáticos según el día</option>${Object.keys(config.mysteries).map(k=>`<option value="${escape(k)}" ${settings.family===k?'selected':''}>${escape(k[0].toUpperCase()+k.slice(1))}</option>`).join('')}</select><fieldset class="counting-settings"><legend>Cómo rezar el rosario</legend><label><input type="radio" name="rosary-mode" id="mode-physical" value="physical" ${settings.mode==='physical'?'checked':''}><span>Con mi rosario físico</span></label><label><input type="radio" name="rosary-mode" id="mode-app" value="app" ${settings.mode==='app'?'checked':''}><span>Con el contador de la app</span></label></fieldset><button class="utility secondary" data-action="editor">Personalizar</button>${reminderSettingsMarkup(reminderState,!!globalThis.RosarioAndroid?.postMessage)}<section class="prayer-history" aria-labelledby="history-title"><h2 id="history-title">Tu racha</h2><div id="streak-calendar">${calendarMarkup()}</div><button id="save-days" class="utility calendar-save" data-action="save-days" ${dayChanges.size?'':'disabled'}>Guardar</button><p id="history-status" class="history-status" role="status"></p></section>${!persistence?'<p class="note" role="alert">El navegador está impidiendo guardar tu progreso.</p>':''}<button class="utility coffee-settings" data-action="donation">${coffeeMug}<span>¿Me invitas un café?</span></button><footer class="app-credits"><p class="app-name">Sanctum Rosarium</p><p>Versión ${APP_VERSION}</p><p>Desarrollado por Andrés Morales Gil</p></footer></article></section>`;}
function saveCalendar(){
 if(!dayChanges.size)return;
 const status=document.querySelector('#history-status');
 try{
  const latest=read(keys.dates,dates),current=Array.isArray(latest)?latest:dates;
  const updated=applyDayChanges(current,dayChanges);
  if(!save(keys.dates,updated))throw Error('No se pudieron guardar los días. Permite el almacenamiento de este navegador.');
  dates=updated;nativeMessage('sync-prayer-days',{days:dates});dayChanges.clear();renderCalendar();status.textContent='Días guardados.';announce(status.textContent);
 }catch(e){status.textContent=e.message;}
}
function editorScreen(){if(!studio)studio=new RosaryEditor(app,{config,defaults,onSave:applyConfig,onExit:()=>{studio.destroy();studio=null;back();},haptic:()=>feedback('bead'),announce});studio.render();}
function render(resetScroll=true){
 if(!visuals)return;
 const wasReading=!!readingDialog;closeReadingDialog();
 app.classList.toggle('enlarged',!!settings.enlarged);
 const keepList=view==='collection'&&wasReading&&app.querySelector('#prayer-list');
 if(!keepList)({home,donation:donationScreen,mode:modeScreen,session:sessionScreen,collection:collectionScreen,reading:readingScreen,settings:settingsScreen,editor:editorScreen})[view]();
 if(resetScroll&&view!=='reading'&&!keepList)window.scrollTo({top:0,behavior:'instant'});
 maybeOfferCoffee();
}
// Keep the device's Back button inside the app until the user reaches Inicio.
const ROUTE_KEY='sanctumRosarium';
let navigationDepth=0,navigationPending=false;
function routeState(){return {[ROUTE_KEY]:{view,collection,selected,session:session?structuredClone(session):null,depth:navigationDepth}};}
function rememberRoute(push=false){window.history[push?'pushState':'replaceState'](routeState(),'');}
function restoreRoute(route){
 const previousView=view;
 collection=['es','la','chants'].includes(route.collection)?route.collection:'es';
 selected=Number.isInteger(route.selected)?route.selected:null;
 view=['home','donation','mode','session','collection','reading','settings','editor'].includes(route.view)?route.view:'home';
 navigationDepth=Number.isInteger(route.depth)&&route.depth>=0?route.depth:0;
 if(previousView!==view&&(previousView==='settings'||view==='settings'))resetCalendar();
 if(view==='reading'&&!items()[selected])view='collection';
 if(view==='session'){
  const s=route.session;
  if(!s||s.date!==localDay()||!config.mysteries[s.family]){view='home';return;}
  frames=buildFrames(config,s.family,s.mode||'app');
  if(!Number.isInteger(s.index)||!frames[s.index]){view='home';return;}
  session={...s,mode:s.mode==='physical'?'physical':'app'};
  if(frames[s.index].layout!=='completion')save(keys.session,session);
 }
}
function go(to,replace=false){
 if(navigationPending)return;
 if(to==='home'&&navigationDepth>0){navigationPending=true;window.history.go(-navigationDepth);return;}
 if(to!==view&&(view==='settings'||to==='settings'))resetCalendar();
 if(to!==view&&!replace)navigationDepth++;
 const push=to!==view&&!replace;
 view=to;rememberRoute(push);render();
}
window.addEventListener('popstate',e=>{
 navigationPending=false;if(!config)return;
 const dialog=document.querySelector('dialog');
 if(dialog&&dialog!==readingDialog){rememberRoute(true);dialog.close();dialog.remove();if(studio?.dialog===dialog)studio.dialog=null;return;}
 if(view==='editor'&&studio&&(studio.draft.dirty||studio.rawDirty)){rememberRoute(true);studio.requestClose();return;}
 if(studio){studio.destroy();studio=null;}
 restoreRoute(e.state?.[ROUTE_KEY]||{view:'home',depth:0});render();
});
function validSavedSession(){const s=read(keys.session,null);return s&&s.date===localDay()&&config.mysteries[s.family]&&Number.isInteger(s.index)&&s.index>=0&&s.index<buildFrames(config,s.family,s.mode||'app').length-1?{...s,mode:s.mode==='physical'?'physical':'app'}:null;}
function setCountingMode(mode){
 if(!['app','physical'].includes(mode))return;
 settings.mode=mode;save(keys.settings,settings);
 const old=validSavedSession();if(old&&old.mode!==mode)save(keys.session,changeSessionMode(config,old,mode));
}
function openRosary(){
 if(!['app','physical'].includes(settings.mode)){go('mode');return;}
 if(validSavedSession())modal('Tu rosario','Tienes una oración en curso. Puedes retomarla donde la dejaste.',[['Comenzar de nuevo',()=>start()],['Continuar',()=>start(true)]]);else start();
}
function start(resume=false){const old=validSavedSession();session=resume&&old?old:{date:localDay(),family:config.mysteries[settings.family]?settings.family:familyFor(config),mode:settings.mode==='physical'?'physical':'app',index:0};frames=buildFrames(config,session.family,session.mode);save(keys.session,session);go('session',view==='mode');}
function advance(direction=1,type='swipe'){
 if(navigationPending||view!=='session'||document.querySelector('dialog'))return;
 if(frames[session.index].layout==='completion')return;
 const previous=frames[session.index],next=Math.max(0,Math.min(frames.length-1,session.index+direction));if(next===session.index)return;
 session.index=next;
 if(next===frames.length-1){const latest=read(keys.dates,dates);const current=Array.isArray(latest)?latest:dates;session.streakBefore=streakFor(current);dates=completeDay(current);session.streakAfter=streakFor(dates);save(keys.dates,dates);remove(keys.session);feedback('complete');}else{save(keys.session,session);feedback(type);}
 rememberRoute();render();if(next===frames.length-1)nativeMessage('prayer-completed',{days:dates});const f=frames[next];
 if(previous.mystery===undefined||previous.mystery!==f.mystery)app.querySelector('.page-content')?.classList.add(direction>0?'page-enter-next':'page-enter-back');
 announce(f.layout==='completion'?'Rosario completado':f.mystery!==undefined?`${config.mysteries[f.family].items[f.mystery].title}. ${session.mode==='physical'?'Reza este misterio con tu rosario':f.count<0?'Comienza el misterio':f.count===0?'Padre Nuestro':`Ave María ${f.count} de 10`}`:config.pages[f.page].title||'Oración inicial');
}
function showPrayer(){const f=frames[session.index];const id=f.count<=0?config.decade.crossPrayer:config.decade.beadPrayer;const p=config.prayers[id];modal(p.title,p.text,[['Cerrar',()=>{}],['Cuenta rezada',()=>advance(1,'bead')]]);}
function modal(title,body,actions){document.querySelector('dialog')?.remove();const d=document.createElement('dialog');d.innerHTML=`<h2>${escape(title)}</h2><p>${escape(body)}</p><div class="dialog-actions">${actions.map(([label],i)=>`<button data-modal="${i}">${escape(label)}</button>`).join('')}</div>`;document.body.append(d);d.addEventListener('click',e=>{const b=e.target.closest('[data-modal]');if(!b)return;d.close();d.remove();actions[Number(b.dataset.modal)][1]();});d.addEventListener('cancel',()=>d.remove());d.showModal();}
function back(){if(navigationPending)return;if(view==='editor'&&studio){studio.requestClose();return;}if(navigationDepth>0){navigationPending=true;window.history.back();}else go('home',true);}
function applyConfig(candidate){validateConfig(candidate);if(!save(keys.config,candidate))throw Error('No se pudo guardar. Permite el almacenamiento de este navegador.');config=candidate;session=null;remove(keys.session);}
const actions={'reminder-time':()=>nativeMessage('reminder-time'),'reminder-permission':()=>nativeMessage('reminder-permission'),donation:()=>go('donation'),'donation-currency':b=>{const currency=b.dataset.currency;if(!Object.hasOwn(donationPresets,currency))return;donationCurrency=currency;donationValue=donationPresets[currency][0];render(false);},'donation-preset':b=>{if(!donationPresets[donationCurrency].includes(b.dataset.amount))return;donationValue=b.dataset.amount;render(false);},'calendar-day':b=>toggleCalendarDay(b.dataset.day),'calendar-month':b=>navigateCalendar(Number(b.dataset.offset)),'save-days':saveCalendar,home:()=>go('home'),settings:()=>go('settings'),back,start:openRosary,'choose-mode':b=>{setCountingMode(b.dataset.mode);openRosary();},collection:b=>{collection=b.dataset.collection;go('collection');},'read-prayer':b=>{selected=Number(b.dataset.index);go('reading');},next:()=>advance(),'session-back':()=>{if(session.index>0)advance(-1);else go('home');},exit:()=>go('home'),'show-prayer':showPrayer,editor:()=>go('editor'),'save-config':()=>{const status=document.querySelector('#editor-status');try{applyConfig(JSON.parse(document.querySelector('#config-editor').value));status.textContent='Cambios guardados. Se aplicarán al comenzar tu siguiente rosario.';}catch(e){status.textContent='No se guardó: '+e.message;}},'download-config':()=>{try{const candidate=JSON.parse(document.querySelector('#config-editor').value);validateConfig(candidate);exportJson(candidate);}catch(e){document.querySelector('#editor-status').textContent='Revisa el JSON: '+e.message;}},'import-config':()=>document.querySelector('#import-file').click(),'reset-config':()=>modal('Restaurar oraciones','Se reemplazarán tus cambios de oraciones y pantallas por el contenido original. Tu racha se conservará.',[['Cancelar',()=>{}],['Restaurar',()=>{config=structuredClone(defaults);remove(keys.config);remove(keys.session);render();}]])};
app.addEventListener('click',e=>{
 if(navigationPending||(Date.now()<suppressTapUntil&&e.detail>0))return;
 const b=e.target.closest('[data-action]');if(b){actions[b.dataset.action]?.(b);return;}
 const bead=e.target.closest('[data-count]');if(bead&&view==='session'){const f=frames[session.index],n=Number(bead.dataset.count);if(n===f.count+1)advance(1,'bead');else if(n<=f.count){feedback('bead');const p=config.prayers[n===0?config.decade.crossPrayer:config.decade.beadPrayer];modal(p.title,p.text,[['Cerrar',()=>{}]]);}else tapAdvance(e);return;}
 if(!e.target.closest('button,a,input,textarea,select,summary,dialog,[role="button"],[contenteditable]'))tapAdvance(e);
});
function tapAdvance(e){
 if(view!=='session'||e.detail===0||!Number.isFinite(e.clientX)||window.getSelection?.()?.type==='Range')return;
 const bounds=app.getBoundingClientRect();
 if(e.clientX<bounds.left+bounds.width/2||e.clientX>bounds.right)return;
 const f=frames[session.index];advance(1,f.mystery!==undefined&&f.count<10?'bead':'swipe');
}
app.addEventListener('keydown',e=>{const bead=e.target.closest('[data-count]');if(bead&&['Enter',' '].includes(e.key)){e.preventDefault();bead.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
app.addEventListener('input',e=>{if(e.target.id==='prayer-search')document.querySelector('#prayer-list').innerHTML=listItems(e.target.value);if(e.target.id==='donation-amount'&&view==='donation')updateDonationAmount(e.target.value);});
app.addEventListener('change',async e=>{const id=e.target.id;if(id==='reminder-enabled')nativeMessage('reminder-enabled',{enabled:e.target.checked});if(id==='reminder-end-day')nativeMessage('reminder-end-day',{enabled:e.target.checked});if(['mode-app','mode-physical'].includes(id)&&e.target.checked){setCountingMode(e.target.value);announce(e.target.value==='physical'?'Rosario físico seleccionado':'Contador de la app seleccionado');}if(['haptic','enlarged'].includes(id)){settings[id]=e.target.checked;save(keys.settings,settings);if(id==='haptic')feedback('bead');app.classList.toggle('enlarged',settings.enlarged);}if(id==='family'){settings.family=e.target.value;save(keys.settings,settings);}if(id==='import-file'&&e.target.files[0]){try{const f=e.target.files[0];if(f.size>2e6)throw Error('El archivo debe ser menor de 2 MB.');const candidate=JSON.parse(await f.text());validateConfig(candidate);document.querySelector('#config-editor').value=JSON.stringify(candidate,null,2);document.querySelector('#editor-status').textContent='JSON importado. Toca Guardar cambios para aplicarlo.';}catch(err){document.querySelector('#editor-status').textContent=err.message;}e.target.value='';}});
let touch=null,lastGesture=0,suppressTapUntil=0;
app.addEventListener('touchstart',e=>{if(e.touches.length!==1||e.target.closest('input,textarea,select,dialog')){touch=null;return;}touch={x:e.touches[0].clientX,y:e.touches[0].clientY,t:Date.now()};},{passive:true});
app.addEventListener('touchmove',e=>{if(touch&&e.touches.length===1&&(Math.abs(e.touches[0].clientX-touch.x)>12||Math.abs(e.touches[0].clientY-touch.y)>12))touch.moved=true;},{passive:true});
app.addEventListener('touchend',e=>{if(!touch)return;const t=e.changedTouches[0],dx=t.clientX-touch.x,dy=t.clientY-touch.y,dt=Date.now()-touch.t,moved=touch.moved;touch=null;if(view!=='session')return;if(moved||Math.hypot(dx,dy)>12||dt>600)suppressTapUntil=Date.now()+450;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.5&&dt<1500&&Date.now()-lastGesture>220){lastGesture=Date.now();advance(dx<0?1:-1);}},{passive:true});
app.addEventListener('touchcancel',()=>{touch=null;suppressTapUntil=Date.now()+450;},{passive:true});
window.addEventListener('keydown',e=>{if(view!=='session'||document.querySelector('dialog')||e.target.closest('input,textarea,select'))return;if(['ArrowRight','ArrowLeft'].includes(e.key)){e.preventDefault();advance(e.key==='ArrowRight'?1:-1);}});
window.addEventListener('storage',e=>{if(e.key===keys.dates){const latest=read(keys.dates,[]);dates=Array.isArray(latest)?latest:[];if(view==='home'||view==='settings')render(false);}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&view==='home')render(false);});
try{
 [defaults,cross,visuals]=await Promise.all([fetch('./rosario.json').then(r=>{if(!r.ok)throw Error('No se pudo cargar el rosario.');return r.json();}),fetch('./assets/cross-path.json').then(r=>{if(!r.ok)throw Error('No se pudo cargar la cruz.');return r.json();}),prepareVisuals()]);
 validateConfig(defaults);const saved=read(keys.config,null);try{config=saved?updateChantCatalog(validateConfig(saved),defaults):structuredClone(defaults);if(saved)save(keys.config,config);}catch{config=structuredClone(defaults);remove(keys.config);}
 if(!config.mysteries[settings.family]&&settings.family!=='auto')settings.family='auto';
 const route=window.history.state?.[ROUTE_KEY];if(route)restoreRoute(route);rememberRoute();render();
 nativeMessage('sync-prayer-days',{days:dates});nativeMessage('ready');
}catch(e){nativeMessage('error');visuals=null;app.innerHTML=`<section class="startup startup-error" role="alert"><h1>Sanctum Rosarium</h1><p>No se pudo preparar la app. Comprueba tu conexión y vuelve a intentarlo.</p><button id="retry">Reintentar</button></section>`;document.querySelector('#retry').onclick=()=>location.reload();}

// Android's hardware/predictive Back closes the top dialog before navigating.
window.rosarioAndroidBack=()=>{
 if(!config)return false;
 const dialog=document.querySelector('dialog[open]');
 if(dialog&&dialog!==readingDialog){dialog.dispatchEvent(new Event('cancel',{cancelable:true}));if(dialog.isConnected){dialog.close();dialog.remove();}return true;}
 if(view==='home'&&navigationDepth===0)return false;
 back();return true;
};
// target=_blank links bypass WebViewClient on some WebView versions.
document.addEventListener('click',event=>{const link=event.target.closest('a[href]');if(!link)return;const url=new URL(link.href,location.href);if(url.protocol==='https:'&&url.origin!==location.origin&&nativeMessage('external',{url:url.href}))event.preventDefault();},true);
