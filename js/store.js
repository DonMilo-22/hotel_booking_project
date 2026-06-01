// --- Conector de la API del Hotel ---

const API_BASE_URL = '/api';

function initStore() {
    // Ya no inicializamos datos estáticos en localStorage puesto que residen en SQL Server.
    // Solo aseguramos que exista una sesión limpia si es necesario.
}

// --- Users ---
async function registerUser(firstName, lastName, email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName, lastName, email, password })
        });
        return await response.json();
    } catch (error) {
        console.error('Error registering user:', error);
        return { success: false, message: 'No se pudo conectar con el servidor.' };
    }
}

async function loginUser(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (data.success) {
            localStorage.setItem('hotel_current_user', JSON.stringify(data.user));
        }
        return data;
    } catch (error) {
        console.error('Error logging in:', error);
        return { success: false, message: 'No se pudo conectar con el servidor.' };
    }
}

function logoutUser() {
    localStorage.removeItem('hotel_current_user');
}

function getCurrentUser() {
    const data = localStorage.getItem('hotel_current_user');
    return data ? JSON.parse(data) : null;
}

async function saveUserCard(email, cardInfo) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/card`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, cardInfo })
        });
        const data = await response.json();
        if (data.success) {
            // Actualizar la sesión local del usuario
            const currentUser = getCurrentUser();
            if (currentUser && currentUser.email === email) {
                currentUser.card = cardInfo;
                localStorage.setItem('hotel_current_user', JSON.stringify(currentUser));
            }
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error saving user card:', error);
        return false;
    }
}

// --- Rooms and Reservations ---
async function getRooms() {
    try {
        const response = await fetch(`${API_BASE_URL}/rooms`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching rooms:', error);
        return [];
    }
}

async function getReservations() {
    try {
        const response = await fetch(`${API_BASE_URL}/reservations`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching reservations:', error);
        return [];
    }
}

async function getUserReservations(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/reservations/user/${email}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching user reservations:', error);
        return [];
    }
}

async function addReservation(reservation) {
    try {
        const currentUser = getCurrentUser();
        const userEmail = currentUser ? currentUser.email : null;
        const guests = reservation.guests || 1;
        const response = await fetch(`${API_BASE_URL}/reservations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userEmail,
                roomId: reservation.roomId,
                roomName: reservation.roomName,
                checkIn: reservation.checkIn,
                checkOut: reservation.checkOut,
                guests,
                totalPrice: reservation.totalPrice
            })
        });
        return await response.json();
    } catch (error) {
        console.error('Error adding reservation:', error);
        return { success: false, message: 'No se pudo conectar con el servidor.' };
    }
}

async function updateRoom(roomId, newData) {
    try {
        const rooms = await getRooms();
        const currentRoom = rooms.find(r => r.id == roomId);
        if (!currentRoom) return false;

        const updatedRoom = { ...currentRoom, ...newData };

        const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedRoom)
        });
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Error updating room:', error);
        return false;
    }
}

async function updateReservation(resId, newData) {
    try {
        const response = await fetch(`${API_BASE_URL}/reservations/${resId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newData)
        });
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Error updating reservation:', error);
        return false;
    }
}

async function deleteReservation(resId) {
    try {
        const response = await fetch(`${API_BASE_URL}/reservations/${resId}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Error deleting reservation:', error);
        return false;
    }
}

initStore();
