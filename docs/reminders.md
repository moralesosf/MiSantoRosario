# Recordatorios diarios · Android 1.6.0

Al completar el primer rosario aparece una invitación para recibir recordatorios. Dos ruedas permiten elegir horas (00–23) y minutos (00–59). Al pulsar **Activar**, se guarda la hora y se solicita `POST_NOTIFICATIONS` en Android 13 o posterior. **Ahora no** y Atrás descartan la invitación; no se repite en cada rosario. Si cierras la app antes de que llegue a mostrarse, se conserva la invitación pendiente para la próxima apertura.

En **Ajustes → Tu momento de oración** puedes activar/desactivar el recordatorio, cambiar la hora con las ruedas y desactivar el aviso de fin de día. Si Android bloquea las notificaciones, la app conserva el horario y muestra un botón para conceder el permiso o abrir los ajustes del sistema.

Hay dos avisos locales: el de la hora elegida y otro a las **22:00** si aún no has rezado. Completar el rosario o registrar hoy en el calendario cancela el aviso visible y evita los restantes de hoy. Cuando existe una racha del día anterior, el aviso nocturno te invita a conservarla; si no, te invita a retomar la oración. Cada tipo se entrega como máximo una vez por fecha local y se evita enviar dos alertas con menos de 30 minutos de separación. Los avisos retrasados hasta el día siguiente se descartan.

Los avisos funcionan con la app cerrada, sin conexión ni servidores. Se reprograman al reiniciar, cambiar la hora/zona del sistema o actualizar la app. Se usan alarmas no exactas con `setAndAllowWhileIdle`: Android puede retrasarlas, especialmente con ahorro de batería o Doze. Si fuerzas la detención desde Ajustes de Android, tendrás que volver a abrir la app para restaurarlas. No se solicita acceso especial a alarmas exactas ni excepciones de batería.

## Probar la APK

1. Instala la APK y completa un rosario (puedes elegir el modo físico para avanzar más rápido). Verifica la invitación, las ruedas y el permiso al pulsar Activar.
2. Comprueba que la hora queda guardada en Ajustes, que puedes cambiarla y que el control de las 22:00 se puede desactivar independientemente.
3. Para probar la entrega diaria, elige una hora próxima y un día en el que todavía no conste oración completada. Si acabas de terminar el primer rosario, hoy ya está registrado: espera al día siguiente o desmarca hoy en el calendario de Ajustes y guarda. Cierra la app y espera el aviso; Android puede retrasarlo.
4. Tras recibirlo, registra hoy o completa el rosario: el aviso debe desaparecer y el de las 22:00 no debe enviarse. Desactivar el recordatorio cancela ambos horarios.
5. Prueba rechazar el permiso, reactivarlo desde Ajustes y reiniciar el teléfono con recordatorios activos.

Referencia: [Permiso de notificaciones](https://developer.android.com/develop/ui/views/notifications/notification-permission) y [Programación de alarmas](https://developer.android.com/develop/background-work/services/alarms).
