**PAS ALERT**

MODULOS EXTRA 15/04

**Sistema Pro**

─────────────────────────────────────

**Documento de Alcance — Módulos Incluidos**

Preparado por ZIGO DEV   |   Abril 2026

# **Índice de Contenidos**

• 1\. Introducción y Resumen Ejecutivo

• 2\. Módulo de Siniestros

• 3\. Módulo de Cotizaciones \+ Página Pública

• 4\. Directorio de Aseguradoras y Brokers

• 5\. Facturación de Comisiones Detallada

• 6\. Login Google / Multi-moneda / Caución

• 7\. Gestión de Cuotas y Renovación Automática

• 8\. Módulos Base del Sistema

• 9\. Propuesta de Implementación por Etapas

• 10\. Nota Final

# **1\. Introducción y Resumen Ejecutivo**

PAS Alert es un sistema web de gestión integral diseñado exclusivamente para Productores Asesores de Seguros (PAS) en Argentina. Permite centralizar y automatizar todas las operaciones del negocio asegurador: desde la administración de pólizas y clientes hasta la gestión de siniestros, cotizaciones, comisiones y facturación.

Este documento detalla los módulos que conforman el Sistema Pro contratado, describiendo funcionalmente cada pantalla, flujo de trabajo y regla de negocio implementada.

## **Resumen de Módulos Incluidos**

| Módulo | Descripción Corta | Estado |
| ----- | ----- | ----- |
| Módulo de Siniestros | Gestión completa de reclamos/claims | INCLUIDO ✓ |
| Cotizaciones \+ Página Pública | Cotizador compartible sin login | INCLUIDO ✓ |
| Directorio Aseguradoras/Brokers | Datos fiscales, credenciales y brokers | INCLUIDO ✓ |
| Facturación de Comisiones | Facturas por aseguradora, estados, documentos | INCLUIDO ✓ |
| Login Google / Multi-moneda / Caución | Autenticación, divisas y pólizas de caución | INCLUIDO ✓ |
| Gestión de Cuotas y Renovación | Póliza siguiente auto-generada al marcar pagada | INCLUIDO ✓ |

# **2\. Módulo de Siniestros**

Este módulo permite al productor registrar, hacer seguimiento y cerrar todos los siniestros/reclamos vinculados a sus pólizas de manera sistemática. Reemplaza el manejo por mail, cuadernos o planillas dispersas.

## **2.1 Panel Principal de Siniestros**

Al ingresar a la sección Siniestros, el productor visualiza:

• Tabla resumen con todos los siniestros activos e históricos, ordenados por fecha.

• Columnas: N° de siniestro, cliente, aseguradora, tipo de seguro, fecha del siniestro, estado y prioridad.

• Barra de búsqueda en tiempo real para filtrar por cualquier campo.

• Filtros combinados por Estado (Denunciado, En gestión, En inspección, En análisis, Aprobado, Rechazado, Pagado) y Prioridad (Alta, Media, Baja).

• KPIs en tarjetas superiores: total de siniestros, siniestros activos, importe reclamado total e importe pagado total.

• Exportación de la tabla completa a Excel (.xlsx) con un clic.

## **2.2 Alta de Siniestro**

El formulario de nuevo siniestro captura todos los datos necesarios para iniciar la gestión:

• Datos del siniestro: número de siniestro, número de póliza, aseguradora, tipo de seguro.

• Datos del cliente: nombre y DNI (con autocompletado desde la base de clientes existente).

• Datos del hecho: fecha, hora y lugar del siniestro, descripción detallada.

• Campos dinámicos según rubro: para Automotor se despliegan campos adicionales (patente, marca/modelo del vehículo involucrado); para Hogar se agrega tipo de daño; etc.

• Estado inicial configurable (por defecto: "Denunciado") y responsable interno asignado.

• Montos: importe reclamado, deducible aplicable y monto aprobado.

## **2.3 Estados del Siniestro y Flujo de Trabajo**

Cada siniestro atraviesa un ciclo de vida con 7 estados posibles:

| Estado | Descripción | Color en sistema |
| ----- | ----- | ----- |
| Denunciado | Recién ingresado, pendiente de inicio de gestión | Azul |
| En gestión | El productor está realizando acciones activas | Ámbar |
| En inspección | La aseguradora envió un inspector al terreno | Violeta |
| En análisis | La aseguradora analiza la documentación | Índigo |
| Aprobado | Siniestro habilitado para liquidación | Verde |
| Rechazado | La aseguradora denegó la cobertura | Rojo |
| Pagado | El cliente recibió la indemnización | Verde oscuro |

