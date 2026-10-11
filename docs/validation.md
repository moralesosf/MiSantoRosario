# Verificación de la APK Android 1.6.0

Entrega: 11 de octubre de 2026. Sanctum Rosarium 1.6.0, versionCode 2, `com.morales.rosario`, min API 26, target API 36.

- `testReleaseUnitTest lintRelease assembleRelease`: compilación y verificación correctas.
- 72 pruebas de interfaz/motor/editor/calendario/cantos/donaciones/canal Android y 10 pruebas JVM de programación de recordatorios: todas correctas.
- Android Lint: cero errores. No se suprimieron las comprobaciones.
- APK release verificada con apksigner; certificado idéntico a la clave de carga de la primera entrega.
- Package, versión y permisos POST_NOTIFICATIONS/RECEIVE_BOOT_COMPLETED comprobados en el manifiesto compilado.
- Los assets empaquetados coinciden byte a byte con los preparados desde `web/`, incluidos los importes MXN 30/50/100 y el módulo de recordatorios.
- No hay bibliotecas nativas `.so` ni credenciales de firma en el repositorio.
- No se modificó Kerigma: el trabajo se realizó únicamente en MiSantoRosario.

SHA256 de la APK firmada entregada:

`ac0bb15f4e72f20996c74272a0dd15752abe0ff9bc1a5a98eff6ebfb6f61480f`

Las pruebas de horario cubren cambios de día, zonas y horario de verano, permisos denegados, recordatorios desactivados, días ya rezados, duplicados y alertas retrasadas más allá de medianoche. No se ejecutó la APK en un teléfono Android físico o emulador; la entrega está preparada para esa prueba. Consulta [reminders.md](reminders.md) para probar notificaciones en el dispositivo, incluyendo las restricciones de batería de Android.
