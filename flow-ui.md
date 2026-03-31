
## 1. Identidad Visual Global
* **Paleta de Colores:**
    * **Primario (Acción):** Azul (para botones, enlaces y estados activos).
    * **Fondo:** Blanco o Gris Muy Claro (limpieza y claridad).
    * **Texto:** Gris Oscuro / Negro (legibilidad máxima).
    * **Sistema de Feedback:** Degradado dinámico de **Verde (Aceptación)** a **Rojo (Rechazo)**.
* **Estilo:** Moderno, limpio, con bordes ligeramente redondeados y sombras suaves para dar profundidad.

## Verificacion del numero de telefono y creacion de cuenta:

Layout: Verificación de Teléfono y Registro
A. Pantalla 1: Entrada de Teléfono (Input)
Selector de País: Un menú desplegable con banderas y códigos de área (ej. +54, +57, +34) con buscador integrado.

Campo de Número: Un input grande y centrado, con teclado numérico automático en móviles.

Botón de Acción: "Enviar código" (Azul Primario).

Nota Legal: Texto pequeño debajo indicando que se enviará un SMS (Gris suave).

Pantalla 2: Verificación de PIN (OTP)
Visual: 4 o 6 recuadros individuales (slots) para los números.

Comportamiento: El foco salta automáticamente al siguiente cuadro al escribir.

Temporizador: "Reenviar código en 00:59" en color gris. Si llega a cero, el texto se vuelve un enlace azul activo.

Acción de Error: Si el código es incorrecto, los bordes de los cuadros se iluminan en Rojo con una pequeña vibración (haptic feedback).

## Vista de Inicio (Home) y Ofertas
En forma de scroll mostrando ofertas afines a los intereses del usuario, se muestra contenido con el siguiente formato:
Cada tarjeta de producto o servicio debe presentar una estructura estandarizada:
* **Visualización:** Imagen principal, título, precio, ubicacion del producto o del servicio y etiquetas de categoría.
* ** Clickear sobre el badge del negocio te lleva a una vista que comprende la tienda de este negocio, aqui se pueden ver sus ofertas y contenidos creados en la plataforma(en caso de tener contenido).
* **Botones de Acción (Obligatorios):**
    1.  **Botón "Preguntar":** Abre un campo de texto rápido. Al recibir respuesta del negocio, el usuario recibe una **notificación tipo "Toast"** en la parte superior de la interfaz. Estas preguntas y respuestas se muestran de forma publica en la oferta, mostrando la identidad de quien pregunta y de quien responde junto con su indicador de confianza(el numero de quien pregunta no se muestra).
    2.  **Botón "Comprar":** Inicializa automáticamente un chat privado entre las dos entidades (comprador y vendedor).


## Módulo de Chat
El chat debe soportar múltiples tipos de contenido con una jerarquía visual clara:
2.  **Inicio de Chat:** Al abrir una conversación entre comprador y vendedor, el sistema debe resaltar las credenciales del negocio y la disponibilidad de transporte para generar confianza desde el primer mensaje.

* **Badge:** Cada usuario en el chat tiene una imagen que coicide con la de su perfil, y cada mensage que envia viene acompañado de su imagen, su numero de telefono y su indicador de confianza, el indicador de confianza tiene tooltip con un helper. Si se clickea sobre la imagen del usuario, se abre una vista hacia el perfil del usuario con una flecha de Go Back para retornar a la vista anterior.
* **Mensajes de Texto:** Burbujas estándar alineadas según el remitente.
* **Multimedia:**
    * **Imágenes:** Previsualizaciones compactas. Si hay varias, usar un sistema de rejilla (grid). Al tocar, se expanden a pantalla completa.
    * **Audios:** Micro-reproductor con barra de progreso, botón play/pause y duración.
    * **Documentos:** Icono representativo del tipo de archivo (PDF, Word, etc.) junto al nombre y peso del archivo.
* **Meta-datos:** Indicador de estado (doble check verde para leído) y hora de envío.
* **Replicas de mensajes:** El usuario puede selecionar tantas mensajes como quiera para replicar con un mensaje.

Nota: El chat se inicializa con todas las preguntas que se han echo junto con sus respuestas para el comprador, sin embargo cuando el comprador decide inicializar el chat, este se carga con todas las preguntas y respuestas y en modo compra.

