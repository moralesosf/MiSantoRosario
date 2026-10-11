import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeMessage,exportJson} from '../native.mjs';

test('native JSON export preserves line breaks and content without a blob download',()=>{
 const messages=[];
 globalThis.RosarioAndroid={postMessage:value=>messages.push(JSON.parse(value))};
 try {
  const config={prayers:{ave:{text:'María\nRuega por nosotros. <script>'}}};
  exportJson(config);
  assert.equal(messages.length,1);assert.equal(messages[0].type,'export');
  assert.deepEqual(JSON.parse(messages[0].text),config);assert.ok(messages[0].text.endsWith('\n'));
 }finally{delete globalThis.RosarioAndroid;}
});
test('ordinary browser use does not attempt native communication',()=>{
 assert.equal(nativeMessage('vibrate',{kind:'bead'}),false);
});
