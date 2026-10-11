export function normalizeReminderState(value={}) {
 return {
  enabled:value.enabled===true,
  hour:Number.isInteger(value.hour)&&value.hour>=0&&value.hour<=23?value.hour:20,
  minute:Number.isInteger(value.minute)&&value.minute>=0&&value.minute<=59?value.minute:0,
  endOfDay:value.endOfDay!==false,
  permissionGranted:value.permissionGranted===true
 };
}
export function reminderSettingsMarkup(value,nativeAvailable) {
 if(!nativeAvailable)return '';
 const s=normalizeReminderState(value),time=String(s.hour).padStart(2,'0')+':'+String(s.minute).padStart(2,'0');
 return `<section class="reminder-settings" aria-labelledby="reminder-title"><h2 id="reminder-title">Tu momento de oración</h2><label class="setting-row">Recordatorio diario<input class="switch" type="checkbox" id="reminder-enabled" ${s.enabled?'checked':''}></label><div class="reminder-time-row"><span>Hora del recordatorio</span><button class="reminder-time" data-action="reminder-time" aria-label="Cambiar hora del recordatorio: ${time}">${time}<small>Cambiar</small></button></div><label class="setting-row reminder-evening"><span>Aviso de fin de día<small>A las 22:00, si aún no has rezado</small></span><input class="switch" type="checkbox" id="reminder-end-day" ${s.endOfDay?'checked':''} ${s.enabled?'':'disabled'}></label>${s.enabled&&!s.permissionGranted?'<p class="reminder-permission-note">Tu horario está guardado. Permite las notificaciones para recibir los avisos.</p><button class="utility secondary" data-action="reminder-permission">Permitir notificaciones</button>':''}</section>`;
}
