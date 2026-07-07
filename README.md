<div align="center">

# 🧾 Validador de Facturas — Paraguay

https://validador-masivo-de-facturas.vercel.app/

### Carga tu factura, deja que el OCR la lea, y obtén una validación automática en segundos.

[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.2-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Tesseract.js](https://img.shields.io/badge/OCR-Tesseract.js-blueviolet)](https://github.com/naptha/tesseract.js)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com/)

**100% OCR en el navegador · Sin backend Python · Sin servidor de OCR separado**

</div>

---

## 📋 Tabla de contenidos

1. [¿Qué es este proyecto?](#-qué-es-este-proyecto)
2. [Objetivo](#-objetivo)
3. [Características principales](#-características-principales)
4. [Cómo funciona (arquitectura)](#-cómo-funciona-arquitectura)
5. [Stack tecnológico](#-stack-tecnológico)
6. [Estructura del proyecto](#-estructura-del-proyecto)
7. [Requisitos previos](#-requisitos-previos)
8. [Instalación y puesta en marcha](#-instalación-y-puesta-en-marcha)
9. [Variables de entorno](#-variables-de-entorno)
10. [Modelo de datos (Supabase)](#-modelo-de-datos-supabase)
11. [Motor de validación: cómo se extraen y validan los datos](#-motor-de-validación-cómo-se-extraen-y-validan-los-datos)
12. [Referencia de la API](#-referencia-de-la-api)
13. [Scripts disponibles](#-scripts-disponibles)
14. [Despliegue en Vercel](#-despliegue-en-vercel)
15. [Seguridad y consideraciones](#-seguridad-y-consideraciones)
16. [Limitaciones conocidas del MVP](#-limitaciones-conocidas-del-mvp)
17. [Roadmap sugerido](#-roadmap-sugerido)
18. [Licencia](#-licencia)

---

## 🔍 ¿Qué es este proyecto?

**Validador de Facturas** es una aplicación web pensada para el mercado paraguayo que permite **subir facturas en formato PDF o foto**, **extraer automáticamente sus datos mediante OCR** (reconocimiento óptico de caracteres) y **validarlas** según las reglas de formato vigentes en Paraguay (RUC, número de timbrado, fecha de emisión, montos en guaraníes, IVA 10%/5%/exentas).

Todo el procesamiento de OCR ocurre **directamente en el navegador del usuario** gracias a [Tesseract.js](https://github.com/naptha/tesseract.js) — no hay backend en Python, no hay microservicio de OCR, no hay colas de procesamiento externas. [Next.js](https://nextjs.org/) se encarga de servir tanto el frontend como las rutas de API, y [Supabase](https://supabase.com/) (Postgres) actúa como base de datos.

El resultado es un dashboard donde se puede ver, filtrar, buscar, eliminar y exportar (Excel o JSON) el listado de facturas procesadas, junto con un resumen estadístico de cuántas son válidas, inválidas o están pendientes de revisión.

---

## 🎯 Objetivo

Agente que pre-valida archivos masivos detectando anomalías estadísticas o lógicas mediante IA antes de procesar.

Concretamente, busca:

- **Eliminar la carga manual de datos** que hoy se hace a mano al recibir una factura física o escaneada.
- **Detectar errores de formato** (RUC mal escrito, número de factura incompleto, monto ilegible) antes de que lleguen a contabilidad.
- **Centralizar el historial de facturas procesadas** en un solo lugar, con búsqueda y exportación a Excel para auditoría o carga en otros sistemas.
- Servir como **MVP rápido de validar y desplegar**, priorizando velocidad de iteración (sin login, sin infraestructura pesada) sobre robustez de producción — algo explícitamente documentado para que el equipo sepa qué se sacrificó y por qué.

---

## ✨ Características principales

- 📤 **Carga múltiple por drag & drop** de archivos PDF, JPG, PNG, WEBP, BMP o TIFF (hasta 10 MB cada uno), procesados en cola de forma secuencial.
- 🔎 **Extracción de texto con IA** usando Claude Haiku 4.5 vía OpenRouter, con reconocimiento inteligente de estructura de facturas paraguayas.
- 📄 **Conversión de PDF a imágenes en el navegador** con `pdfjs-dist` (cada página se renderiza antes de enviarse al modelo IA para maximizar precisión).
- 🧠 **Motor de extracción y validación** que reconoce automáticamente RUC emisor/receptor, número de factura (timbrado), fecha de emisión, monto total, IVA 10%, IVA 5% y exentas — con manejo inteligente de variaciones de formato (separadores de miles con punto o coma, montos partidos en líneas distintas, etc.).
- 🚦 **Clasificación automática por estado**: `válida`, `pendiente` o `inválida`, según la cantidad de campos obligatorios que falten.
- 📊 **Dashboard con estadísticas en vivo**: total procesadas, válidas, inválidas, pendientes y suma total en guaraníes.
- 🔍 **Filtros y búsqueda** por estado, RUC, número de factura o nombre de archivo, con paginación.
- 🗂️ **Vista expandible por fila** para inspeccionar RUC receptor, desglose de IVA y la lista de errores de validación de cada factura.
- 🗑️ **Eliminación de registros** con confirmación.
- 📥 **Exportación a Excel (.xlsx) o JSON**, respetando los filtros activos.
- 🌓 **Modo claro/oscuro** automático según las preferencias del sistema.
- ⚡ **Modelo IA gratuito**: usa Claude Haiku 4.5 en OpenRouter, con acceso a endpoints libres para MVP y pruebas.

---

## 🧠 Cómo funciona (arquitectura)

\`\`\`mermaid
flowchart TD
    A[Usuario arrastra/selecciona<br/>PDF o imagen] --> B{¿Es PDF?}
    B -- Sí --> C[pdf-to-images.ts<br/>renderiza cada página<br/>a canvas con pdfjs-dist]
    B -- No --> D[Se usa la imagen<br/>directamente]
    C --> E[Claude Haiku 4.5<br/>via OpenRouter<br/>extrae texto de la imagen]
    D --> E
    E --> F[POST /api/upload<br/>con el texto extraído por IA]
    F --> G[validar-factura.ts<br/>extrae RUC, N° factura,<br/>fecha, montos, IVA]
    G --> H{¿Cuántos campos<br/>obligatorios faltan?}
    H -- 0 --> I[estado: válida]
    H -- 1-2 --> J[estado: pendiente]
    H -- 3+ --> K[estado: inválida]
    I --> L[(Supabase / Postgres<br/>tabla facturas)]
    J --> L
    K --> L
    L --> M[GET /api/resultados<br/>dashboard con filtros y paginación]
    L --> N[GET /api/exportar<br/>descarga Excel o JSON]
\`\`\`

**Punto clave:** la imagen se renderiza en el navegador (si es PDF) y luego se envía a Claude Haiku 4.5 a través de OpenRouter. Solo el **texto ya extraído por IA** se guarda en la base de datos, reduciendo almacenamiento y manteniendo una auditoría clara del contenido procesado.

---

## 🛠️ Stack tecnológico

| Categoría | Tecnología | Versión | Uso en el proyecto |
|---|---|---|---|
| Framework | [Next.js](https://nextjs.org/) | 16.2.6 | App Router, frontend + API routes en un solo proyecto |
| UI | [React](https://react.dev/) | 19 | Componentes de interfaz |
| Lenguaje | [TypeScript](https://www.typescriptlang.org/) | 5.7.3 | Tipado estático en todo el proyecto |
| Estilos | [Tailwind CSS](https://tailwindcss.com/) | 4.2 | Utilidades de estilo + variables de tema (claro/oscuro) |
| Componentes UI | [shadcn/ui](https://ui.shadcn.com/) (estilo `base-nova`) | 4.8.0 | Botones, tablas, badges, tabs, select, etc. |
| Iconos | [lucide-react](https://lucide.dev/) | 1.16.0 | Set de iconos SVG |
| Base de datos | [Supabase](https://supabase.com/) (Postgres) | — | Almacenamiento de facturas procesadas |
| Cliente Supabase | `@supabase/ssr`, `@supabase/supabase-js` | 0.12 / 2.108 | Clientes para browser y server |
| **Extracción de texto** | **Claude Haiku 4.5 / OpenRouter** | **Latest** | **Reconocimiento inteligente de texto en imágenes de facturas** |
| PDF → imagen | [pdfjs-dist](https://github.com/mozilla/pdf.js) | 6.0.227 | Renderizado de páginas PDF a canvas para envío a IA |
| Exportación | [xlsx (SheetJS)](https://www.npmjs.com/package/xlsx) | 0.18.5 | Generación de reportes Excel |
| Data fetching | [SWR](https://swr.vercel.app/) | 2.4.1 | Cache y revalidación de datos del dashboard |
| Analítica | [@vercel/analytics](https://vercel.com/docs/analytics) | 1.6.1 | Analítica de uso en producción |
| Linting | ESLint + `eslint-config-next` | 9.39 / 16.2.9 | Calidad de código |
| Hosting recomendado | [Vercel](https://vercel.com/) | — | Despliegue serverless |

---

## 🧮 Motor de validación: cómo se extraen y validan los datos

Toda la inteligencia de negocio vive en [`lib/validar-factura.ts`](./lib/validar-factura.ts). Recibe el texto que Claude Haiku 4.5 extrajo de la imagen y aplica una serie de expresiones regulares y heurísticas pensadas específicamente para el formato paraguayo.

### Flujo de extracción de texto

1. **Renderizado de imagen**: Si es PDF, se convierte a imagen usando `pdfjs-dist` (escala 3x para maximizar calidad).
2. **Envío a Claude Haiku 4.5**: La imagen se envía a OpenRouter en base64.
3. **Extracción inteligente**: El modelo IA analiza la estructura de la factura y extrae el texto manteniendo contexto.
4. **Limpieza y validación**: El texto extraído pasa por normalizaciones para corregir ambigüedades.

### Campos extraídos

| Campo | ¿Obligatorio? | Formato esperado | Estrategia de extracción |
|---|---|---|---|
| RUC emisor | Sí | `########-#` | Se toma el primer RUC encontrado en el texto |
| RUC receptor | Sí | `########-#` | Se toma el segundo RUC encontrado |
| N° de factura | Sí | `001-001-0000001` | Tolera separación por guiones o espacios |
| Fecha de emisión | Sí | `dd/mm/yyyy` o `dd-mm-yyyy` | Primera coincidencia en el texto |
| Monto total | Sí | Número en guaraníes | Busca etiquetas como "TOTAL DE LA OPERACIÓN", "TOTAL EN GUARANÍES", "TOTAL A PAGAR" |
| IVA 10% / IVA 5% / Exentas | No | Número en guaraníes | Se extraen si la etiqueta correspondiente aparece en el texto |

### Normalización de variaciones de formato

Después de que Claude extrae el texto, se aplican las siguientes normalizaciones:

- Espacios y saltos de línea innecesarios se colapsan
- Separadores de miles se estandarizan (punto o coma → se interpreta correctamente)
- Montos que quedaron partidos en líneas se reconstruyen
- Formato de RUC se valida (8 dígitos + guión + 1 dígito verificador)

### Interpretación de montos en guaraníes

El guaraní **no usa decimales**, por lo que el punto y la coma son casi siempre separadores de miles. La función `limpiarMonto()` aplica esta lógica:

- Si hay **múltiples puntos o comas** → todos son separadores de miles (`1.500.000` → `1500000`).
- Si hay **una sola coma seguida de 3 dígitos** → es separador de miles (`146,296` → `146296`).
- Si hay **un solo punto seguido de 3 dígitos** → es separador de miles (`1.500` → `1500`).
- Se eliminan espacios que el OCR/IA a veces inserta entre grupos de dígitos (`1 500 000` → `1500000`).

### Determinación del estado

\`\`\`
errores.length === 0   →  estado = "valida"
errores.length <= 2    →  estado = "pendiente"
errores.length >= 3    →  estado = "invalida"
\`\`\`

Cada campo obligatorio que no se logra extraer agrega un mensaje a la lista de `errores`, la cual queda guardada junto con la factura para que el usuario sepa exactamente qué faltó revisar.

---

## 🔐 Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL del proyecto Supabase (`https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Clave pública (anon) de Supabase |
| `OPENROUTER_API_KEY` | Sí | Clave API de OpenRouter para acceder a Claude Haiku 4.5 |
| `OPENROUTER_MODEL` | No | Modelo a usar (default: `meta-llama/llama-3.2-11b-vision-instruct` o `anthropic/claude-haiku-4.5`) |

---

## ⚠️ Limitaciones conocidas del MVP

- **Un solo usuario, sin login** — no hay roles ni permisos diferenciados.
- **Extracción sensible a la calidad de imagen.** Funciona bien con facturas digitales, escaneadas o fotos nítidas; **no reconoce bien facturas manuscritas** ni fotos borrosas o con poca luz.
- **Tamaño máximo de archivo: 10 MB** por archivo (configurado en `upload-zone.tsx`).
- **Carga manual únicamente** — todavía no hay integración con email, SFTP, WhatsApp ni otros sistemas de ingesta automática.
- **Procesamiento secuencial.** Los archivos en cola se procesan uno por uno para evitar saturar el API de OpenRouter.
- **No valida el dígito verificador del RUC** ni hace consulta contra el padrón de la SET (Subsecretaría de Estado de Tributación) — solo valida formato y presencia de los campos.
- **Costo de API**: cada factura procesada consume tokens de Claude Haiku 4.5 en OpenRouter (muy económico, pero no es completamente gratuito a diferencia de Tesseract.js local).

Estas limitaciones son intencionales: el objetivo del MVP es comprobar que el flujo completo (**subir → extraer con IA → validar → revisar → exportar**) funciona y es usable, antes de invertir en una versión más robusta.

---

## 🗺️ Roadmap

- [ ] Autenticación de usuarios con Supabase Auth + políticas RLS por organización.
- [ ] Validación del dígito verificador del RUC paraguayo.
- [ ] Integración con el padrón de contribuyentes de la SET para verificar RUCs reales.
- [ ] Soporte para Documentos Tributarios Electrónicos (DTE / e-Kuatia).
- [ ] Procesamiento en paralelo controlado (pool de workers) para acelerar cargas masivas.
- [ ] Historial de cambios y reprocesamiento manual de facturas marcadas como "pendiente".
- [ ] Notificaciones (email/Slack) cuando se detecta una factura inválida.

---

## 📄 Licencia

Este proyecto no incluye actualmente un archivo de licencia. Si pensás distribuirlo, abrir el código o compartirlo públicamente, te recomendamos agregar una (por ejemplo [MIT](https://choosealicense.com/licenses/mit/) si querés permitir uso y modificación libres).

---

<div align="center">

**Hecho para automatizar la validación de facturas en Paraguay 🇵🇾**

</div>