## **2.4 Prioridad Automática**

El sistema calcula la prioridad del siniestro de forma automática sin intervención manual, basándose en dos criterios:

• Prioridad Alta: importe reclamado mayor a $500.000, o más de 10 días sin actualización.

• Prioridad Media: importe reclamado mayor a $100.000, o más de 5 días sin actualización.

• Prioridad Baja: los demás casos.

💡 La prioridad se recalcula automáticamente cada vez que se edita el siniestro, garantizando que el productor siempre tenga identificados los casos urgentes.

## **2.5 Vista Detalle del Siniestro**

Al hacer clic en cualquier siniestro se abre un panel lateral con la ficha completa:

• Todos los datos del formulario de alta, editables.

• Historial de notas internas: el productor puede añadir notas con texto libre, que quedan registradas con fecha y hora.

• Registro de último contacto con la aseguradora y con el cliente (fecha de cada interacción).

• Sección de documentos adjuntos: el productor puede referenciar documentos vinculados al siniestro.

• Progreso visual del estado con barra de avance.

## **2.6 Indicadores y KPIs del Módulo**

| Indicador | Descripción |
| ----- | ----- |
| Total Siniestros | Cantidad total de siniestros registrados |
| Siniestros Activos | Siniestros en estados que no sean Pagado o Rechazado |
| Monto Reclamado Total | Suma de todos los importes reclamados |
| Monto Pagado Total | Suma de todos los importes efectivamente pagados |

# **3\. Módulo de Cotizaciones \+ Página Pública**

Este módulo combina un gestor interno de solicitudes de cotización con un formulario público que el productor puede compartir con sus clientes o prospectos sin que estos necesiten crear una cuenta.

## **3.1 Gestor Interno de Cotizaciones**

El panel de cotizaciones permite al productor ver y administrar todas las solicitudes recibidas:

• Lista de cotizaciones con filtros por tipo de seguro (Auto, Moto, Hogar, Otros) y búsqueda por nombre/patente/datos del cliente.

• Columnas: nombre del solicitante, tipo de seguro, datos del riesgo, fecha de solicitud, origen (Carga manual / Link público).

• Alta manual de cotización desde el sistema (mismo formulario que el público, pero accesible desde adentro).

• Edición y eliminación de cotizaciones existentes.

• Exportación a Excel del listado completo.

## **3.2 Formulario de Cotización — Campos por Tipo de Seguro**

El formulario adapta sus campos dinámicamente según el tipo de seguro seleccionado:

### **Auto / Moto**

• Datos personales: nombre y apellido, CUIT/CUIL, fecha de nacimiento, email, celular.

• Datos del vehículo: marca, modelo, año, patente, tipo de uso (Particular / Comercial).

• Equipamiento: si tiene GNC instalado (Sí/No), si tiene rastreador GPS (Sí/No).

• Forma de pago preferida (Débito por CBU / Tarjeta / Cupón).

• Dirección completa: calle, CP, localidad, provincia (con selector de las 24 provincias argentinas).

### **Hogar**

• Datos personales completos (ídem Auto).

• Tipo de vivienda (Casa / Departamento / PH / Otro).

• Superficie cubierta en m².

### **Otros / Genérico**

• Datos personales completos.

• Campo de texto libre para describir el bien o riesgo a asegurar.

## **3.3 Página Pública de Cotización (sin login)**

Cada productor posee una URL única con su identificador que puede compartir por WhatsApp, redes sociales, email o imprimir en un folleto. El cliente accede, completa el formulario y al enviar:

• Los datos se guardan automáticamente en el sistema del productor.

• El cliente ve una pantalla de confirmación: "¡Solicitud Enviada\! Un productor de seguros se pondrá en contacto contigo a la brevedad."

• El productor visualiza la solicitud en su panel marcada con origen "Public Link".

💡 La URL puede generarse con tipo pre-seleccionado: /cotizar/:userId/auto muestra el formulario de Auto directamente, reduciendo fricción para el cliente.

## **3.4 Compartir Cotización — QR y Enlace**

Desde el gestor interno, el productor puede:

• Copiar el link público al portapapeles con un clic.

