# Derwin Gym Tracking - Gestor Móvil de Mensualidades y Cobranza

Aplicación móvil multiplataforma en **React Native + Expo + TypeScript** diseñada para el monitoreo de mensualidades de entrenados, control de solvencia y envío de avisos de cobro personalizados por **WhatsApp mediante un solo botón**. Sin backend externo, sin necesidad de conexión a internet, **100 % offline** con persistencia local en dispositivo (`AsyncStorage`) y desplegable como instalador `.apk` autónomo en Android.

---

## 1. Funcionalidades Principales

- **Monitoreo automático de estados de solvencia**:
  - *Vencidos* — entrenados cuya fecha de corte ya expiró (muestra los días exactos de atraso y prioriza su orden en la lista).
  - *Por vencer* — entrenados próximos a vencer (en los siguientes 3 días o el día actual).
  - *Al día* — entrenados con mensualidad vigente.
- **Aviso de cobro por WhatsApp en 1 toque**:
  - Selecciona automáticamente la plantilla adecuada según el estado del entrenado (*Por vencer*, *Vence hoy* o *Vencido*).
  - Inyecta dinámicamente el nombre del alumno, plan, monto, fecha de corte y los datos bancarios del entrenador (Pago Móvil, Zelle, Transferencia y Efectivo).
  - Abre directamente la aplicación nativa de WhatsApp con el mensaje listo para enviar, o permite previsualizarlo y editarlo manteniendo presionado el botón.
- **Cálculo dual de vencimiento (Por plazo de días o por fecha exacta)**:
  - Permite registrar o renovar entrenados indicando un **número de días** (accesos rápidos de `7d`, `15d`, `30d`, `60d` o cualquier cantidad personalizada) o seleccionando una **fecha calendario exacta** (`AAAA-MM-DD`), manteniendo ambos modos sincronizados en tiempo real.
- **Registro de pagos con comprobante (Capture) y número de referencia**:
  - Permite adjuntar la imagen del comprobante bancario (*capture*) desde la galería del teléfono (`expo-image-picker`), anotar los dígitos de referencia y marcar la transacción como **Comprobada**.
  - Extiende automáticamente la fecha del próximo cobro según el ciclo de días configurado.
- **Editor didáctico de plantillas de WhatsApp**:
  - Botones interactivos en lenguaje natural (`+ Nombre del alumno`, `+ Monto a pagar`, `+ Fecha de cobro`, `+ Mis datos de pago`, etc.) que insertan las variables dinámicas en la posición del cursor sin necesidad de escribir llaves `{ }` manualmente, acompañado de una **vista previa en vivo**.
- **Respaldo e integridad de datos**:
  - Exportación e importación completa de la base de datos local (entrenados, historial de pagos con captures y configuración) en formato JSON.

---

## 2. Arquitectura y Módulos del Sistema

```
src/
├── components/
│   ├── Header.tsx                # Cabecera minimalista con resumen financiero y buscador desplegable
│   ├── StatCards.tsx             # Pestañas de filtrado rápido por estado de solvencia
│   ├── ClientCard.tsx            # Fila plana de entrenado con acciones en línea (Pago y WhatsApp)
│   ├── ClientModal.tsx           # Formulario CRUD con modo dual de vencimiento (días / fecha)
│   ├── PaymentModal.tsx          # Registro de cobro, adjunto de capture, referencia y renovación
│   ├── PaymentHistoryModal.tsx   # Historial auditable con visor de captures a pantalla completa
│   ├── WhatsAppPreviewModal.tsx  # Previsualización y edición manual del mensaje antes de enviar
│   └── SettingsModal.tsx         # Configuración bancaria, editor didáctico de plantillas y backups
├── constants/
│   └── theme.ts                  # Paleta monocromática oscura (Zinc / Shadcn Dark)
├── services/
│   └── storage.ts                # Capa de persistencia local en AsyncStorage y exportación JSON
├── types/
│   └── index.ts                  # Definición de interfaces TypeScript (Client, PaymentRecord, Settings)
└── utils/
    ├── date.ts                   # Cálculo de diferencias de días, sumas de plazos y formateo
    └── whatsapp.ts               # Normalización telefónica, motor de plantillas y deep-linking
```

