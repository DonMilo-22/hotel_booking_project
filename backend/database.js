const { Pool } = require('pg');
require('dotenv').config();

// Determine if we should connect to PostgreSQL
const isPostgres = !!process.env.DATABASE_URL;

let sql;
let dbConfig;
let dbPool;
let pgPool;

if (isPostgres) {
    console.log("Database driver selected: PostgreSQL (Production/Render)");
    pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false // Required for hosted databases like Neon / Supabase
        }
    });
} else {
    console.log("Database driver selected: SQL Server (Local)");
    try {
        if (process.env.NODE_ENV === 'production' || process.env.USE_LOCAL_WINDOWS_AUTH !== 'true') {
            sql = require('mssql');
        } else {
            sql = require('mssql/msnodesqlv8');
        }
    } catch (e) {
        sql = require('mssql');
    }

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
                trustServerCertificate: true
            }
        };
    }
}

// PostgreSQL Automatic Schema Initializer
async function initializePgSchema(client) {
    try {
        // 1. Rooms Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS "Rooms" (
                "id" INT PRIMARY KEY,
                "name" VARCHAR(100) NOT NULL,
                "price" DECIMAL(10, 2) NOT NULL,
                "discount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
                "capacity" INT NOT NULL,
                "image" VARCHAR(255) NULL,
                "images" TEXT NULL,
                "available" INT NOT NULL,
                "description" TEXT NULL
            )
        `);

        // 2. Users Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS "Users" (
                "email" VARCHAR(150) PRIMARY KEY,
                "firstName" VARCHAR(100) NOT NULL,
                "lastName" VARCHAR(100) NOT NULL,
                "password" VARCHAR(100) NOT NULL,
                "card" TEXT NULL
            )
        `);

        // 3. Reservations Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS "Reservations" (
                "id" VARCHAR(50) PRIMARY KEY,
                "userEmail" VARCHAR(150) NOT NULL REFERENCES "Users"("email") ON DELETE CASCADE,
                "roomId" INT NOT NULL REFERENCES "Rooms"("id") ON DELETE CASCADE,
                "roomName" VARCHAR(100) NOT NULL,
                "checkIn" DATE NOT NULL,
                "checkOut" DATE NOT NULL,
                "guests" INT NOT NULL,
                "totalPrice" DECIMAL(10, 2) NOT NULL,
                "status" VARCHAR(50) NOT NULL DEFAULT 'Confirmada'
            )
        `);

        // 4. Seed Rooms if empty
        const roomCheck = await client.query('SELECT COUNT(*) FROM "Rooms"');
        if (parseInt(roomCheck.rows[0].count) === 0) {
            console.log("Seeding initial rooms into PostgreSQL...");
            await client.query(`
                INSERT INTO "Rooms" ("id", "name", "price", "discount", "capacity", "image", "images", "available", "description")
                VALUES 
                (
                    1,
                    'Cuarto Basico',
                    120.00,
                    0.00,
                    2,
                    'assets/Estandar 1.jpg',
                    '["assets/Estandar 1.jpg", "assets/Estandar 2.jpg", "assets/Estandar 3.jpg", "assets/Estandar 4.jpg", "assets/Estandar 5.jpg", "assets/Estandar 6.jpg"]',
                    10,
                    'Cama Queen, WIFI, TV, Minibar, decoracion minimalista con calida iluminacion, grandes ventanales y excelentes acabados.'
                ),
                (
                    2, 
                    'Suite de Lujo', 
                    250.00, 
                    0.00, 
                    3, 
                    'assets/Suite 1.jpg', 
                    '["assets/Suite 1.jpg", "assets/Suite 2.jpg", "assets/Suite 3.jpg", "assets/Suite 4.jpg", "assets/Suite 5.jpg"]', 
                    5, 
                    'Cama King, impresionantes vistas a la ciudad.'
                ),
                (
                    3, 
                    'Atico Presidencial', 
                    500.00, 
                    0.00, 
                    4, 
                    'assets/Presidencial 1.jpg', 
                    '["assets/Presidencial 1.jpg", "assets/Precidencial 2.jpg", "assets/Precidencial 3.jpg", "assets/Precidencial 4.jpg", "assets/Precidencial 5.jpg", "assets/Precidencial 6.jpg"]', 
                    2, 
                    'Piso completo con servicio exclusivo 24/7. Piscina privada bajo techo.'
                )
            `);
        }
    } catch (err) {
        console.error("Error initializing PostgreSQL schema:", err);
    }
}

async function connectDB() {
    if (isPostgres) {
        try {
            await pgPool.query('SELECT 1');
            console.log('Successfully connected to PostgreSQL.');
            const client = await pgPool.connect();
            try {
                await initializePgSchema(client);
            } finally {
                client.release();
            }
        } catch (err) {
            console.error('PostgreSQL connection failed:', err);
            process.exit(1);
        }
    } else {
        try {
            dbPool = await sql.connect(dbConfig);
            console.log('Successfully connected to SQL Server.');
        } catch (err) {
            console.error('Database connection failed:', err);
            process.exit(1);
        }
    }
}

// 1. Get Rooms
async function getRooms() {
    if (isPostgres) {
        const result = await pgPool.query('SELECT * FROM "Rooms" ORDER BY "id" ASC');
        return result.rows.map(room => {
            try {
                room.images = JSON.parse(room.images);
            } catch (e) {
                room.images = [];
            }
            // Parse decimal to float
            room.price = parseFloat(room.price);
            room.discount = parseFloat(room.discount);
            return room;
        });
    } else {
        const result = await dbPool.request().query('SELECT * FROM Rooms ORDER BY id ASC');
        return result.recordset.map(room => {
            try {
                room.images = JSON.parse(room.images);
            } catch (e) {
                room.images = [];
            }
            return room;
        });
    }
}

// 2. Check if user email exists
async function checkUserExists(email) {
    if (isPostgres) {
        const result = await pgPool.query('SELECT "email" FROM "Users" WHERE "email" = $1', [email]);
        return result.rows.length > 0;
    } else {
        const result = await dbPool.request()
            .input('email', sql.NVarChar(150), email)
            .query('SELECT email FROM Users WHERE email = @email');
        return result.recordset.length > 0;
    }
}

// 3. Register user
async function registerUser(firstName, lastName, email, password) {
    if (isPostgres) {
        await pgPool.query(
            'INSERT INTO "Users" ("email", "firstName", "lastName", "password") VALUES ($1, $2, $3, $4)',
            [email, firstName, lastName, password]
        );
    } else {
        await dbPool.request()
            .input('firstName', sql.NVarChar(100), firstName)
            .input('lastName', sql.NVarChar(100), lastName)
            .input('email', sql.NVarChar(150), email)
            .input('password', sql.NVarChar(100), password)
            .query('INSERT INTO Users (email, firstName, lastName, password) VALUES (@email, @firstName, @lastName, @password)');
    }
}

// 4. Login User
async function loginUser(email, password) {
    if (isPostgres) {
        const result = await pgPool.query(
            'SELECT "email", "firstName", "lastName", "card" FROM "Users" WHERE "email" = $1 AND "password" = $2',
            [email, password]
        );
        if (result.rows.length > 0) {
            const user = result.rows[0];
            try {
                if (user.card) {
                    user.card = JSON.parse(user.card);
                }
            } catch (e) {}
            return user;
        }
        return null;
    } else {
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
            } catch (e) {}
            return user;
        }
        return null;
    }
}

// 5. Save user card
async function saveUserCard(email, cardInfo) {
    const cardStr = typeof cardInfo === 'object' ? JSON.stringify(cardInfo) : cardInfo;
    if (isPostgres) {
        await pgPool.query('UPDATE "Users" SET "card" = $1 WHERE "email" = $2', [cardStr, email]);
    } else {
        await dbPool.request()
            .input('email', sql.NVarChar(150), email)
            .input('card', sql.NVarChar(sql.MAX), cardStr)
            .query('UPDATE Users SET card = @card WHERE email = @email');
    }
}

// 6. Get all reservations
async function getReservations() {
    if (isPostgres) {
        const result = await pgPool.query('SELECT * FROM "Reservations"');
        return result.rows.map(res => {
            res.totalPrice = parseFloat(res.totalPrice);
            return res;
        });
    } else {
        const result = await dbPool.request().query('SELECT * FROM Reservations');
        return result.recordset;
    }
}

// 7. Get user reservations
async function getUserReservations(email) {
    if (isPostgres) {
        const result = await pgPool.query('SELECT * FROM "Reservations" WHERE "userEmail" = $1', [email]);
        return result.rows.map(res => {
            res.totalPrice = parseFloat(res.totalPrice);
            return res;
        });
    } else {
        const result = await dbPool.request()
            .input('email', sql.NVarChar(150), email)
            .query('SELECT * FROM Reservations WHERE userEmail = @email');
        return result.recordset;
    }
}

// 8. Create reservation (transaction)
async function createReservation(resData) {
    const { userEmail, clientName, roomId, roomName, checkIn, checkOut, guests, totalPrice } = resData;
    const identifier = userEmail || clientName;
    if (!identifier || !roomId || !roomName || !checkIn || !checkOut || !totalPrice) {
        throw new Error('Datos de la reserva incompletos');
    }

    if (isPostgres) {
        const client = await pgPool.connect();
        try {
            await client.query('BEGIN');
            
            // A. Check room availability
            const roomCheck = await client.query('SELECT "available" FROM "Rooms" WHERE "id" = $1', [roomId]);
            if (roomCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return { success: false, message: 'La habitación no existe.' };
            }
            
            const available = parseInt(roomCheck.rows[0].available);
            if (available <= 0) {
                await client.query('ROLLBACK');
                return { success: false, message: 'No hay disponibilidad para esta habitación.' };
            }

            // B. Generate reservation ID
            const resId = 'RES' + Date.now().toString().slice(-6);

            // C. Create reservation (handle null userEmail if booked without login or as admin fallback)
            await client.query(
                `INSERT INTO "Reservations" ("id", "userEmail", "roomId", "roomName", "checkIn", "checkOut", "guests", "totalPrice") 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [resId, userEmail || null, roomId, roomName, checkIn, checkOut, guests || 1, totalPrice]
            );

            // D. Deduct availability
            await client.query('UPDATE "Rooms" SET "available" = "available" - 1 WHERE "id" = $1', [roomId]);

            await client.query('COMMIT');
            return { success: true, id: resId };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } else {
        const transaction = new sql.Transaction(dbPool);
        try {
            await transaction.begin();

            const roomCheck = await transaction.request()
                .input('roomId', sql.Int, roomId)
                .query('SELECT available FROM Rooms WHERE id = @roomId');

            if (roomCheck.recordset.length === 0) {
                await transaction.rollback();
                return { success: false, message: 'La habitación no existe.' };
            }

            const available = roomCheck.recordset[0].available;
            if (available <= 0) {
                await transaction.rollback();
                return { success: false, message: 'No hay disponibilidad para esta habitación.' };
            }

            const resId = 'RES' + Date.now().toString().slice(-6);

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

            await transaction.request()
                .input('roomId', sql.Int, roomId)
                .query('UPDATE Rooms SET available = available - 1 WHERE id = @roomId');

            await transaction.commit();
            return { success: true, id: resId };
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }
}

