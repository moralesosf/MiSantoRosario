import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeReminderState,reminderSettingsMarkup} from '../reminders.mjs';
test('reminder controls only appear in the Android app',()=>{
 assert.equal(reminderSettingsMarkup({},false),'');
 assert.match(reminderSettingsMarkup({},true),/Recordatorio diario/);
});
test('reminder settings retain chosen time and explain a denied notification permission',()=>{
 const html=reminderSettingsMarkup({enabled:true,hour:7,minute:5,endOfDay:false,permissionGranted:false},true);
 assert.match(html,/07:05/);assert.match(html,/Permitir notificaciones/);
 assert.doesNotMatch(html,/id="reminder-end-day" checked/);
 assert.doesNotMatch(reminderSettingsMarkup({enabled:true,permissionGranted:true},true),/Permitir notificaciones/);
});
test('invalid native time is replaced with a safe default and disabled alarms are clear',()=>{
 assert.deepEqual(normalizeReminderState({hour:25,minute:-1,enabled:'true'}),
  {enabled:false,hour:20,minute:0,endOfDay:true,permissionGranted:false});
 assert.match(reminderSettingsMarkup({},true),/id="reminder-end-day" checked disabled/);
});
