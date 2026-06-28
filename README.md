# FakeStore | Trabajo Final Integrador (TFI)

Este proyecto representa el **Trabajo Final Integrador (TFI)** para la materia de Desarrollo Frontend. Consiste en una aplicación de comercio electrónico (E-commerce) de una sola página (SPA) que consume datos en tiempo real de la [Fake Store API](https://fakestoreapi.com/).

La aplicación está desarrollada enteramente con tecnologías web estándares nativas, aplicando buenas prácticas de arquitectura de software, accesibilidad, y un diseño visual pulido y responsive.

---

## 🚀 Tecnologías Utilizadas

* **HTML5 Semántico**: Para una estructura accesible, jerarquizada y con soporte para lectores de pantalla (atributos ARIA).
* **CSS3 Moderno**: Utilización de Custom Properties (variables CSS), Flexbox y CSS Grid para layouts flexibles "Mobile First", y animaciones nativas avanzadas. Sin frameworks externos.
* **JavaScript Vanilla (ES6+)**: Modularización en funciones, consumo de APIs mediante la API Fetch con `try/catch` para manejo de errores, y un patrón de diseño basado en **Estado Global Unidireccional**.

---

## 📂 Estructura del Proyecto

El proyecto está compuesto estrictamente por los siguientes archivos requeridos en la consigna académica:

```text
├── index.html   # Estructura e interfaz semántica de la aplicación
├── style.css    # Hojas de estilo, variables de diseño y adaptabilidad responsiva
├── app.js       # Lógica del cliente, llamadas HTTP y control de estado reactivo
└── README.md    # Documentación técnica del proyecto (este archivo)
```

---

## 🛠️ Arquitectura y Patrones de Diseño

### 1. Gestión del Estado Global (State Management)
Se implementa un objeto `state` centralizado para controlar los datos de forma predecible:
* `products`: Catálogo completo recuperado de la API.
* `categories`: Listado de categorías dinámicas de la API.
* `cart`: Array de objetos `{ product, quantity }` representando los productos comprados.
* `filters`: Criterios actuales de búsqueda y categorías.
* `ui`: Estados de carga (loaders), errores (mensajes de fallo) y el producto enfocado en el modal.

Toda modificación del estado pasa por funciones de mutación y desencadena automáticamente la actualización de las vistas correspondientes, imitando el funcionamiento de librerías modernas de forma nativa.

### 2. Comportamiento Inteligente del Carrito
* **No duplicación**: Si se agrega un producto ya existente, la cantidad aumenta automáticamente en lugar de duplicarse la tarjeta.
* **Persistencia**: Se integra `localStorage` para guardar el estado del carrito. De esta forma, el usuario no pierde sus compras al recargar o cerrar la pestaña del navegador.
* **Cálculos en tiempo real**: Se recalculan el total de artículos y el precio total de la compra de forma interactiva con formateador de moneda (`Intl.NumberFormat`).

### 3. Estados de la API
* **Skeleton Screen**: Mientras las peticiones `/products` y `/products/categories` están en estado de carga (pending), se renderiza un esqueleto animado (efecto Shimmer) para mejorar la UX percibida.
* **Resiliencia ante Errores**: Si ocurre un error de red o de servidor, la aplicación captura el error con `try/catch`, detiene el loader y muestra una vista amigable de fallo con un botón de **"Reintentar conexión"** que permite volver a intentar la carga de datos.

### 4. Accesibilidad (a11y)
* Se utilizan elementos HTML correctos (ej. `<button>` para acciones, `<nav>` para filtrados, `<aside>` para el panel de compras).
* Contraste de colores verificado siguiendo las pautas WCAG AA.
* Estados de foco (:focus-visible) explícitos en color púrpura y espaciado de contorno.
* El Modal de producto y el Drawer del carrito cuentan con el rol semántico `dialog` y `aria-modal="true"`.

---

## ⚡ Cómo Ejecutar el Proyecto

Dado que el proyecto utiliza tecnologías nativas sin compiladores ni frameworks:

1. Cloná o descargá esta carpeta de código.
2. Abrí el archivo `index.html` directamente en tu navegador (podes hacer doble clic sobre él).
3. *Recomendado*: Para una experiencia óptima con persistencia de variables locales y llamadas a APIs externas sin restricciones estrictas de CORS, abrilo utilizando un servidor local como la extensión **Live Server** de VSCode o ejecutando:
   ```bash
   npx serve ./
   ```