// 9. Cancel reservation (transaction)
async function deleteReservation(id) {
    if (isPostgres) {
        const client = await pgPool.connect();
        try {
            await client.query('BEGIN');

            const resCheck = await client.query('SELECT "roomId" FROM "Reservations" WHERE "id" = $1', [id]);
            if (resCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return { success: false, message: 'La reserva no existe.' };
            }

            const roomId = resCheck.rows[0].roomId;

            await client.query('DELETE FROM "Reservations" WHERE "id" = $1', [id]);
            await client.query('UPDATE "Rooms" SET "available" = "available" + 1 WHERE "id" = $1', [roomId]);

            await client.query('COMMIT');
            return { success: true };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } else {
        const transaction = new sql.Transaction(dbPool);
        try {
            await transaction.begin();

            const resCheck = await transaction.request()
                .input('id', sql.NVarChar(50), id)
                .query('SELECT roomId FROM Reservations WHERE id = @id');

            if (resCheck.recordset.length === 0) {
                await transaction.rollback();
                return { success: false, message: 'La reserva no existe.' };
            }

            const roomId = resCheck.recordset[0].roomId;

            await transaction.request()
                .input('id', sql.NVarChar(50), id)
                .query('DELETE FROM Reservations WHERE id = @id');

            await transaction.request()
                .input('roomId', sql.Int, roomId)
                .query('UPDATE Rooms SET available = available + 1 WHERE id = @roomId');

            await transaction.commit();
            return { success: true };
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }
}

// 10. Update room
async function updateRoom(id, roomData) {
    const { name, price, discount, capacity, available, description } = roomData;
    if (isPostgres) {
        await pgPool.query(
            `UPDATE "Rooms" SET 
             "name" = $1, "price" = $2, "discount" = $3, "capacity" = $4, "available" = $5, "description" = $6 
             WHERE "id" = $7`,
            [name, price, discount, capacity, available, description, id]
        );
    } else {
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
    }
}

// 11. Update reservation
async function updateReservation(id, resData) {
    const { checkIn, checkOut, status } = resData;
    if (isPostgres) {
        // First fetch current reservation
        const currentRes = await pgPool.query('SELECT "checkIn", "checkOut", "status" FROM "Reservations" WHERE "id" = $1', [id]);
        if (currentRes.rows.length === 0) {
            return false;
        }
        const current = currentRes.rows[0];
        const newCheckIn = checkIn || current.checkIn;
        const newCheckOut = checkOut || current.checkOut;
        const newStatus = status || current.status;

        await pgPool.query(
            `UPDATE "Reservations" SET "checkIn" = $1, "checkOut" = $2, "status" = $3 WHERE "id" = $4`,
            [newCheckIn, newCheckOut, newStatus, id]
        );
        return true;
    } else {
        const currentRes = await dbPool.request()
            .input('id', sql.NVarChar(50), id)
            .query('SELECT checkIn, checkOut, status FROM Reservations WHERE id = @id');

        if (currentRes.recordset.length === 0) {
            return false;
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
        return true;
    }
}

module.exports = {
    connectDB,
    getRooms,
    checkUserExists,
    registerUser,
    loginUser,
    saveUserCard,
    getReservations,
    getUserReservations,
    createReservation,
    deleteReservation,
    updateRoom,
    updateReservation
};
