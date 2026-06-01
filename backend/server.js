require('dotenv').config();
const express = require('express');
const cors = require('cors');

let sql;
try {
    // Si estamos en producción o no se solicita autenticación local Windows, usar mssql estándar
    if (process.env.NODE_ENV === 'production' || process.env.USE_LOCAL_WINDOWS_AUTH !== 'true') {
        sql = require('mssql');
    } else {
        sql = require('mssql/msnodesqlv8');
    }
} catch (e) {
    sql = require('mssql');
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const path = require('path');
app.use(express.static(path.join(__dirname, '..')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// SQL Server Config
let dbConfig;
if (process.env.DB_CONNECTION_STRING) {
    dbConfig = {
        connectionString: process.env.DB_CONNECTION_STRING
    };
} else {
    dbConfig = {
        server: process.env.DB_SERVER || 'localhost',
        database: process.env.DB_DATABASE || 'HotelBookingDB',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT) || 1433,
        options: {
            encrypt: process.env.DB_ENCRYPT === 'true',
            trustServerCertificate: true // Útil para local y deshabilitar verificación estricta de SSL
        }
    };
}

let dbPool;

async function connectDB() {
    try {
        dbPool = await sql.connect(dbConfig);
        console.log('Successfully connected to SQL Server.');
    } catch (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    }
}

// Function to start server with port fallback
async function startServer(port) {
    try {
        await app.listen(port, async () => {
            await connectDB();
            console.log(`Backend server running on http://localhost:${port}`);
        });
    } catch (err) {
        if (err.code === 'EADDRINUSE') {
            console.warn(`Port ${port} already in use, trying ${port + 1}`);
            await startServer(port + 1);
        } else {
            console.error('Failed to start server:', err);
        }
    }
}

// --- ENDPOINTS ---

// 1. Obtener todas las habitaciones
app.get('/api/rooms', async (req, res) => {
    try {
        const result = await dbPool.request().query('SELECT * FROM Rooms');
        // Parsear la columna 'images' de string JSON a array de JS
        const rooms = result.recordset.map(room => {
            try {
                room.images = JSON.parse(room.images);
            } catch (e) {
                room.images = [];
            }
            return room;
        });
        res.json(rooms);
    } catch (err) {
        console.error('Error fetching rooms:', err);
        res.status(500).json({ error: 'Error al obtener habitaciones' });
    }
});

// 2. Registrar un usuario
app.post('/api/users/register', async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    
    if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ success: false, message: 'Todos los campos son requeridos' });
    }

    try {
        // Verificar si el usuario ya existe
        const checkUser = await dbPool.request()
            .input('email', sql.NVarChar(150), email)
            .query('SELECT email FROM Users WHERE email = @email');

        if (checkUser.recordset.length > 0) {
            return res.json({ success: false, message: 'El correo ya está en uso. Por favor, inicia sesión.' });
        }

        // Insertar usuario
        await dbPool.request()
            .input('firstName', sql.NVarChar(100), firstName)
            .input('lastName', sql.NVarChar(100), lastName)
            .input('email', sql.NVarChar(150), email)
            .input('password', sql.NVarChar(100), password)
            .query('INSERT INTO Users (email, firstName, lastName, password) VALUES (@email, @firstName, @lastName, @password)');

        res.json({ success: true });
    } catch (err) {
        console.error('Error registering user:', err);
        res.status(500).json({ success: false, message: 'Error en el servidor al registrar usuario' });
    }
});

// 3. Iniciar sesión
app.post('/api/users/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Correo y contraseña requeridos' });
    }

    try {
        const result = await dbPool.request()
            .input('email', sql.NVarChar(150), email)
            .input('password', sql.NVarChar(100), password)
            .query('SELECT email, firstName, lastName, card FROM Users WHERE email = @email AND password = @password');

        if (result.recordset.length > 0) {
            const user = result.recordset[0];
            try {
                if (user.card) {
                    user.card = JSON.parse(user.card);
                }
            } catch (e) {
                // Mantener como string si no se puede parsear
            }
            res.json({ success: true, user });
        } else {
            res.json({ success: false, message: 'Correo o contraseña incorrectos.' });
        }
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ success: false, message: 'Error en el servidor al iniciar sesión' });
    }
});