- Una vez que las partes se han puesto de acuerdo, el vendedor emite un acuerdo en forma de formulario que detalla los parametros de la compra, como:
    - Titulo
    - Mercancias:
        - Tipo de mercancias, una lista.
        - Cantidad, una lista por cada tipo de mercancia.
        - Valor de cada producto, un lista por cada tipo de mercancia.
        - Estado (nuevo, usado, reacondicionado)
        - Descuentos (si aplican), un numero por cada tipo de mercancia
        - Impuestos (IVA, aranceles, etc.)
        - Moneda
        - Tipo de embalaje
        - Condiciones para devolver, descripcion, Quién paga el envío de devolución, Plazos
        - Regulaciones y cumplimiento, Aduanas (si aplica), Restricciones legales, Permisos
        
    - Servicios:
        - Tipo de servicio
        - Tiempo del servicio, de inicio a fin
        - Horarios y fechas
        - Recurrencia de pagos, fechas y cantidad
        - Descripcion del servicio
        - Riesgos del servicio, lista de descripcion de riesgos
        - Que incluye el servicio, descripcion
        - Que no incluye, descripcion
        - Dependencias, lista que describe cada dependencia
        - Que se entrega, descripcion
        - Garantías, descripcion
        - Penalizaciones por atraso, puede ser dinero o un bien, describirlo.
        - Causas de terminación anticipada(descripcion de las causas), periodo de aviso, un numero (ej: 30 días)
        - Método de pago, Moneda
        - Cómo se mide el cumplimiento, descripcion
        - Penalizaciones por incumplimiento, descripcion
        - Nivel de responsabilidad, como se define la responsabilidad, descripcion.
        - Propiedad intelectual, ¿Quién es dueño del resultado del servicio?, ¿Se puede reutilizar?, Licencias

Este formulario puede ser aceptado o rechazado por el comprador, una vez aceptado por ambas partes, este acuerdo no se puede derogar, aunque se pueden emitir mas contratos entre las partes.

El chat debe tener una opcion pare revisar todos los contratos emitidos, con un filtro para filtrar por usuario del chat, y cada contrato se puede linkear a una hoja de rutas en caso de que existan mercancias de por medio.

* **Flujo de Chat Comercial y Logística**
### A. Inicialización y Transportistas
* Si el producto no incluye transporte (según el warning del perfil), se habilita la opción **"Añadir Transportista"**.
* **Formulario de Acuerdo:** Se despliega un formulario donde se definen los términos. El comprador debe marcar explícitamente su conformidad con el precio del transporte antes de proceder.


## Interfaz de Reels (Experiencia Inmersiva)
* **Navegación:** Video a pantalla completa con scroll vertical.
* **Componente "Like/Dislike" (La Barra de Confianza):**
    * **Estado inicial:** Un círculo pequeño ("pelotica") de color neutro o según la tendencia actual del video.
    * **Interacción (Touch/Hover):** Al interactuar, se expande a un **óvalo vertical** con un degradado de verde (arriba) a rojo (abajo).
    * **Mecánica:** El usuario desliza hacia arriba o abajo como si ajustara la "temperatura". El color del óvalo cambia en tiempo real según la posición del dedo o mouse.
    * **Interacción adicional:** Añadir icono de **"Guardar" (Save)** en la barra lateral derecha (debajo del compartir).
    * **Acceso a Guardados:** En el perfil de usuario, debe existir una pestaña o sección dedicada ("Mis Reels") para volver a visualizar el contenido guardado.
    * **Navegación:** El gesto de deslizar hacia arriba se mantiene para el siguiente Reel, pero se añade un acceso rápido desde el perfil.
    ### Flujo de Interacción
    1.  **Compartir Contenido:** Al intentar compartir un Reel, se despliega automáticamente la lista de contactos registrados del usuario en la plataforma.

* **Controles Laterales:** Botones de comentario y compartir (solo visibles para contactos registrados).

Existe un boton para publicar reels si el usuario es vendedor de mercancias|servicios|transportista

### FLUJO DE PUBLICACION DE REELS PROFESIONALES
1. Validacion de Entrada (Filtro de Confianza):
Al iniciar, el sistema ejecuta una comprobacion silenciosa de reputacion:
    - Confianza Alta: El usuario accede y publica sin fricciones.
    - Confianza Baja/Nueva: Se muestra un aviso de "Revision Preventiva". El video pasa por una validacion
    automatica antes de ser publico para evitar spam.