• Generar un código QR imprimible para cada tipo de seguro.

• El QR puede pegarse en tarjetas de presentación, folletos y stands.

# **4\. Directorio de Aseguradoras y Brokers**

Directorio centralizado con dos pestañas: una para las aseguradoras con las que trabaja el productor y otra para los brokers/organizaciones intermediarias.

## **4.1 Pestaña — Aseguradoras**

Para cada aseguradora el sistema almacena:

• Razón social y CUIT.

• Domicilio comercial.

• Condición ante el IVA (Responsable Inscripto / Monotributo / Consumidor Final / Exento).

• Email de contacto y número de teléfono.

• URL del sitio web oficial.

• Credenciales de acceso al portal de la aseguradora (usuario y contraseña, almacenados de forma local y privada).

• Código de cliente/productor asignado por la aseguradora.

• Notas libres adicionales.

Las filas de la tabla son expandibles: al hacer clic en una aseguradora se despliega un panel con todos sus datos detallados y el resumen de facturación de comisiones asociada.

Totales visibles en tarjetas superiores: total facturado en ARS, total facturado en USD y cantidad de facturas emitidas.

## **4.2 Pestaña — Brokers / Organizaciones**

Un broker u organización puede representar a varias aseguradoras. El directorio de brokers permite:

• Nombre del broker u organización.

• Color identificatorio (selector de 8 colores predefinidos para identificación visual rápida).

• Aseguradoras vinculadas: el productor selecciona qué aseguradoras trabajan bajo ese broker.

• Contacto principal (nombre y apellido).

• Email del broker.

## **4.3 Filtros y Búsqueda**

• Buscador por razón social o CUIT.

• Alta, edición y eliminación de aseguradoras y brokers desde la misma pantalla.

# **5\. Facturación de Comisiones Detallada**

El productor de seguros cobra comisiones de las aseguradoras. Este módulo le permite llevar un registro preciso de cada factura emitida, el estado de cobro y las diferencias detectadas entre lo esperado y lo efectivamente cobrado.

## **5.1 Lista General de Facturas**

Vista unificada con todas las facturas de comisiones de todas las aseguradoras:

• Columnas: aseguradora, período, número de factura, fecha de emisión, estado, monto, moneda, vencimiento.

• Buscador por nombre de aseguradora, período o número de factura.

• Ordenamiento por fecha de emisión (más reciente primero).

## **5.2 Estados de una Factura de Comisión**

| Estado | Significado |
| ----- | ----- |
| Pendiente | Factura emitida, pendiente de cobro |
| Facturada | Factura enviada formalmente a la aseguradora |
| Cobrada | Importe recibido en su totalidad |
| Parcial | Se cobró una parte del importe; hay saldo pendiente |
| Vencida | Superó la fecha de vencimiento sin cobrarse |

## **5.3 Alta de Factura de Comisión**

El formulario de nueva factura registra:

• Aseguradora a la que corresponde (selector desplegable de las aseguradoras registradas).

• Período (mes y año en formato YYYY-MM).

• Número de factura.

• Monto facturado e indicador de moneda (ARS o USD).

• Estado inicial.

La factura queda asociada a la aseguradora correspondiente y aparece tanto en la lista general como dentro del detalle expandible de esa aseguradora en el directorio.

## **5.4 Vinculación con Pólizas**

Cada factura de comisión puede vincularse con las pólizas que la originaron mediante el campo polizasIds, permitiendo:

• Trazabilidad de qué pólizas generaron cada comisión.

• Detección de diferencias: si el monto esperado (calculado desde las pólizas vinculadas) difiere del monto facturado, el sistema marca automáticamente el flag diferenciaDetectada.

## **5.5 Registro de Pagos Parciales**

Si la factura tiene estado "Parcial", el productor puede registrar múltiples pagos:

• Fecha del pago.

• Monto cobrado en esa cuota.

• Medio de pago utilizado.

• URL del comprobante de pago.

💡 El sistema acumula los montoCobrado sumando todos los pagos registrados, permitiendo ver en todo momento el saldo pendiente.

# **6\. Login con Google / Multi-moneda / Caución**

Esta sección agrupa tres características transversales que enriquecen la experiencia del sistema sin estar confinadas a un único módulo.

## **6.1 Login con Google (OAuth 2.0)**

El sistema ofrece dos modalidades de autenticación:

