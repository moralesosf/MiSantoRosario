# Verificación de la entrega Android

Entrega: 11 de octubre de 2026. Sanctum Rosarium 1.5.3, versionCode 1, `com.morales.rosario`, min API 26, target API 36.

- Compilación de release desde limpio: `clean lintRelease bundleRelease`, correcta.
- Android Lint: cero errores, nueve avisos informativos. No se suprimieron comprobaciones.
- Pruebas de interfaz, motor, editor, calendario, cantos, donaciones y canal Android: 66 correctas.
- Bundletool 1.18.3: validación correcta y manifiesto con el package y SDK esperados.
- Jarsigner: firma verificada, SHA256withRSA y clave RSA de 4096 bits. Certificado de carga autofirmado, normal para Android; clave privada fuera del repositorio.
- Todos los assets empaquetados coinciden byte a byte con los preparados desde `web/`. No hay bibliotecas nativas `.so`.
- Kerigma permaneció en el commit de origen `f8ecaf4453252aaf2c17f81b79bfe0494e770438` y solo se leyó/copió.

SHA256 del bundle firmado entregado:

`9d4a2c71e254e1566dcf553cdeebcad252f805cf0037def9078c2dafc8df0260`

No se ejecutó en un dispositivo Android físico ni en un emulador. La prueba visual adicional con Chromium no pudo arrancar por restricciones del entorno. Utiliza una pista de prueba de Play Console antes de producción para verificar integración con el dispositivo y revisión de Google Play.
