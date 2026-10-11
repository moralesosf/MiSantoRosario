export const localDay = (date=new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function previousDay(day) { const [y,m,d]=day.split('-').map(Number); return localDay(new Date(y,m-1,d-1,12)); }
export function streakFor(dates,day=localDay()) {const completed=new Set(dates);let cursor=completed.has(day)?day:previousDay(day),n=0;while(completed.has(cursor)){n++;cursor=previousDay(cursor);}return n;}
export function completeDay(dates,day=localDay()){return [...new Set([...dates,day])].sort();}
export function recordPreviousDay(dates,day,today=localDay()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||localDay(new Date(day+'T12:00:00'))!==day)throw Error('Elige una fecha válida.');
 if(day>=today)throw Error('Elige un día anterior a hoy.');
 return completeDay(dates,day);
}
export function updateChantCatalog(config,defaults){
 const previousVersion=config.chantCatalogVersion||0;
 if(previousVersion>=(defaults.chantCatalogVersion||0))return config;
 const title=p=>p.title.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim();
 // Replace only exact content shipped in older versions of the catalog.
 // A user's own lyrics or edits always take precedence over catalog updates.
 for(const song of defaults.chants){
  const existing=config.chants.find(p=>title(p)===title(song));
  const previous=[song.previousBlocks,song.legacyDescription?[{type:'text',text:song.legacyDescription}]:null].filter(Array.isArray);
  if(existing&&previous.some(blocks=>JSON.stringify(existing.blocks)===JSON.stringify(blocks))){
   existing.blocks=structuredClone(song.blocks);
  }
  if(existing){if(!existing.lyricsSource&&song.lyricsSource)existing.lyricsSource=song.lyricsSource;if(!existing.listenUrl&&song.listenUrl)existing.listenUrl=song.listenUrl;}
 }
 const titles=new Set(config.chants.map(title));
 config.chants.push(...structuredClone(defaults.chants.filter(p=>!titles.has(title(p)))));
 const first=config.chants.findIndex(p=>title(p)==='eran cien ovejas');
 if(first>0&&previousVersion<1)config.chants.unshift(...config.chants.splice(first,1));
 config.chantCatalogVersion=defaults.chantCatalogVersion;
 return config;
}
export function familyFor(config,date=new Date()){return config.weekdays[date.getDay()];}
export function buildFrames(config,family,mode='app'){
 const frames=config.flow.opening.map(id=>({layout:config.pages[id].layout,page:id}));
 config.mysteries[family].items.forEach((m,i)=>{if(mode==='physical')frames.push({layout:config.decade.layout,family,mystery:i,count:10});else for(let count=-1;count<=10;count++)frames.push({layout:config.decade.layout,family,mystery:i,count});});
 frames.push(...config.flow.closing.map(id=>({layout:config.pages[id].layout,page:id})),{layout:'completion'});return frames;
}
export function changeSessionMode(config,session,mode){
 const old=buildFrames(config,session.family,session.mode||'app')[session.index];
 const frames=buildFrames(config,session.family,mode);
 const count=mode==='physical'?10:session.mode==='physical'?-1:old?.count;
 const index=frames.findIndex(f=>old?.page?f.page===old.page:old?.mystery!==undefined?f.mystery===old.mystery&&f.count===count:f.layout==='completion');
 return {...session,mode,index:Math.max(0,index)};
}
export function validateConfig(c){
 if(!c||typeof c!=='object')throw Error('El JSON debe contener un rosario.');
 if(c.version!==1)throw Error('La versión del JSON debe ser 1.');
 for(const key of ['layouts','prayers','pages','flow','decade','mysteries','collections'])if(!c[key]||typeof c[key]!=='object'||Array.isArray(c[key]))throw Error(`Falta la sección ${key}.`);
 for(const group of ['opening','closing'])if(!Array.isArray(c.flow[group]))throw Error(`El orden ${group} debe ser una lista.`);
 if(!Array.isArray(c.decade.after))throw Error('Las oraciones después del misterio deben ser una lista.');
 for(const [id,p] of Object.entries(c.prayers))if(!p||typeof p.title!=='string'||!p.title.trim()||typeof p.text!=='string')throw Error(`Revisa el nombre y el texto de la oración ${id}.`);
 const types=new Set(['prayer','dialogue','decade','completion']);
 if(!Array.isArray(c.weekdays)||c.weekdays.length!==7)throw Error('Se requieren siete días en weekdays, comenzando por domingo.');
 for(const key of c.weekdays)if(!c.mysteries[key])throw Error(`No existe la familia ${key}.`);
 for(const [key,m] of Object.entries(c.mysteries)){if(m.items?.length!==5)throw Error(`${key} debe contener cinco misterios.`);if(!m.label||m.items.some(x=>!x.title))throw Error(`Revisa los títulos de ${key}.`);}
 for(const [id,p] of Object.entries(c.pages)){if(!p||!c.layouts[p.layout])throw Error(`Layout desconocido en ${id}.`);if(!['prayer','dialogue'].includes(c.layouts[p.layout].type))throw Error(`La pantalla ${id} necesita un layout de oración o diálogo.`);if(!Array.isArray(p.blocks))throw Error(`El contenido de ${id} debe ser una lista.`);for(const b of p.blocks)validateBlock(b,c);}
 for(const l of Object.values(c.layouts))if(!types.has(l.type))throw Error('Tipo de layout desconocido.');
 for(const id of [...c.flow.opening,...c.flow.closing])if(!c.pages[id])throw Error(`Falta la página ${id}.`);
 if(c.layouts[c.decade.layout]?.type!=='decade')throw Error('El misterio necesita un layout de tipo decade.');
 for(const key of ['crossPrayer','beadPrayer'])if(!c.prayers[c.decade[key]])throw Error(`Falta ${c.decade[key]}.`);
 for(const b of c.decade.after)validateBlock(b,c);
 for(const language of ['es','la']){if(!Array.isArray(c.collections[language]))throw Error(`Falta el catálogo ${language}.`);for(const p of c.collections[language])if(!p.title||!Array.isArray(p.blocks))throw Error(`Oración inválida en ${language}.`);else for(const b of p.blocks)validateBlock(b,c);}
 if(!Array.isArray(c.chants))throw Error('Los cantos deben ser una lista.');
 for(const p of c.chants){if(!p.title||!Array.isArray(p.blocks))throw Error('Canto inválido.');if(p.listenUrl&&!/^https:\/\//.test(p.listenUrl))throw Error('El enlace del canto debe comenzar con https://.');if(p.lyricsSource&&!/^https:\/\//.test(p.lyricsSource))throw Error('El enlace de la letra debe comenzar con https://.');for(const b of p.blocks)validateBlock(b,c);}
 return c;
}
function validateBlock(b,c){if(!b||!['text','prayer','response','dialogue'].includes(b.type))throw Error('Tipo de bloque desconocido.');if(b.type==='prayer'&&!c.prayers[b.ref])throw Error(`Falta la oración ${b.ref}.`);if(b.type==='dialogue'&&(typeof b.leader!=='string'||typeof b.response!=='string'||!b.leader.trim()||!b.response.trim()))throw Error('Completa el versículo y su respuesta antes de guardar.');if(['text','response'].includes(b.type)&&typeof b.text!=='string')throw Error('El texto de la oración debe ser texto.');}
