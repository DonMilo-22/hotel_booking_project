const INITIAL_ROOMS = [
    { id: 1, name: "Habitación Estándar", price: 120, discount: 0, capacity: 2, image: "assets/Estandar 1.jpg", images: ["assets/Estandar 1.jpg", "assets/Estandar 2.jpg", "assets/Estandar 3.jpg", "assets/Estandar 4.jpg", "assets/Estandar 5.jpg", "assets/Estandar 6.jpg"], available: 10, description: "Cama Queen, WIFI, TV, Minibar, decoración minimalista con cálida iluminación, grandes ventanales y excelentes acabados." },
    { id: 2, name: "Suite de Lujo", price: 250, discount: 0, capacity: 3, image: "assets/Suite 1.jpg", images: ["assets/Suite 1.jpg", "assets/Suite 2.jpg", "assets/Suite 3.jpg", "assets/Suite 4.jpg", "assets/Suite 5.jpg"], available: 5, description: "Cama King, impresionantes vistas a la ciudad." },
    { id: 3, name: "Ático Presidencial", price: 500, discount: 0, capacity: 4, image: "assets/Presidencial 1.jpg", images: ["assets/Presidencial 1.jpg", "assets/Precidencial 2.jpg", "assets/Precidencial 3.jpg", "assets/Precidencial 4.jpg", "assets/Precidencial 5.jpg", "assets/Precidencial 6.jpg"], available: 2, description: "Piso completo con servicio exclusivo 24/7. Piscina privada bajo techo." }
];

function initStore() {
    // Forzando actualización de la db local para integrar images
    if (!localStorage.getItem('hotel_rooms_v3')) {
        localStorage.clear();
        localStorage.setItem('hotel_rooms_v3', 'true');
        localStorage.setItem('hotel_rooms', JSON.stringify(INITIAL_ROOMS));
        localStorage.setItem('hotel_reservations', JSON.stringify([]));
    } else {
        if (!localStorage.getItem('hotel_rooms')) {
            localStorage.setItem('hotel_rooms', JSON.stringify(INITIAL_ROOMS));
        }
        if (!localStorage.getItem('hotel_reservations')) {
            localStorage.setItem('hotel_reservations', JSON.stringify([]));
        }
    }
}

function getRooms() {
    const data = localStorage.getItem('hotel_rooms');
    return data ? JSON.parse(data) : INITIAL_ROOMS;
}

function getReservations() {
    const data = localStorage.getItem('hotel_reservations');
    return data ? JSON.parse(data) : [];
}

function addReservation(reservation) {
    const reservations = getReservations();
    reservation.id = "RES" + Date.now().toString().slice(-6);
    reservations.push(reservation);
    localStorage.setItem('hotel_reservations', JSON.stringify(reservations));

    // Descontar disponibilidad
    const rooms = getRooms();
    const room = rooms.find(r => r.id == reservation.roomId);
    if(room && room.available > 0) {
        room.available -= 1;
        localStorage.setItem('hotel_rooms', JSON.stringify(rooms));
    }
}

function updateRoom(roomId, newData) {
    const rooms = getRooms();
    const index = rooms.findIndex(r => r.id == roomId);
    if (index !== -1) {
        rooms[index] = { ...rooms[index], ...newData };
        localStorage.setItem('hotel_rooms', JSON.stringify(rooms));
    }
}

function updateReservation(resId, newData) {
    const reservations = getReservations();
    const index = reservations.findIndex(r => r.id == resId);
    if (index !== -1) {
        reservations[index] = { ...reservations[index], ...newData };
        localStorage.setItem('hotel_reservations', JSON.stringify(reservations));
    }
}

function deleteReservation(resId) {
    let reservations = getReservations();
    const res = reservations.find(r => r.id == resId);
    if (res) {
        // Restaurar disponibilidad
        const rooms = getRooms();
        const room = rooms.find(r => r.id == res.roomId);
        if (room) {
            room.available += 1;
            localStorage.setItem('hotel_rooms', JSON.stringify(rooms));
        }
        
        reservations = reservations.filter(r => r.id != resId);
        localStorage.setItem('hotel_reservations', JSON.stringify(reservations));
    }
}

initStore();