2. Categorizacion y Etiquetado (Contexto Obligatorio):
    - Vinculacion: El usuario debe elegir un producto (ej. "Cosecha de Malanga") o servicio (ej. "Flete 5 Ton")
    de su inventario activo.
3. Publicacion Condicional:
    - Aprobado: El video se indexa inmediatamente en el feed de su categoria.
    - En Revision: El video queda como "Pendiente". Se notifica al usuario que el contenido no parece
    comercial y se advierte sobre posibles bajas en su Barra de Confianza

## Perfiles de Negocio y Verificación
* **Estructura del Perfil:**
    * **Header:** Nombre de la empresa y categorías (soporte multi-categoría).
    * **Badge de Verificación:** Icono distintivo para negocios con credenciales validadas por soporte. Si no hay credenciales, mostrar etiqueta de "No verificado".
    * **Sección de Catálogo:**
        * **Fichas de Producto/Servicio:** Incluyen nombre, descripción detallada, precio, stock actual, fotos y documentos técnicos adjuntos.
        * **Transporte:** Etiqueta visual ("Warning") que indique explícitamente si el transporte está incluido para evitar dudas en el chat.

* **Configuración del Usuario:**
    * Campos obligatorios: Email y teléfono.
    * **Multi-cuenta:** Espacios para enlazar perfiles externos (Instagram, Telegram, X).
    * **Imagen:** Subir una imagen que represente el tipo de negocio.
    * **Configurar targetas de pago**: Esta opcion solo es visible para el propietario de la cuenta, el usuario podra escoger una pasarela de pago y añadir las credenciales necesarias para cada pasarela que decide registrar.

## Transportista,

* **Vehiculos:** Los transportistas disponen de vehiculos, y si un transportista esta dando un viaje, no puede tomar viajes que le solapen en tiempo con el tiempo de su viaje actual. Cada transportista muestra en su catalogo o tienda fotos de sus vehiculos. Cada vehiculo debe tener una descripcion sobre su rendimiento y tipo de mercancias que puede llevar y bajo que condiciones lo puede hacer.

* **Emitir contratos a transportistas:** El comprador/vendedor emiten un contrato en forma de hoja de ruta que se fuciona con otro contrato, esta fucion se puede quitar y poner simpre y cuando no se halla aceptado por ningun miembro comprador/vendedor y cada vez que se haga la fucion, esta debe ser aprobada por los miembros del chat vendedor/comprador. Al decidirse transportar mercancias, debe existir la opcion en el chat de crear una o mas hojas de ruta estas hojas de rutas son aprobadas entre el comprador/vendedor y adjuntadas en orden cronologico al contrato principal.

La hoja de ruta contempla el formulario siguiente:

### La Hoja de Ruta (Roadmap)
* **Campos del Formulario:**
    * Tramos del recorrido.
    * Ubicaciones de origen y destino por tramo.
    * Tiempos estimados de entrega/recogida.
    * Precio desglosado por cada transportista involucrado.
    * Carga que llevara el transportista en su tramo.
    * En cada tramo puede haber una carga y descarga de mercancias, en cada caso indicar que tipo de mercancia es.
    * Para seleccionar la ubicacion de cada tramo, se abre una vista de un mapa para seleccionar las coordenadas.
    * Responsabilidad por daños por embalaje.
    * Requisitos especiales (frágil, refrigerado, etc.)
    * Tipo de vehiculo requerido

Una vez emitido esta hoja ruta y aprobada entre las partes, procede a ser publicada y la plataforma le muestra a sus transportistas esta hoja de ruta, estos se suscriben con un boton de "Suscribirse" en la oferta seleccionando un vehiculo que tengan en su catalago y espera a ser aprobado por los integrantes del chat comprador/vendedor y de ser aprobado este entra automaticamente en el chat.

* **Visualización:** La hoja de ruta se renderiza como un objeto interactivo en la oferta del transportista, y este objeto siempre puede ser consultado por el transportista en el chat

## Gestión de Relevos y Cambio de Propiedad (Owner)

