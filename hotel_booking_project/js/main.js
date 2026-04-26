document.addEventListener('DOMContentLoaded', () => {
    const roomsContainer = document.getElementById('rooms-container');
    const modal = document.getElementById('booking-modal');
    const closeBtn = document.querySelector('.close-btn');
    const bookingForm = document.getElementById('booking-form');
    const modalRoomName = document.getElementById('modal-room-name');
    const roomIdInput = document.getElementById('room-id');

    // Cargar habitaciones
    const rooms = getRooms();
    
    rooms.forEach(room => {
        const card = document.createElement('div');
        card.className = 'room-card';
        card.style.cursor = 'pointer';
        
        let priceHtml = `$${room.price}`;
        if(room.discount > 0) {
            let discounted = room.price - (room.price * (room.discount / 100));
            priceHtml = `<span style="text-decoration:line-through; color:#ef4444; font-size:16px;">$${room.price}</span> $${discounted.toFixed(2)}`;
        }

        card.innerHTML = `
            <img src="${room.image}" alt="${room.name}">
            <div class="room-info">
                <h3>${room.name}</h3>
                <p class="room-price">${priceHtml} <span style="font-size: 12px; color: #64748b;">/noche</span></p>
                <p class="room-meta">${room.description.substring(0,60)}...</p>
                <p class="room-meta" style="color: ${room.available > 0 ? '#10b981' : '#ef4444'}">${room.available} disponibles</p>
                <button class="cta-button" style="width: 100%;" ${room.available <= 0 ? 'disabled' : ''} onclick="event.stopPropagation(); openDetailsModal(${room.id})">
                    ${room.available > 0 ? 'Ver Detalles' : 'Agotada'}
                </button>
            </div>
        `;
        card.onclick = () => openDetailsModal(room.id);
        roomsContainer.appendChild(card);
    });

    // Modales
    const detailsModal = document.getElementById('room-details-modal');
    const closeBtns = document.querySelectorAll('.close-btn');

    window.openDetailsModal = function(id) {
        const room = getRooms().find(r => r.id == id);
        if(!room) return;
        
        document.getElementById('detail-room-name').textContent = room.name;
        document.getElementById('detail-room-desc').textContent = room.description;
        document.getElementById('detail-available').textContent = room.available + " disponibles";
        document.getElementById('detail-capacity').textContent = "Capacidad: " + room.capacity + " personas";
        
        const mainImg = document.getElementById('main-detail-img');
        const thumbnailsContainer = document.getElementById('thumbnails-container');
        
        mainImg.src = room.images && room.images.length > 0 ? room.images[0] : room.image;
        thumbnailsContainer.innerHTML = '';
        
        if (room.images) {
            room.images.forEach((imgSrc, index) => {
                let img = document.createElement('img');
                img.src = imgSrc;
                if(index === 0) img.classList.add('active');
                img.onclick = function() {
                    mainImg.src = imgSrc;
                    Array.from(thumbnailsContainer.children).forEach(c => c.classList.remove('active'));
                    img.classList.add('active');
                };
                thumbnailsContainer.appendChild(img);
            });
        }

        let finalPrice = room.price;
        const priceLabel = document.getElementById('detail-room-price');
        const oldPriceLabel = document.getElementById('detail-room-original-price');
        
        if (room.discount > 0) {
            finalPrice = room.price - (room.price * (room.discount / 100));
            oldPriceLabel.textContent = `$${room.price}`;
            oldPriceLabel.style.display = 'inline-block';
        } else {
            oldPriceLabel.style.display = 'none';
        }
        priceLabel.textContent = `$${finalPrice.toFixed(2)}`;

        const bookBtn = document.getElementById('detail-book-btn');
        bookBtn.onclick = function() {
            detailsModal.style.display = 'none';
            openModal(room.id, room.name, finalPrice);
        };
        bookBtn.disabled = room.available <= 0;
        bookBtn.textContent = room.available > 0 ? 'Proceder a Reserva' : 'Agotada';

        detailsModal.style.display = 'block';
    }

    window.openModal = function(id, name, bookedPrice) {
        roomIdInput.value = id;
        // Almacenar temporalmente el precio final en un atributo o variable
        modalRoomName.textContent = name;
        bookingForm.dataset.bookedPrice = bookedPrice; 
        modal.style.display = 'block';
    }

    closeBtns.forEach(btn => {
        btn.onclick = function() {
            modal.style.display = 'none';
            detailsModal.style.display = 'none';
        }
    });

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        } else if (event.target == detailsModal) {
            detailsModal.style.display = 'none';
        } else if (event.target == document.getElementById('payment-modal')) {
            document.getElementById('payment-modal').style.display = 'none';
        }
    }

    const paymentModal = document.getElementById('payment-modal');
    const paymentForm = document.getElementById('payment-form');

    // Formulario de Reserva
    bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const clientName = document.getElementById('client-name').value;
        const checkIn = document.getElementById('check-in').value;
        const checkOut = document.getElementById('check-out').value;
        const rId = document.getElementById('room-id').value;

        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        
        // Validar que checkout sea despues de checkin
        if(checkOutDate <= checkInDate){
            alert('La fecha de salida debe ser posterior a la de llegada.');
            return;
        }

        const timeDiff = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
        const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        const pricePerNight = parseFloat(bookingForm.dataset.bookedPrice || getRooms().find(r => r.id == rId).price);
        const totalAmount = diffDays * pricePerNight;

        // Pasar al modal de pagos
        modal.style.display = 'none';
        
        document.getElementById('pay-room-id').value = rId;
        document.getElementById('pay-client-name').value = clientName;
        document.getElementById('pay-check-in').value = checkIn;
        document.getElementById('pay-check-out').value = checkOut;
        document.getElementById('pay-total-amount').value = totalAmount;

        document.getElementById('payment-nights').textContent = diffDays;
        document.getElementById('payment-total').textContent = `$${totalAmount.toFixed(2)}`;

        paymentModal.style.display = 'block';
    });

    // Formulario de Pago
    paymentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const rId = document.getElementById('pay-room-id').value;
        const clientName = document.getElementById('pay-client-name').value;
        const checkIn = document.getElementById('pay-check-in').value;
        const checkOut = document.getElementById('pay-check-out').value;
        const totalAmount = parseFloat(document.getElementById('pay-total-amount').value);

        const cardName = document.getElementById('card-name').value;
        const cardNumber = document.getElementById('card-number').value;

        const room = getRooms().find(r => r.id == rId);

        addReservation({
            roomId: rId,
            roomName: room.name,
            clientName,
            checkIn,
            checkOut,
            totalPrice: totalAmount,
            cardName: cardName,
            cardNumber: cardNumber
        });

        alert('¡Pago exitoso! Reserva confirmada correctamente.');
        paymentModal.style.display = 'none';
        window.location.reload(); 
    });
});