// 4. Guardar tarjeta de crédito enmascarada del usuario
app.post('/api/users/card', async (req, res) => {
    const { email, cardInfo } = req.body;

    if (!email || !cardInfo) {
        return res.status(400).json({ success: false, message: 'Datos incompletos' });
    }

    try {
        const cardStr = typeof cardInfo === 'object' ? JSON.stringify(cardInfo) : cardInfo;

        await dbPool.request()
            .input('email', sql.NVarChar(150), email)
            .input('card', sql.NVarChar(sql.MAX), cardStr)
            .query('UPDATE Users SET card = @card WHERE email = @email');

        res.json({ success: true });
    } catch (err) {
        console.error('Error saving user card:', err);
        res.status(500).json({ success: false, message: 'Error al guardar tarjeta' });
    }
});

// 5. Obtener todas las reservas (para panel admin)
app.get('/api/reservations', async (req, res) => {
    try {
        const result = await dbPool.request().query('SELECT * FROM Reservations');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching all reservations:', err);
        res.status(500).json({ error: 'Error al obtener todas las reservas' });
    }
});

// 6. Obtener reservas de un usuario específico
app.get('/api/reservations/user/:email', async (req, res) => {
    const { email } = req.params;
    try {
        const result = await dbPool.request()
            .input('email', sql.NVarChar(150), email)
            .query('SELECT * FROM Reservations WHERE userEmail = @email');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching user reservations:', err);
        res.status(500).json({ error: 'Error al obtener reservas del usuario' });
    }
});

// 7. Crear una reserva (usa Transacción SQL para asegurar consistencia de disponibilidad)
app.post('/api/reservations', async (req, res) => {
    const { userEmail, clientName, roomId, roomName, checkIn, checkOut, guests, totalPrice, cardName, cardNumber } = req.body;
    // Accept either userEmail (if provided) or clientName as identifier
    const identifier = userEmail || clientName;
    if (!identifier || !roomId || !roomName || !checkIn || !checkOut || !totalPrice) {
        return res.status(400).json({ success: false, message: 'Datos de la reserva incompletos' });
    }

    const transaction = new sql.Transaction(dbPool);
    try {
        await transaction.begin();

        // 1. Verificar disponibilidad de la habitación
        const roomCheck = await transaction.request()
            .input('roomId', sql.Int, roomId)
            .query('SELECT available FROM Rooms WHERE id = @roomId');

        if (roomCheck.recordset.length === 0) {
            await transaction.rollback();
            return res.json({ success: false, message: 'La habitación no existe.' });
        }

        const available = roomCheck.recordset[0].available;
        if (available <= 0) {
            await transaction.rollback();
            return res.json({ success: false, message: 'No hay disponibilidad para esta habitación.' });
        }

        // 2. Generar ID único de la reserva (RESxxxxxx)
        const resId = 'RES' + Date.now().toString().slice(-6);

        // 3. Crear la reserva
        await transaction.request()
            .input('id', sql.NVarChar(50), resId)
            .input('userEmail', sql.NVarChar(150), userEmail)
            .input('roomId', sql.Int, roomId)
            .input('roomName', sql.NVarChar(100), roomName)
            .input('checkIn', sql.Date, checkIn)
            .input('checkOut', sql.Date, checkOut)
            .input('guests', sql.Int, guests || 1)
            .input('totalPrice', sql.Decimal(10, 2), totalPrice)
            .query(`INSERT INTO Reservations (id, userEmail, roomId, roomName, checkIn, checkOut, guests, totalPrice) 
                    VALUES (@id, @userEmail, @roomId, @roomName, @checkIn, @checkOut, @guests, @totalPrice)`);

        // 4. Reducir disponibilidad en 1
        await transaction.request()
            .input('roomId', sql.Int, roomId)
            .query('UPDATE Rooms SET available = available - 1 WHERE id = @roomId');

        await transaction.commit();
        res.json({ success: true, id: resId });
    } catch (err) {
        console.error('Error creating reservation:', err);
        try {
            await transaction.rollback();
        } catch (e) {
            console.error('Error rolling back transaction:', e);
        }
        res.status(500).json({ success: false, message: 'Error en el servidor al registrar reserva' });
    }
});