• Email \+ contraseña: registro e inicio de sesión con credenciales propias.

• Inicio de sesión con Google: un clic vincula la cuenta de Gmail del productor vía Firebase Authentication \+ Google Provider. No requiere recordar contraseñas adicionales.

Ambas modalidades comparten la misma base de datos y la sesión persiste de forma segura mediante tokens de Firebase (JWT). El logout cierra la sesión en todos los dispositivos.

💡 Para multi-usuario (agencia con varios productores), el sistema multi-cuenta está incluido en el plan Agencia.

## **6.2 Multi-moneda (ARS / USD / EUR / BRL)**

Todas las pólizas y facturas del sistema soportan múltiples monedas:

• Pólizas: el campo moneda acepta ARS, USD, EUR o BRL. La prima y los importes vinculados se almacenan en la moneda original.

• Comisiones: cada factura de comisión indica su moneda (ARS o USD), con totales separados por divisa en los KPIs.

• El sistema no realiza conversión automática de divisas; cada registro mantiene su moneda nativa para evitar inconsistencias contables.

## **6.3 Caución — Categoría de Seguro**

La categoría "Seguros Financieros" de la clasificación de rubros incluye Caución, Crédito y Garantías Contractuales como tipos de póliza válidos en el formulario de nueva póliza.

Esto permite al productor gestionar pólizas de caución con las mismas herramientas que cualquier otro ramo:

• Registro con datos del tomador, beneficiario, monto garantizado y vigencia.

• Alertas de vencimiento estándar.

• Cálculo de comisión sobre la prima.

• Asociación con aseguradoras especializadas en garantías.

# **7\. Gestión de Cuotas y Renovación Automática**

Este módulo maneja el ciclo de facturación periódica de las pólizas y la generación automática de la póliza siguiente al registrar el cobro de la última cuota.

## **7.1 Periodicidades Soportadas**

Al crear una póliza, el productor define la vigencia de facturación:

| Vigencia | Cuotas generadas | Descripción |
| ----- | ----- | ----- |
| Mensual | 1 | Una póliza/cuota por mes |
| Bimestral | 2 | Dos cuotas de 2 meses cada una |
| Trimestral | 3 | Tres cuotas de 3 meses cada una |
| Semestral | 6 | Seis cuotas de un semestre cada una |
| Anual | 12 | Doce cuotas de un año |

## **7.2 Generación de Cuotas en Lote**

Al guardar una póliza con vigencia mayor a Mensual, el sistema genera automáticamente todas las cuotas del período:

• Cada cuota es una fila independiente en el dashboard con su número (ej. "3/6" \= tercera cuota de seis).

• Todas las cuotas comparten el mismo groupId, permitiendo identificar que pertenecen al mismo contrato.

• Las fechas de inicio y vencimiento de cada cuota se calculan automáticamente en función de la vigencia.

• El estado inicial de cada cuota es "Activa" y pagada \= false.

## **7.3 Registro de Pago y Renovación**

En el dashboard de pólizas, el productor puede marcar cada cuota como pagada desde la columna de acciones:

• Al marcar la última cuota de un grupo como pagada, el sistema genera automáticamente la siguiente póliza (renovación).

• La nueva póliza copia todos los datos de la póliza original, actualiza las fechas y la numera como cuota "1/N".

• El productor recibe una confirmación visual de la renovación generada.

## **7.4 Estados de Póliza y Alertas de Vencimiento**

Las pólizas tienen tres estados calculados automáticamente en función de la fecha de vencimiento:

| Estado | Condición | Acción recomendada |
| ----- | ----- | ----- |
| Activa | Vence en más de 30 días | Seguimiento normal |
| Vence pronto | Vence en menos de 30 días | Enviar recordatorio al cliente |
| Vencida | Fecha de vencimiento pasada | Renovar o dar de baja |

## **7.5 Integración con el Dashboard**

El dashboard principal muestra:

• Cantidad de pólizas activas, próximas a vencer y vencidas.

• Monto total de comisiones del mes (suma de comisionCalculada de pólizas activas del mes).

• Acceso directo al listado de "Vence pronto" para actuar rápidamente.

# **8\. Módulos Base del Sistema**

Además de los módulos enriquecidos incluidos en el alcance, el sistema posee una base de funcionalidades core que operan de forma transversal:

## **8.1 Dashboard Principal**

