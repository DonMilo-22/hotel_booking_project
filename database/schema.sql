-- Script para crear la base de datos y tablas del Sistema de Reservas de Hotel

-- Crear la base de datos si no existe
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'HotelBookingDB')
BEGIN
    CREATE DATABASE HotelBookingDB;
END
GO

USE HotelBookingDB;
GO

-- Eliminar tablas existentes para reiniciar (en orden por claves foráneas)
IF OBJECT_ID('dbo.Reservations', 'U') IS NOT NULL
    DROP TABLE dbo.Reservations;

IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL
    DROP TABLE dbo.Users;

IF OBJECT_ID('dbo.Rooms', 'U') IS NOT NULL
    DROP TABLE dbo.Rooms;
GO

-- Crear Tabla de Habitaciones (Rooms)
CREATE TABLE dbo.Rooms (
    id INT PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    capacity INT NOT NULL,
    image NVARCHAR(255) NULL,
    images NVARCHAR(MAX) NULL, -- Guardará el array de imágenes como JSON: ["url1", "url2"]
    available INT NOT NULL,
    description NVARCHAR(MAX) NULL
);
GO

-- Crear Tabla de Usuarios (Users)
CREATE TABLE dbo.Users (
    email NVARCHAR(150) PRIMARY KEY,
    firstName NVARCHAR(100) NOT NULL,
    lastName NVARCHAR(100) NOT NULL,
    password NVARCHAR(100) NOT NULL, -- Almacenada en texto plano por requerimiento de prototipo escolar
    card NVARCHAR(MAX) NULL -- Guardará la tarjeta de crédito enmascarada
);
GO

-- Crear Tabla de Reservas (Reservations)
CREATE TABLE dbo.Reservations (
    id NVARCHAR(50) PRIMARY KEY,
    userEmail NVARCHAR(150) NOT NULL FOREIGN KEY REFERENCES dbo.Users(email) ON DELETE CASCADE,
    roomId INT NOT NULL FOREIGN KEY REFERENCES dbo.Rooms(id) ON DELETE CASCADE,
    roomName NVARCHAR(100) NOT NULL,
    checkIn DATE NOT NULL,
    checkOut DATE NOT NULL,
    guests INT NOT NULL,
    totalPrice DECIMAL(10, 2) NOT NULL,
    status NVARCHAR(50) NOT NULL DEFAULT 'Confirmada'
);
GO

-- Insertar las habitaciones iniciales
INSERT INTO dbo.Rooms (id, name, price, discount, capacity, image, images, available, description)
VALUES 
(
    1,
    N'Cuarto Basico',
    120.00,
    0.00,
    2,
    N'assets/Estandar 1.jpg',
    N'["assets/Estandar 1.jpg", "assets/Estandar 2.jpg", "assets/Estandar 3.jpg", "assets/Estandar 4.jpg", "assets/Estandar 5.jpg", "assets/Estandar 6.jpg"]',
    10,
    N'Cama Queen, WIFI, TV, Minibar, decoracion minimalista con calida iluminacion, grandes ventanales y excelentes acabados.'
),
(
    2, 
    N'Suite de Lujo', 
    250.00, 
    0.00, 
    3, 
    N'assets/Suite 1.jpg', 
    N'["assets/Suite 1.jpg", "assets/Suite 2.jpg", "assets/Suite 3.jpg", "assets/Suite 4.jpg", "assets/Suite 5.jpg"]', 
    5, 
    N'Cama King, impresionantes vistas a la ciudad.'
),
(
    3, 
    N'Atico Presidencial', 
    500.00, 
    0.00, 
    4, 
    N'assets/Presidencial 1.jpg', 
    N'["assets/Presidencial 1.jpg", "assets/Precidencial 2.jpg", "assets/Precidencial 3.jpg", "assets/Precidencial 4.jpg", "assets/Precidencial 5.jpg", "assets/Precidencial 6.jpg"]', 
    2, 
    N'Piso completo con servicio exclusivo 24/7. Piscina privada bajo techo.'
);
GO