// 8. Cancelar / Eliminar una reserva (usa Transacción para restaurar disponibilidad)
app.delete('/api/reservations/:id', async (req, res) => {
    const { id } = req.params;

    const transaction = new sql.Transaction(dbPool);
    try {
        await transaction.begin();

        // 1. Obtener la reserva para conocer el roomId
        const resCheck = await transaction.request()
            .input('id', sql.NVarChar(50), id)
            .query('SELECT roomId FROM Reservations WHERE id = @id');

        if (resCheck.recordset.length === 0) {
            await transaction.rollback();
            return res.json({ success: false, message: 'La reserva no existe.' });
        }

        const roomId = resCheck.recordset[0].roomId;

        // 2. Eliminar la reserva
        await transaction.request()
            .input('id', sql.NVarChar(50), id)
            .query('DELETE FROM Reservations WHERE id = @id');

        // 3. Devolver disponibilidad (+1)
        await transaction.request()
            .input('roomId', sql.Int, roomId)
            .query('UPDATE Rooms SET available = available + 1 WHERE id = @roomId');

        await transaction.commit();
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting reservation:', err);
        try {
            await transaction.rollback();
        } catch (e) {
            console.error('Error rolling back transaction:', e);
        }
        res.status(500).json({ success: false, message: 'Error en el servidor al cancelar reserva' });
    }
});

// 9. Actualizar datos de una habitación (desde admin)
app.put('/api/rooms/:id', async (req, res) => {
    const { id } = req.params;
    const { name, price, discount, capacity, available, description } = req.body;

    try {
        await dbPool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar(100), name)
            .input('price', sql.Decimal(10, 2), price)
            .input('discount', sql.Decimal(10, 2), discount)
            .input('capacity', sql.Int, capacity)
            .input('available', sql.Int, available)
            .input('description', sql.NVarChar(sql.MAX), description)
            .query(`UPDATE Rooms SET 
                    name = @name, 
                    price = @price, 
                    discount = @discount, 
                    capacity = @capacity, 
                    available = @available, 
                    description = @description 
                    WHERE id = @id`);

        res.json({ success: true });
    } catch (err) {
        console.error('Error updating room:', err);
        res.status(500).json({ success: false, message: 'Error al actualizar habitación' });
    }
});

// 10. Actualizar datos de una reserva (desde admin)
app.put('/api/reservations/:id', async (req, res) => {
    const { id } = req.params;
    const { checkIn, checkOut, status } = req.body;

    try {
        const currentRes = await dbPool.request()
            .input('id', sql.NVarChar(50), id)
            .query('SELECT checkIn, checkOut, status FROM Reservations WHERE id = @id');

        if (currentRes.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Reserva no encontrada' });
        }

        const current = currentRes.recordset[0];
        const newCheckIn = checkIn || current.checkIn;
        const newCheckOut = checkOut || current.checkOut;
        const newStatus = status || current.status;

        await dbPool.request()
            .input('id', sql.NVarChar(50), id)
            .input('checkIn', sql.Date, newCheckIn)
            .input('checkOut', sql.Date, newCheckOut)
            .input('status', sql.NVarChar(50), newStatus)
            .query(`UPDATE Reservations SET 
                    checkIn = @checkIn, 
                    checkOut = @checkOut, 
                    status = @status 
                    WHERE id = @id`);

        res.json({ success: true });
    } catch (err) {
        console.error('Error updating reservation:', err);
        res.status(500).json({ success: false, message: 'Error al actualizar la reserva' });
    }
});

// Start Server
app.listen(PORT, async () => {
    await connectDB();
    console.log(`Backend server running on http://localhost:${PORT}`);
});