• Tarjetas de KPIs: pólizas activas, vencidas, próximas a vencer, comisiones del mes.

• Gráfico de barras: evolución de comisiones por mes.

• Lista de las próximas 5 pólizas a vencer.

• Calendario de vencimientos y cobros (integración con ArgentinaHolidays para feriados).

## **8.2 Gestión de Clientes (CRM)**

• Ficha de cliente: nombre, DNI/CUIT, teléfono, email, dirección completa.

• Historial de pólizas asociadas a cada cliente.

• Búsqueda instantánea y filtros.

• Integración con formulario de pólizas: al tipear el nombre, autocompleta los datos del cliente.

## **8.3 Gestión de Pólizas**

• Formulario de alta con validación por Zod (esquema estricto): datos del cliente, aseguradora, rubro, número de póliza, fechas, prima, suma asegurada, moneda, medio de pago, vigencia y porcentaje de comisión.

• El porcentaje de comisión se pre-rellena automáticamente según la configuración guardada para la combinación aseguradora \+ rubro.

• La fecha de vencimiento se calcula automáticamente a partir de la fecha de inicio y la vigencia, pero puede editarse manualmente.

• Soporte para campos específicos de Vida y Retiro: edad del asegurado, si fuma, edad de retiro, fondo acumulado.

## **8.4 Módulo de Comisiones**

• Tabla de comisiones ganadas con filtros por período, aseguradora y rubro.

• Cálculo automático: prima × porcentaje de comisión \= comisión calculada.

• Exportación a Excel.

## **8.5 Notas Rápidas**

• Bloc de notas integrado al sistema para apuntes sin formato.

• Las notas se guardan por usuario y persisten entre sesiones.

## **8.6 Herramientas (ToolsPage)**

• Calculadora de comisiones por rubro.

• Conversor de fechas (días desde inicio a fecha de vencimiento).

• Otras utilidades de uso frecuente para el PAS.

## **8.7 Perfil y Configuración**

• Datos del productor: nombre, matrícula SSN, email, teléfono.

• Gestión de suscripción y plan activo.

• Código de referidos con contador de referidos del mes y totales.

## **8.8 Programa de Referidos**

• Cada usuario tiene un código de referido único.

• Al new usuario registrarse con ese código, el referente acumula referidos.

• El panel muestra referidos del mes y referidos totales.

# **9\. Propuesta de Implementación por Etapas**

Los módulos detallados en este documento se implementarán en dos etapas consecutivas, permitiendo al cliente comenzar a operar las funcionalidades de mayor impacto inmediato antes de incorporar los módulos de gestión financiera y administrativa.

  **ETAPA 1 — Operaciones y Captación de Clientes**

  **$150000**

Incluye los módulos que impactan directamente en la operación diaria del productor y en la captación de nuevos asegurados:

• Módulo de Siniestros — gestión completa de reclamos con estados, prioridad automática, historial de notas y exportación.

• Módulo de Cotizaciones \+ Página Pública — cotizador con link/QR compartible sin login para Auto, Moto, Hogar y otros.

• Login con Google \+ Multi-moneda (ARS/USD/EUR/BRL) \+ soporte de Caución como ramo financiero.

  **ETAPA 2 — Administración Financiera y Automatización**

  **$100000**

Incluye los módulos orientados al control financiero, los vínculos con aseguradoras y la automatización del ciclo de vida de las pólizas:

• Directorio de Aseguradoras y Brokers — datos fiscales, credenciales de portales y vinculación con brokers/organizaciones.

• Facturación de Comisiones — facturas por aseguradora, estados de cobro, pagos parciales y detección de diferencias.

• Gestión de Cuotas y Renovación Automática — generación de cuotas en lote y renovación automática al registrar el último pago.

# **10\. Nota Final**

Este documento fue preparado luego de analizar el PRD v1.1 (Marzo 2026\) y el prototipo del cliente (pas\_nuevo). El objetivo es garantizar que el cliente tenga expectativas claras y documentadas sobre qué recibirá con el presupuesto del Sistema Pro ($200.000 \+ hosting \+ dominio).

Cualquier funcionalidad no listada en este documento puede ser incorporada al proyecto en una fase posterior, previa aprobación de un presupuesto específico para cada módulo.

PAS Alert — Insurance Tech — Abril 2026  
Este documento es confidencial y está dirigido exclusivamente al cliente.