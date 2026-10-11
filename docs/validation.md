# Verificación del bundle Android 1.6.1

Entrega: 11 de octubre de 2026. Sanctum Rosarium 1.6.1, versionCode 3, `com.morales.rosario`, min API 26, target API 36.

- `testReleaseUnitTest lintRelease bundleRelease`: compilación y verificación correctas.
- 73 pruebas web y 10 pruebas JVM: todas correctas.
- Android Lint: cero errores. No se suprimieron las comprobaciones.
- Bundle release firmado: `jarsigner -verify` y `bundletool validate` correctos.
- Package, versión y niveles SDK comprobados en el manifiesto compilado.
- Los assets empaquetados coinciden byte a byte con los preparados desde `web/`, incluida la política de privacidad disponible sin conexión en Ajustes.
- El `mapping.txt` entregado coincide byte a byte con `BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map`, incluido en este bundle.
- No hay bibliotecas nativas `.so` ni credenciales de firma en el repositorio.
- No se modificó Kerigma: el trabajo se realizó únicamente en MiSantoRosario.

SHA256 del bundle firmado entregado:

`4582340cbaf11ca3a24b068d726b3d58abd8ff0fc5fac379a16fc057229e6500`

SHA256 del archivo de desofuscación correspondiente:

`8d9f803e7539714136d0f92632ed7a3020099bf89ed4b8821c4dcd89014946a9`

La política también está creada en Notion; el propietario publicará la página y utilizará su URL pública en Play Console. La versión 1.6.1 no se ejecutó en un dispositivo o emulador Android. Consulta [reminders.md](reminders.md) para probar notificaciones en el dispositivo, incluyendo las restricciones de batería de Android.