### Activación del Relevo (Interfaz del Transportista Actual)
* **Botón de Acción:** Dentro del chat grupal, el Transportista A tiene un botón especial: **"Transferir Responsabilidad / Relevo"**.
* **Selector de Nuevo Owner:** Se despliega una lista de los usuarios presentes en el chat que tienen rol de "Transportista". 
* **Motivo del Relevo:** Un menú rápido (Ej: Avería, Cambio de tramo, Emergencia) para dejar constancia en el registro.

### El "Handshake" (Entrega y Recepción)
* **Validación de Telemetría:** El sistema captura automáticamente la **ubicación GPS** y la **hora exacta** de ambos transportistas para certificar el punto de encuentro.
* **Registro Inalterable:** Se genera un mensaje de sistema con fondo gris (estilo "Solo lectura") que dice:
    > 📜 **Registro de Cambio de Responsabilidad:** > La carga ha pasado de [Transportista A] a [Transportista B]. 
    > **Ubicación:** [Coordenadas/Mapa] | **Hora:** [HH:MM] | **Consenso:** [ID de Transacción].

### Actualización del Timeline (Header del Chat)
* **Reflejo Visual:** El nodo del tramo actual en la barra superior debe actualizarse inmediatamente. 
* **Iconografía:** El icono del transportista en el nodo activo cambia a la foto de perfil del **Nuevo Owner**, asegurando que el comprador sepa exactamente quién tiene su mercancía en cada segundo.

### Notas para el Diseñador (Figma):
1.  **Jerarquía de Alerta:** El mensaje de "Cambio de Responsabilidad" debe verse diferente a un mensaje de chat común; debe parecer un **Certificado Digital** dentro del flujo de la conversación.


### Sistema de Pagos y Notificaciones
* **Pago:** En el chat existe una opcion de realizar pago, al usuario clickear aqui, salta un modal con un warning que dice que se esta generando la factura del pago. Al estar creada esta factura, comienza el flujo para realizar el pago, la factura se emite en un siguiente paso y se muestran 2 botones para estar de acuerdo o consultar a soporte en caso de problemas. Si el usuario decide continuar, se depligan las opciones de pago, como moneda de pago, escoger targeta asociada a la plataforma y el resto de las credenciales necesarias para cada pasarela de pago.
* **Consulta a soporte para el pago**: Se envia a soporte una descripcion de issue, y se cancela el pago hasta nuevo aviso.
* **Confirmación de Pago:** Una vez que el comprador realiza el pago, el sistema emite un **"Warning de Notificación"** global.
* **Alcance:** Este aviso llega a todos los participantes del chat (vendedor y todos los transportistas de la hoja de ruta) para confirmar que la operación está financiada y lista para ejecución.


## Barra de confianza(Top side)
- En la parte superior de la pantalla se muestra la barra de confianza del usuario, esta tiene forma de gradiente que a medida que se hace mas verde, indica mas confianza y a medida que se hace mas roja, es menos confiable, debe tener un numero en el centrado en la barra indicando un numero entre [100, -inf], tambien hay un diferenciador de umbral hacia lo negativo, que si se ubica por debajo, el usuario pierde acceso a interaccion en la plataforma y solo se permite acceso al pago de su mensualidad. 

- El usuario debe recibir un warning en forma de modal siendole comunicado su situacion en caso de que baje del umbral o hacienda del umbral, cada accion exitosa en al plataforma se muestra en una acceso de su barra de confianza con una animacion.

- Si el usuario baja el umbral, toda accion se inhabilita excepto el pago de la mensualidad.


## Salida expontanea del chat

Si antes del cumplimiento de un contrato un usuario sale del chat, se emite una alerta a este usuario pidiendole una razon de porque salio del chat y comunicandole que la accion sera investigada y pudiera afectar a su barra de confianza.

## Sistema de Notificaciones
* **Prioridad Alta:** Las respuestas a preguntas de productos y las confirmaciones de pago aparecen como banners en la **vista superior**.
* **Historial:** Un centro de notificaciones donde se guarde el registro de estos eventos críticos.


## Notas Técnicas para el Diseñador (Figma)
- Estados de Carga: Diseñar un "spinner" o barra de progreso discreta para cuando el sistema verifica el código SMS o sube la foto de perfil.

- Teclado Adaptativo: Asegurar que el diseño de los formularios deje espacio suficiente para que el teclado del teléfono no tape el botón de "Siguiente".

- Transiciones: Usar un deslizamiento lateral (slide) entre estas tres pantallas para dar sensación de avance en un proceso lineal.