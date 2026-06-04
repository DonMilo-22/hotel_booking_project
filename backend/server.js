require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve Static Frontend Files
app.use(express.static(path.join(__dirname, '..')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// --- ENDPOINTS ---

// 1. Obtener todas las habitaciones
app.get('/api/rooms', async (req, res) => {
    try {
        const rooms = await db.getRooms();
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
        const exists = await db.checkUserExists(email);
        if (exists) {
            return res.json({ success: false, message: 'El correo ya está en uso. Por favor, inicia sesión.' });
        }

        await db.registerUser(firstName, lastName, email, password);
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
        const user = await db.loginUser(email, password);
        if (user) {
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
        await db.saveUserCard(email, cardInfo);
        res.json({ success: true });
    } catch (err) {
        console.error('Error saving user card:', err);
        res.status(500).json({ success: false, message: 'Error al guardar tarjeta' });
    }
});

// 5. Obtener todas las reservas (para panel admin)
app.get('/api/reservations', async (req, res) => {
    try {
        const reservations = await db.getReservations();
        res.json(reservations);
    } catch (err) {
        console.error('Error fetching all reservations:', err);
        res.status(500).json({ error: 'Error al obtener todas las reservas' });
    }
});

// 6. Obtener reservas de un usuario específico
app.get('/api/reservations/user/:email', async (req, res) => {
    const { email } = req.params;
    try {
        const reservations = await db.getUserReservations(email);
        res.json(reservations);
    } catch (err) {
        console.error('Error fetching user reservations:', err);
        res.status(500).json({ error: 'Error al obtener reservas del usuario' });
    }
});

// 7. Crear una reserva
app.post('/api/reservations', async (req, res) => {
    const { userEmail, clientName, roomId, roomName, checkIn, checkOut, guests, totalPrice } = req.body;
    
    try {
        const result = await db.createReservation({
            userEmail,
            clientName,
            roomId,
            roomName,
            checkIn,
            checkOut,
            guests,
            totalPrice
        });
        res.json(result);
    } catch (err) {
        console.error('Error creating reservation:', err);
        res.status(500).json({ success: false, message: 'Error en el servidor al registrar reserva' });
    }
});

// 8. Cancelar / Eliminar una reserva
app.delete('/api/reservations/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.deleteReservation(id);
        res.json(result);
    } catch (err) {
        console.error('Error deleting reservation:', err);
        res.status(500).json({ success: false, message: 'Error en el servidor al cancelar reserva' });
    }
});

// 9. Actualizar datos de una habitación (desde admin)
app.put('/api/rooms/:id', async (req, res) => {
    const { id } = req.params;
    const { name, price, discount, capacity, available, description } = req.body;

    try {
        await db.updateRoom(id, { name, price, discount, capacity, available, description });
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
        const success = await db.updateReservation(id, { checkIn, checkOut, status });
        if (success) {
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: 'Reserva no encontrada' });
        }
    } catch (err) {
        console.error('Error updating reservation:', err);
        res.status(500).json({ success: false, message: 'Error al actualizar la reserva' });
    }
});

// Start Server
app.listen(PORT, async () => {
    await db.connectDB();
    console.log(`Backend server running on http://localhost:${PORT}`);
});
