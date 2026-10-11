import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {RosaryEditor} from '../editor.js';
const config=JSON.parse(fs.readFileSync(new URL('../rosario.json',import.meta.url)));
function classes(){const s=new Set();return {add:x=>s.add(x),remove:(...xs)=>xs.forEach(x=>s.delete(x)),contains:x=>s.has(x)};}
function harness(){
 const cards=config.flow.opening.map((_,index)=>({dataset:{dragGroup:'opening',index:String(index)},classList:classes(),getBoundingClientRect:()=>({top:100+index*113,left:20,height:102,width:340}),cloneNode:()=>({style:{},classList:classes(),setAttribute(){},remove(){}})}));
 const handle={closest:()=>cards[0],setPointerCapture(){},hasPointerCapture:()=>true,releasePointerCapture(){}};
 const root={innerHTML:'',addEventListener(){},removeEventListener(){},querySelector:()=>null,querySelectorAll:selector=>selector==='[data-drag-group]'?cards:cards.filter(c=>c.classList.contains('studio-drop-before')||c.classList.contains('studio-drop-after'))};
 globalThis.window={addEventListener(){},removeEventListener(){},scrollTo(){},scrollBy(){},innerHeight:900};
 globalThis.document={body:{classList:classes(),append(){}}};
 globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
 const editor=new RosaryEditor(root,{config,defaults:config,onSave(){},onExit(){}});
 return {editor,handle,cards};
}
test('mantener pulsado y arrastrar reordena al soltar y permite deshacer',async()=>{
 const {editor,handle,cards}=harness();
 editor.pointerDown({target:{closest:()=>handle},button:0,pointerId:1,clientX:30,clientY:120});
 assert.equal(editor.drag.active,false);await new Promise(r=>setTimeout(r,330));assert.equal(editor.drag.active,true);
 editor.pointerMove({pointerId:1,clientX:30,clientY:430,preventDefault(){}});assert.equal(editor.drag.to,2);assert.ok(cards[2].classList.contains('studio-drop-after'));
 editor.pointerEnd({pointerId:1});assert.deepEqual(editor.c.flow.opening,['contrition','invocation','sign']);editor.draft.undo();assert.deepEqual(editor.c.flow.opening,config.flow.opening);editor.destroy();
});
test('mover antes de mantener pulsado cancela el arrastre sin modificar el orden',()=>{
 const {editor,handle}=harness();editor.pointerDown({target:{closest:()=>handle},button:0,pointerId:2,clientX:30,clientY:120});editor.pointerMove({pointerId:2,clientX:30,clientY:180});assert.equal(editor.drag,null);assert.deepEqual(editor.c.flow.opening,config.flow.opening);assert.equal(editor.draft.dirty,false);editor.destroy();
});
