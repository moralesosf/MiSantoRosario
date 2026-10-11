import {localDay} from './engine.mjs';

function monthStart(month){
 const date=new Date(month+'-01T12:00:00');
 if(!/^\d{4}-\d{2}$/.test(month)||localDay(date).slice(0,7)!==month)throw Error('Mes inválido.');
 return date;
}
export function monthDays(month){
 const first=monthStart(month),last=new Date(first);
 last.setMonth(first.getMonth()+1,0);
 return {offset:(first.getDay()+6)%7,days:Array.from({length:last.getDate()},(_,i)=>`${month}-${String(i+1).padStart(2,'0')}`)};
}
export function shiftMonth(month,offset){const date=monthStart(month);date.setMonth(date.getMonth()+offset);return localDay(date).slice(0,7);}
export function validPrayerDay(day,today=localDay()){
 return typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&localDay(new Date(day+'T12:00:00'))===day&&day<=today;
}
export function applyDayChanges(dates,changes,today=localDay()){
 const updated=new Set(dates);
 for(const [day,completed] of changes){
  if(!validPrayerDay(day,today)||typeof completed!=='boolean')throw Error('Solo puedes registrar fechas válidas hasta hoy.');
  if(completed)updated.add(day);else updated.delete(day);
 }
 return [...updated].sort();
}
