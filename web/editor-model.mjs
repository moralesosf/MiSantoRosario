import {validateConfig} from './engine.mjs';

export function listFor(c,group,context={}){
 if(group==='opening'||group==='closing')return c.flow[group];
 if(group==='after')return c.decade.after;
 if(group==='blocks')return c.pages[context.page].blocks;
 if(group==='mysteries')return c.mysteries[context.family].items;
 if(group==='prayers')return Object.keys(c.prayers);
 throw Error('Lista desconocida.');
}
export function moveItem(c,group,from,to,context={}){
 const list=listFor(c,group,context);
 if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=list.length||to>=list.length||from===to)return false;
 const [item]=list.splice(from,1);list.splice(to,0,item);
 if(group==='prayers')c.prayers=Object.fromEntries(list.map(id=>[id,c.prayers[id]]));
 return true;
}
function uniqueKey(object,prefix){let n=1;while(Object.hasOwn(object,`${prefix}-${n}`))n++;return `${prefix}-${n}`;}
export function addPage(c,group,copy){
 const id=uniqueKey(c.pages,'personal');
 if(copy)c.pages[id]=structuredClone(c.pages[copy]);
 else {const layout=uniqueKey(c.layouts,'personal');c.layouts[layout]={type:'prayer',align:'left'};c.pages[id]={title:'Nueva oración',layout,blocks:[{type:'text',text:''}]};}
 if(copy)c.pages[id].title=(c.pages[id].title||'Oración')+' · copia';
 c.flow[group].push(id);return id;
}
export function removePage(c,group,index){
 const [id]=c.flow[group].splice(index,1);
 if(![...c.flow.opening,...c.flow.closing].includes(id))delete c.pages[id];
}
export function setPageLayout(c,id,patch){
 const page=c.pages[id],name=`editor-${id}`;
 c.layouts[name]={...c.layouts[page.layout],...patch};page.layout=name;
}
export function addPrayer(c){const id=uniqueKey(c.prayers,'personal');c.prayers[id]={title:'Nueva oración',text:''};return id;}
export function prayerUses(c,id){
 const mandatory=['crossPrayer','beadPrayer'].filter(k=>c.decade[k]===id);
 let blocks=0;forEachBlocks(c,list=>{blocks+=list.filter(b=>b.type==='prayer'&&b.ref===id).length;});
 return {mandatory,blocks};
}
function forEachBlocks(c,fn){for(const p of Object.values(c.pages))fn(p.blocks);fn(c.decade.after);for(const list of Object.values(c.collections))for(const p of list)fn(p.blocks);for(const p of c.chants||[])fn(p.blocks);}
export function removePrayer(c,id,replacement){
 const uses=prayerUses(c,id);
 if(uses.mandatory.length&&(!replacement||replacement===id||!c.prayers[replacement]))throw Error('Elige otra oración para las cuentas antes de eliminar esta.');
 for(const key of uses.mandatory)c.decade[key]=replacement;
 forEachBlocks(c,list=>{for(let i=list.length-1;i>=0;i--)if(list[i].type==='prayer'&&list[i].ref===id){if(replacement)list[i].ref=replacement;else list.splice(i,1);}});
 delete c.prayers[id];
}
export function blockText(b,c){if(b.type==='prayer')return c.prayers[b.ref]?.text||'';if(b.type==='dialogue')return `${b.leader}\n${b.response}`;return [b.text,b.emphasis,b.suffix].filter(Boolean).join('');}
export function blockTitle(b,c){return b.type==='prayer'?c.prayers[b.ref]?.title||'Oración':b.type==='dialogue'?'Versículo y respuesta':b.type==='response'?'Respuesta':'Texto';}
export class EditorDraft{
 constructor(config){this.value=structuredClone(config);this.saved=JSON.stringify(config);this.past=[];this.future=[];this.lastField=null;}
 get dirty(){return JSON.stringify(this.value)!==this.saved;}
 change(fn,field=null){if(!field||field!==this.lastField){this.past.push(structuredClone(this.value));if(this.past.length>50)this.past.shift();}this.lastField=field;this.future=[];fn(this.value);}
 replace(value){validateConfig(value);this.change(()=>{this.value=structuredClone(value);});}
 undo(){if(!this.past.length)return false;this.future.push(this.value);this.value=this.past.pop();this.lastField=null;return true;}
 redo(){if(!this.future.length)return false;this.past.push(this.value);this.value=this.future.pop();this.lastField=null;return true;}
 markSaved(){this.saved=JSON.stringify(this.value);this.lastField=null;}
}
