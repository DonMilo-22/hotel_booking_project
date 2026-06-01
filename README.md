# Sistema de Reservas de Hotel 🏨🌊

Bienvenido al repositorio del **Sistema de Reservas de Hotel**. Esta es una aplicación web moderna y responsiva que permite a los usuarios buscar habitaciones disponibles, calcular costos y realizar reservas mediante una pasarela simulada. Además, cuenta con un panel administrativo completo para gestionar el estado de las habitaciones y supervisar todas las transacciones realizadas.

El proyecto está diseñado bajo una arquitectura limpia de cliente-servidor:
*   **Frontend:** HTML, CSS y Javascript puro (Vanilla JS).
*   **Backend:** Node.js y Express API.
*   **Base de datos:** Compatible con SQL Server (desarrollo/producción Azure) y preparado para migración a PostgreSQL (despliegue local en Raspberry Pi).

---

## 🚀 Características Principales

### 👤 Área de Clientes
*   **Diseño Inspirador:** Interfaz visual con temática costera y moderna, completamente adaptada a dispositivos móviles (Layout Responsivo).
*   **Reserva de Habitaciones:** Selector interactivo de fechas (Check-in/Check-out), número de huéspedes y cálculo automático de tarifas y descuentos.
*   **Pago Simulado:** Flujo de checkout interactivo para registrar tarjetas de crédito enmascaradas de forma segura.
*   **Historial de Reservas:** Los usuarios pueden registrarse, iniciar sesión y ver su historial personal de reservas en tiempo real.

### 🛡️ Panel de Administración (`admin.html`)
*   **Control del Inventario:** Gestión directa del stock de habitaciones (capacidad, disponibilidad y precios).
*   **Gestión de Transacciones:** Visualización completa de todas las reservas registradas en el sistema.
*   **Estado de Reservas:** Permite actualizar fechas de reservas existentes o cancelarlas directamente, devolviendo la disponibilidad al stock de habitaciones.

---

## 🛠️ Tecnologías Utilizadas

*   **Frontend:** HTML5, CSS3 (Variables CSS, Flexbox, CSS Grid), Vanilla Javascript (ES6+).
*   **Backend:** Node.js, Express, CORS.
*   **Conectividad de Base de Datos:** `mssql` (driver oficial de Microsoft SQL Server), `dotenv` para la configuración segura del entorno.

---

## 📁 Estructura del Proyecto

```text
├── assets/                 # Imágenes y recursos multimedia del hotel
├── css/                    # Estilos CSS de la aplicación (diseño visual y responsivo)
├── js/                     # Lógica de cliente y conector de API
│   ├── store.js            # Módulo de conexión e interacción con la API
│   ├── main.js             # Interactividad de la página de reservas
│   └── admin.js            # Lógica del panel de administración
├── backend/                # Servidor API de Node.js
│   ├── server.js           # Archivo de inicio del servidor y endpoints Express
│   ├── package.json        # Dependencias del backend (Express, mssql, dotenv)
│   ├── .env.example        # Plantilla de variables de entorno para producción
│   └── .env                # Configuración de variables locales (No subir a Git)
├── database/               # Scripts y esquemas de base de datos
│   └── schema.sql          # Estructura e inserciones iniciales para SQL Server
├── index.html              # Vista principal para clientes
└── admin.html              # Vista del panel administrativo
```

---

## 💻 Configuración y Ejecución Local

Sigue estos pasos para levantar el proyecto en tu entorno de desarrollo local:

### 1. Requisitos Previos
*   Tener instalado [Node.js](https://nodejs.org/) (versión LTS recomendada).
*   Tener instalado y configurado **Microsoft SQL Server** (localmente o en Azure) junto con **SQL Server Management Studio (SSMS)**.

### 2. Preparación de la Base de Datos
1. Abre tu gestor de base de datos (SSMS) y crea una base de datos llamada `HotelBookingDB`.
2. Abre el archivo [database/schema.sql](file:///c:/Users/Milo/OneDrive/Escritorio/hotel_booking_project-main/hotel_booking_project/database/schema.sql) y ejecuta el script completo para crear las tablas (`Rooms`, `Users`, `Reservations`) y rellenar las habitaciones de muestra.

### 3. Configuración del Servidor
1. Dirígete a la carpeta `backend`:
   ```bash
   cd backend
   ```
2. Instala las dependencias del proyecto:
   ```bash
   npm install
   ```
3. Crea tu archivo de configuración `.env` duplicando la plantilla:
   *   Si usas **Autenticación integrada de Windows** con tu SQL Server Express local, tu archivo `backend/.env` debe verse así:
       ```ini
       PORT=5000
       NODE_ENV=development
       DB_CONNECTION_STRING=Driver={ODBC Driver 18 for SQL Server};Server=.\\SQLEXPRESS;Database=HotelBookingDB;Trusted_Connection=yes;TrustServerCertificate=yes;
       USE_LOCAL_WINDOWS_AUTH=true
       ```
   *   Si usas **Autenticación por Usuario y Contraseña** (SQL Server Authentication), configura tu archivo `.env` de esta manera:
       ```ini
       PORT=5000
       NODE_ENV=development
       DB_SERVER=localhost
       DB_DATABASE=HotelBookingDB
       DB_USER=tu_usuario
       DB_PASSWORD=tu_contraseña
       DB_PORT=1433
       DB_ENCRYPT=false
       ```

### 4. Iniciar la Aplicación
1. Inicia el servidor del backend desde la carpeta `backend`:
   ```bash
   npm start
   ```
2. Abre tu navegador web e ingresa a:
   ```text
   http://localhost:5000
   ```
   *(El backend sirve automáticamente la interfaz web desde la raíz del proyecto).*

---

## ☁️ Opciones de Despliegue (Producción)

Este proyecto está estructurado con las mejores prácticas para facilitar su migración a producción en dos modalidades:

### Opción A: Microsoft Azure (Servicio en la Nube)
*   **Servidor:** Azure App Service (Configurando Node.js y enlazando este repositorio).
*   **Base de datos:** Azure SQL Database.
*   *Nota:* Recuerda establecer las variables de entorno (`DB_SERVER`, `DB_USER`, `DB_PASSWORD`, etc.) en el panel de configuración de tu App Service en Azure.

### Opción B: Servidor local / Raspberry Pi (Linux)
*   **Servidor:** Alojado localmente en una Raspberry Pi usando Node.js y un túnel seguro con **Cloudflare Tunnels** para que sea accesible públicamente por internet de manera gratuita.
*   **Base de datos:** Se puede migrar el esquema SQL de manera sencilla a **PostgreSQL** o **MariaDB** (los cuales corren de forma nativa y eficiente en el procesador ARM de la Raspberry Pi).
