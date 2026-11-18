# Flujos de negocio — Pachamama

Tres procesos **independientes** (tablas, endpoints y pantallas separados). No se mezclan aunque se parezcan.

Reglas comunes:

- Todo se **paga en el local**. No hay pagos online.
- El cliente **no necesita cuenta**: deja nombre, email, teléfono y acepta la política de privacidad.
- Cada solicitud nace en `pending` y la confirma o rechaza el personal desde `/admin`.
- Cada cambio de estado relevante envía un email al cliente (en su idioma) y queda registrado (quién y cuándo).
- Las transiciones válidas las controla el **service**; cualquier otra devuelve error.

## 1. Reservas

```
pending ──► confirmed ──► completed
   │            ├──────► no_show
   │            └──────► cancelled
   └──────► rejected
(pending también puede pasar a cancelled)
```

| Dato         | Notas                                                   |
| ------------ | ------------------------------------------------------- |
| Fecha y hora | Dentro del horario y fuera de cierres (`opening-hours`) |
| Personas     | Mín./máx. configurable                                  |
| Contacto     | Nombre, email, teléfono                                 |
| Comentario   | Opcional (alergias, ocasión…)                           |

Pendiente de decidir: confirmación manual siempre o aforo automático por franja.

## 2. Pedidos gastronómicos (para recoger)

```
pending ──► confirmed ──► ready ──► picked_up
   │            └───────────┴────► cancelled
   └──────► rejected
```

| Dato                | Notas                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------- |
| Platos y cantidades | Del menú activo; el precio se **copia** al pedido (no cambia si luego cambia la carta) |
| Hora de recogida    | Franja dentro del horario; límites de pedidos por franja a decidir                     |
| Contacto            | Nombre, email, teléfono                                                                |
| Total               | Calculado en el servidor, nunca el que envía el navegador                              |

## 3. Tienda (compras para recoger)

```
pending ──► confirmed ──► ready ──► picked_up
   │            └───────────┴────► cancelled
   └──────► rejected
```

- Productos con **stock**. El stock se **descuenta al confirmar** (en una transacción) y se repone si se cancela tras confirmar.
- Al crear la compra se comprueba que hay stock suficiente; al confirmar se vuelve a comprobar.
- Precio copiado al pedido, total calculado en el servidor.

## Contenido gestionado desde el panel

| Contenido          | Notas                                                                          |
| ------------------ | ------------------------------------------------------------------------------ |
| Horarios y cierres | Horario semanal + excepciones (festivos, vacaciones)                           |
| Menú               | Categorías, platos, precios, alérgenos, imagen, disponible sí/no, textos de/es |
| Noticias y avisos  | Publicación con fecha; avisos destacados (p. ej. "cerrado el lunes")           |
| Multimedia         | Fotos y vídeos de la galería                                                   |
| Historia y legales | Textos de/es                                                                   |

## Roles

| Rol     | Puede                                                                         |
| ------- | ----------------------------------------------------------------------------- |
| `admin` | Todo, incluido gestionar usuarios del personal                                |
| `staff` | Gestionar reservas, pedidos, compras, horarios del día, menú (disponibilidad) |

Roles definitivos pendientes de confirmar.
