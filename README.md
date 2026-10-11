# Sanctum Rosarium · Android

Aplicación Android independiente de Andrés Morales Gil. Identificador **`com.morales.rosario`**. Versión **1.5.3**, `versionCode=1`, Android 8.0 o posterior (API 26), `targetSdk=36`.

El código de la app web v1.5.3 se copió desde `moralesosf/Kerigma`, commit `f8ecaf4453252aaf2c17f81b79bfe0494e770438`, carpeta `public/rosario`. Este repositorio no modifica ni se despliega en Kerigma. La interfaz, fuentes, imágenes, oraciones y cantos se incluyen en la instalación y funcionan sin conexión.

## Funciones

- Misterios según el día; rosario físico o contador con tap, swipe y vibración nativa.
- Progreso local, animación de racha y calendario para registrar días anteriores.
- Editor Personalizar: añadir, modificar, arrastrar, eliminar, importar y exportar JSON mediante el selector de documentos de Android.
- Oraciones en español y latín; cantos con letras; diálogos con transparencia y blur.
- Café voluntario por PayPal, en MXN o USD. Ningún aporte desbloquea funciones o contenido.
- Atrás de Android cierra primero los diálogos y protege los cambios pendientes del editor; desde Inicio permite salir.

## Compilar

Instala JDK 17, Android SDK Platform 36 y Build Tools 36.0.0. Android Studio puede preparar estas herramientas. Configura `ANDROID_HOME` o un `local.properties` con `sdk.dir`. Las dependencias están fijadas en el proyecto y el wrapper utiliza Gradle 8.13.

```sh
cd web
npm test
cd ..
./gradlew lintRelease assembleDebug bundleRelease
```

Sin credenciales de firma, `bundleRelease` genera un bundle **sin firmar**, útil únicamente como resultado de compilación. Para Google Play utiliza el bundle firmado entregado o configura una clave de carga:

```sh
export ROSARIO_KEYSTORE_PATH=/ruta/privada/upload-keystore.p12
export ROSARIO_KEY_ALIAS=upload
# Establece ROSARIO_KEYSTORE_PASSWORD y ROSARIO_KEY_PASSWORD de forma privada.
./gradlew bundleRelease
```

Resultado: `app/build/outputs/bundle/release/app-release.aab`. Las claves y contraseñas no se incluyen en Git. Conserva el respaldo privado de la clave de carga para firmar futuras versiones y aumenta `versionCode` en cada actualización. Al crear la aplicación en Play Console, configura Play App Signing y carga el `.aab` firmado; Google gestiona la clave que firma las instalaciones distribuidas.

La integración usa `WebViewAssetLoader` bajo una URL HTTPS local, con un canal AndroidX restringido al origen local y al documento principal. Bloquea documentos y recursos remotos dentro de WebView; YouTube y PayPal se abren externamente. No requiere acceso general al almacenamiento, cámara, micrófono ni ubicación. Los datos locales no se copian a un servidor y el backup de Android está desactivado.

## Publicación

Consulta [docs/play-store.md](docs/play-store.md) para la descripción, privacidad y las verificaciones realizadas. La política de privacidad puede enlazarse desde Play Console: [privacy-policy.md](https://github.com/moralesosf/MiSantoRosario/blob/main/docs/privacy-policy.md).

La integración Android se ha compilado y verificado con lint, pruebas del motor/interfaz y validación del bundle. Antes de abrir producción, utiliza una pista de prueba de Play para comprobar en teléfonos reales la vibración, el gesto Atrás y los proveedores del selector de documentos.
