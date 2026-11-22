# Pendientes del restaurante

Datos que **faltan o son provisionales**. Aquí se van anotando a medida que aparecen; cuando el restaurante confirme un dato, se cambia en la web (o en el panel `/admin`) y se marca como hecho.

Regla: **no se publica** la web con datos marcados como provisionales sin que el usuario lo apruebe (un test lo comprobará en la fase de publicación).

Leyenda: ⏳ pendiente · ✅ confirmado

## Datos de contacto y horario

| Dato      | Valor provisional                                    | Estado |
| --------- | ---------------------------------------------------- | ------ |
| Horario   | Martes a domingo, 13:00–22:00 · Lunes cerrado        | ⏳     |
| Dirección | Am Gaswerk 1, 28197 Bremen                           | ✅     |
| Teléfono  | PENDIENTE (en la web: `0421 000 000 0` de relleno)   | ⏳     |
| Email     | PENDIENTE (en la web: `info@example.com` de relleno) | ⏳     |
| Logo SVG  | Solo hay PNG de 600 px; falta el vectorial original  | ⏳     |
| Reservas  | Email que recibe las reservas: PENDIENTE             | ⏳     |
| Dominio   | Se compra uno nuevo al publicar (el anterior caducó) | ⏳     |

## Impressum (obligatorio en Alemania)

| Dato                        | Valor     | Estado |
| --------------------------- | --------- | ------ |
| Razón social / nombre       | PENDIENTE | ⏳     |
| Titular o representante     | PENDIENTE | ⏳     |
| Dirección legal             | PENDIENTE | ⏳     |
| USt-IdNr. (número de IVA)   | PENDIENTE | ⏳     |
| Registro mercantil (si hay) | PENDIENTE | ⏳     |

## Contenidos

| Contenido                     | Situación                                       | Estado |
| ----------------------------- | ----------------------------------------------- | ------ |
| Historia del restaurante      | Texto de relleno (lorem ipsum)                  | ⏳     |
| Textos en español de la carta | Traducidos del alemán/inglés por la IA; revisar | ⏳     |

## Carta (del PDF `material/menu/menu.pdf`)

Dudas encontradas al pasar la carta a la base de datos (`npm run db:seed:menu`). Cada plato afectado se carga visible con el valor más probable, marcado como "provisional" y con la duda en la nota, para corregirlo desde el panel.

| Plato                                     | Duda                                                                                                                                                                                                                 | Estado |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Papa rellena vegan                        | Aparecen dos precios: 8,50 € y 8,00 €. Cargado con 8,50 € (junto al nombre)                                                                                                                                          | ⏳     |
| Tamal de Pollo                            | Sin precio claro: cargado con 8,00 € (precio suelto de la página)                                                                                                                                                    | ⏳     |
| Causa Acevichada                          | Dos precios: 13,00 € y 10,00 €. Cargado con 13,00 € (junto al nombre)                                                                                                                                                | ⏳     |
| Tiradito                                  | Sin precio en el PDF: se pone 13,00 € provisional (decidido el 2026-11-21)                                                                                                                                           | ⏳     |
| Anticuchos Veganos / de Carne             | Precios 15,00 € y 17,90 €: ¿cuál es de cada uno? Cargados veganos 15,00 € y de carne 17,90 €                                                                                                                         | ⏳     |
| Crema de Oliva / Crema Pikante            | Precios 4,00 € y 1,90 €: ¿cuál es de cada uno? Cargadas Oliva 4,00 € y Pikante 1,90 €                                                                                                                                | ⏳     |
| Arroz Chaufa Vegano / Vegetarian          | Alérgeno "R" no existe en la lista (A–N): descartado (el Mixto no lo lleva)                                                                                                                                          | ⏳     |
| Platos sin alérgenos                      | Tamal vegan, Causa veggie, Ceviche de Setas, Seco a la Norteña, Seco a la limeña, Arroz con Pollo, Anticuchos (los 4), Tostones, Yuca frita, extras y dips                                                           | ⏳     |
| Ceviche de Setas / Aji de Champiñones     | El PDF dice "Pilsen/Pilse" (cerveza): se interpreta como "Pilze" (setas)                                                                                                                                             | ⏳     |
| Arroz con Marisco                         | La versión inglesa dice "chocolate"; se interpreta como "choclo"                                                                                                                                                     | ⏳     |
| Alérgenos que faltan según la descripción | Leche de Tigre (apio → I), Ceviche entrante (apio, calamar, pulpo, mejillones → I, N), Arroz Chaufa (sésamo → K; el vegetariano lleva huevo → C), Ají de Gallina (huevo → C), Causa veggie y Huevo frito (huevo → C) | ⏳     |
| Arroz Chaufa Vegano                       | Lleva salsa de ostión (N): no es vegano. Mientras tanto va SIN etiqueta vegana. ¿Se cambia la salsa (y se pone la etiqueta) o se renombra el plato?                                                                  | ⏳     |
| Chicharrón de Calamar                     | En el PDF está en la página de sopas y ensaladas; se ha dejado ahí (se mueve desde el panel)                                                                                                                         | ⏳     |
