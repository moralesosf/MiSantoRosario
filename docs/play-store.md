# Preparación para Google Play

Nombre: **Sanctum Rosarium**. Desarrollador: **Andrés Morales Gil**. Package: **com.morales.rosario**. Versión: **1.6.1 (3)**. Android mínimo: **8.0**, target API **36**. Sin anuncios, cuentas ni contenido de pago.

Descripción breve:

> Reza el rosario, personaliza tus oraciones y lleva tu racha de oración.

Descripción:

> Sanctum Rosarium te acompaña a rezar el Santo Rosario con una interfaz tranquila y sencilla. Encuentra automáticamente los misterios del día y elige entre tu rosario físico y el contador de la app, con vibración al avanzar.
>
> Conserva tu racha de oración y registra días anteriores en el calendario. Personaliza las oraciones y el recorrido: añade, ordena, modifica, importa y exporta tu JSON. Consulta oraciones en español y latín y letras de cantos devocionales.
>
> El rosario, las oraciones y las letras funcionan sin conexión. Tus preferencias y tu progreso permanecen en tu dispositivo. Sin anuncios ni cuentas. Si lo deseas, puedes apoyar voluntariamente al desarrollador invitándole un café.

Política creada en Notion: https://app.notion.com/p/3f64656efe0b8147930ff5c81f8e6114?pvs=204

El usuario publicará esta página en Notion. En Play Console debe utilizarse el enlace público resultante de Notion Sites, accesible sin iniciar sesión. La misma política se incluye en Ajustes de la app para consultarla sin conexión. La copia del texto también se conserva en `docs/privacy-policy.md`.

El desarrollador debe completar la ficha, clasificación, público objetivo y formulario de seguridad de datos en su propia Play Console. La implementación actual no recoge ni comparte datos desde la app; los enlaces externos abren otros servicios y se explican en la política de privacidad. Comprueba estas declaraciones de nuevo si incorporas SDKs o servicios en futuras versiones.

Las aportaciones por PayPal son directas al creador y no conceden contenido, funciones, distintivos ni otras recompensas digitales. Referencia: [Google Play, aportaciones directas de usuario a creador](https://support.google.com/googleplay/android-developer/answer/10281818). La aplicación apunta a Android 16/API 36, conforme al [requisito de API objetivo](https://support.google.com/googleplay/android-developer/answer/11926878).

Antes de producción, carga el bundle firmado en una pista de prueba y verifica la instalación en teléfonos reales, almacenamiento después de reiniciar, navegación Atrás, vibración, importación/exportación JSON, enlaces externos y pantallas con teclado abierto. El `.aab` se carga en Play Console; no se instala directamente en un teléfono.

La versión 1.6.0 incluye recordatorios locales con permiso POST_NOTIFICATIONS y reprogramación después de reinicios. No utiliza alarmas exactas, servicios en primer plano ni servidores de notificaciones.

## Archivo de desofuscación

Release usa R8 (`minifyEnabled true`). Cada bundle de release incluye su propio `mapping.txt` dentro de `BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map`. El archivo permite recuperar nombres de clases y métodos al interpretar errores y ANR.

El mapping entregado debe corresponder a ese mismo bundle/versionCode. Google Play lo extrae automáticamente de un AAB generado con Android Gradle Plugin 4.1 o posterior. Si Play Console solicita cargarlo manualmente, selecciona la versión correspondiente en Test and release → App bundle explorer → Downloads → Assets → Deobfuscation file. No uses el mapping de una versión distinta.

Esta app no contiene bibliotecas nativas `.so`; no hay un paquete separado de símbolos nativos que adjuntar. Referencia: https://support.google.com/googleplay/android-developer/answer/9848633