| Módulo / Vista | Archivo | Responsabilidad |
| --- | --- | --- |
| **Listado Principal** | `App.tsx` | Orquestación de estado, filtrado combinado (estado + búsqueda) y ordenamiento por urgencia de cobro. |
| **Ficha de Entrenado** | `src/components/ClientModal.tsx` | Alta, edición y baja de entrenados con cálculo sincronizado entre plazo en días y fechas calendario. |
| **Conciliación de Pago** | `src/components/PaymentModal.tsx` | Registro de ingreso, captura de referencia bancaria, compresión de imagen adjunta y extensión de vigencia. |
| **Auditoría de Cobros** | `src/components/PaymentHistoryModal.tsx` | Consulta histórica con filtro por alumno/referencia y visor *lightbox* para inspeccionar captures. |
| **Motor WhatsApp** | `src/utils/whatsapp.ts` | Resolución de plantilla contextual según mora y disparo nativo mediante esquema `whatsapp://send`. |

---

## 3. Decisiones Técnicas Relevantes

1. **Interfaz Minimalista de Alta Densidad (Zinc Palette)**:
   Se diseñó una interfaz sobria basada en filas planas con divisores de `1px` (`#1F1F23`) sobre fondo oscuro (`#09090B`), prescindiendo de tarjetas recargadas. Esto permite visualizar de 8 a 10 entrenados simultáneamente en pantalla y ejecutar las dos acciones críticas (registrar pago o cobrar por WhatsApp) desde la misma fila con un solo toque.

2. **Manejo de Márgenes Seguros Multiplataforma (`SafeAreaProvider`)**:
   Se implementó `useSafeAreaInsets` junto con métricas iniciales de respaldo (`FALLBACK_METRICS`) y lectura de `StatusBar.currentHeight` en Android. Esto evita colisiones con el *notch* o barra de estado en teléfonos físicos y garantiza el renderizado inmediato en navegadores web sin bloqueos de hidratación.

3. **Persistencia Offline de Captures en Base64**:
   Los comprobantes fotográficos seleccionados mediante `expo-image-picker` se comprimen (`quality: 0.5`) y almacenan como cadenas `data:image/jpeg;base64` dentro del registro de pago en `AsyncStorage`. De este modo, las evidencias de pago permanecen disponibles sin conexión y se incluyen automáticamente dentro del archivo JSON al exportar una copia de seguridad.

4. **Deep-Linking Directo en Android 11+ (API 30+)**:
   En aplicaciones compiladas como APK independiente para versiones recientes de Android, `Linking.canOpenURL` puede devolver falsos negativos por restricciones de visibilidad de paquetes. El módulo `whatsapp.ts` invoca directamente `Linking.openURL('whatsapp://send?...')` con captura de excepciones y *fallback* automático hacia `https://wa.me/`, asegurando la apertura nativa de WhatsApp.

---

## 4. Instrucciones de Ejecución y Compilación APK

### Requisitos previos
- **Node.js** 18 o superior.

### Instalación y desarrollo local

```bash
# 1. Instalar dependencias compatibles con el SDK de Expo
npm install

# 2. Iniciar en navegador web
npm run web

# 3. Iniciar servidor Metro para pruebas en dispositivo (Expo Go)
npm start
```

### Generación de instalador `.apk` autónomo (Android)

El proyecto incluye el archivo `eas.json` preconfigurado con `"buildType": "apk"` en los perfiles `preview` y `production` para generar un instalador directo sin requerir Android Studio local:

```bash
# 1. Iniciar sesión en Expo (solo la primera vez)
npx eas-cli@latest login

# 2. Compilar y obtener enlace/QR de descarga del archivo .apk
npm run build:apk
```
