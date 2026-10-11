# Interfaz de Sanctum Rosarium

Contenido independiente empaquetado en la app Android. Edita `rosario.json` para cambiar las oraciones y los diseños; `engine.mjs` valida e interpreta el recorrido. `editor.js` ofrece Personalizar y `native.mjs` integra vibración/exportación con Android.

`npm test` ejecuta las pruebas del motor, editor, racha, interfaz e integración nativa. No requiere instalar dependencias npm. Los recursos se copian a los assets de Android mediante `syncRosaryAssets`; no se usa service worker ni se descarga la app desde Kerigma.
