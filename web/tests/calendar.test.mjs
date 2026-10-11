import test from 'node:test';
import assert from 'node:assert/strict';
import {monthDays,shiftMonth,validPrayerDay,applyDayChanges} from '../calendar.mjs';
import {streakFor} from '../engine.mjs';

test('calendario: semanas desde lunes y meses de 28, 29, 30 y 31 días',()=>{
 for(const [month,length] of [['2026-02',28],['2024-02',29],['2026-04',30],['2026-10',31]]){const {days}=monthDays(month);assert.equal(days.length,length);assert.equal(days[0],month+'-01');assert.equal(days.at(-1),month+'-'+length);}
 assert.equal(monthDays('2026-02').offset,6);assert.equal(monthDays('2024-02').offset,3);assert.equal(monthDays('2026-06').offset,0);assert.throws(()=>monthDays('2026-13'));
});
test('calendario: cambiar de mes conserva fechas correctas al cruzar años',()=>{
 assert.equal(shiftMonth('2026-12',1),'2027-01');assert.equal(shiftMonth('2026-01',-1),'2025-12');assert.equal(shiftMonth('2024-03',-1),'2024-02');
});
test('calendario: registrar y quitar varios días recalcula solo una vez cada fecha y respeta días sin tocar',()=>{
 const original=['2026-09-30','2026-10-08'],changes=new Map([['2026-10-08',false],['2026-10-09',true],['2026-10-10',true],['2026-10-11',true]]);
 const saved=applyDayChanges(original,changes,'2026-10-11');assert.deepEqual(saved,['2026-09-30','2026-10-09','2026-10-10','2026-10-11']);assert.equal(streakFor(saved,'2026-10-11'),3);assert.deepEqual(applyDayChanges(saved,changes,'2026-10-11'),saved);assert.deepEqual(original,['2026-09-30','2026-10-08']);
});
test('calendario: hoy es válido; fechas falsas, futuras o estados inválidos no se guardan',()=>{
 assert.ok(validPrayerDay('2026-10-11','2026-10-11'));assert.ok(validPrayerDay('2024-02-29','2026-10-11'));
 for(const day of ['2026-10-12','2026-02-30','2025-02-29','2026-13-01','']){assert.equal(validPrayerDay(day,'2026-10-11'),false);assert.throws(()=>applyDayChanges([],[[day,true]],'2026-10-11'));}
 assert.throws(()=>applyDayChanges([],[['2026-10-10','true']],'2026-10-11'));
});
