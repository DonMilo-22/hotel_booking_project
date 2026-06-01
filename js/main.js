document.addEventListener('DOMContentLoaded', () => {
    // Helper to remove diacritics from strings
    const removeAccents = (str) => str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : str;
    const roomsContainer = document.getElementById('rooms-container');
    const modal = document.getElementById('booking-modal');
    const closeBtn = document.querySelector('.close-btn');
    const bookingForm = document.getElementById('booking-form');
    const modalRoomName = document.getElementById('modal-room-name');
    const roomIdInput = document.getElementById('room-id');

    // --- Authentication UI Setup ---
    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');
    const profileModal = document.getElementById('profile-modal');
    const authLinks = document.getElementById('auth-links');
    const userLinks = document.getElementById('user-links');
    const clientNameInput = document.getElementById('client-name');

    function updateNavbar() {
        const user = getCurrentUser();
        if (user) {
            authLinks.style.display = 'none';
            userLinks.style.display = 'inline-block';
            document.getElementById('nav-profile-btn').textContent = `Hola, ${user.firstName}`;
        } else {
            authLinks.style.display = 'inline-block';
            userLinks.style.display = 'none';
        }
    }
    updateNavbar();

    document.getElementById('nav-login-btn').onclick = (e) => { e.preventDefault(); loginModal.style.display = 'block'; };
    document.getElementById('nav-register-btn').onclick = (e) => { e.preventDefault(); registerModal.style.display = 'block'; };
    document.getElementById('nav-profile-btn').onclick = (e) => { e.preventDefault(); openProfileModal(); };
    document.getElementById('nav-logout-btn').onclick = (e) => {
        e.preventDefault();
        logoutUser();
        updateNavbar();
        window.location.reload();
    };

    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fname = document.getElementById('reg-name').value;
        const lname = document.getElementById('reg-lastname').value;
        const email = document.getElementById('reg-email').value;
        const pwd = document.getElementById('reg-password').value;

        const result = await registerUser(fname, lname, email, pwd);
        if (result.success) {
            alert('Cuenta creada exitosamente. Ahora puedes iniciar sesión.');
            registerModal.style.display = 'none';
            loginModal.style.display = 'block';
        } else {
            alert(result.message);
        }
    });

    document.getElementById('user-login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pwd = document.getElementById('login-password').value;

        const result = await loginUser(email, pwd);
        if (result.success) {
            loginModal.style.display = 'none';
            updateNavbar();
            window.location.reload(); // Recargar para actualizar disponibilidad
        } else {
            alert(result.message);
        }
    });

    async function openProfileModal() {
        const user = getCurrentUser();
        if (!user) return;
        document.getElementById('profile-name').textContent = `${user.firstName} ${user.lastName}`;
        document.getElementById('profile-email').textContent = user.email;

        const tbody = document.getElementById('profile-reservations-body');
        tbody.innerHTML = '';
        
        // Petición asíncrona al backend
        const userRes = await getUserReservations(user.email);

        if (userRes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="padding: 10px;">No tienes reservas aún.</td></tr>';
        } else {
            userRes.forEach(res => {
                const formattedCheckIn = new Date(res.checkIn).toISOString().split('T')[0];
                const formattedCheckOut = new Date(res.checkOut).toISOString().split('T')[0];
                tbody.innerHTML += `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 10px;">${res.id}</td>
                        <td style="padding: 10px;">${removeAccents(res.roomName)}</td>
                        <td style="padding: 10px;">${formattedCheckIn}</td>
                        <td style="padding: 10px;">${formattedCheckOut}</td>
                        <td style="padding: 10px;">$${parseFloat(res.totalPrice).toFixed(2)}</td>
                        <td style="padding: 10px; display: flex; gap: 5px;">
                            <button onclick="downloadPDF('${res.id}')" style="background: #0284c7; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Descargar PDF</button>
                            <button onclick="cancelReservation('${res.id}')" style="background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Cancelar</button>
                        </td>
                    </tr>
                `;
            });
        }

        const savedCardContainer = document.getElementById('saved-card-container');

        if (user.card) {
            savedCardContainer.style.display = 'block';
            document.getElementById('saved-card-last4').textContent = user.card.number.slice(-4);
            document.getElementById('saved-card-name').textContent = user.card.name;
            document.getElementById('save-card-title').textContent = 'Actualizar Tarjeta de Débito/Crédito';
        } else {
            savedCardContainer.style.display = 'none';
            document.getElementById('save-card-title').textContent = 'Agregar Tarjeta de Débito/Crédito';
        }

        profileModal.style.display = 'block';
    }

    // Registrar función para cancelar reserva desde el perfil
    window.cancelReservation = async function(resId) {
        if (confirm('¿Estás seguro de que deseas cancelar esta reserva?')) {
            const success = await deleteReservation(resId);
            if (success) {
                alert('Reserva cancelada exitosamente.');
                openProfileModal(); // Refrescar modal de perfil
            } else {
                alert('No se pudo cancelar la reserva.');
            }
        }
    }

    document.getElementById('save-card-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = getCurrentUser();
        if (!user) return;

        const cardInfo = {
            name: document.getElementById('prof-card-name').value,
            number: document.getElementById('prof-card-number').value,
            expiry: document.getElementById('prof-card-expiry').value,
            cvv: document.getElementById('prof-card-cvv').value
        };

        if (await saveUserCard(user.email, cardInfo)) {
            alert('Tarjeta guardada exitosamente.');
            document.getElementById('save-card-form').reset();
            // Actualizar la variable local 'user' para reflejar la tarjeta agregada
            user.card = cardInfo;
            localStorage.setItem('hotel_current_user', JSON.stringify(user));
            openProfileModal(); // Refresh
        } else {
            alert('Error al guardar la tarjeta.');
        }
    });

    // Cargar habitaciones desde la API
    async function loadRooms() {
        roomsContainer.innerHTML = '<p style="text-align: center; width: 100%;">Cargando habitaciones...</p>';
        const rooms = await getRooms();
        roomsContainer.innerHTML = '';

        if (rooms.length === 0) {
            roomsContainer.innerHTML = '<p style="text-align: center; width: 100%;">No hay habitaciones registradas.</p>';
            return;
        }

        rooms.forEach(room => {
            const card = document.createElement('div');
            card.className = 'room-card';
            card.style.cursor = 'pointer';

            let priceHtml = `$${parseFloat(room.price).toFixed(2)}`;
            if (room.discount > 0) {
                let discounted = room.price - (room.price * (room.discount / 100));
                priceHtml = `<span style="text-decoration:line-through; color:#ef4444; font-size:16px;">$${parseFloat(room.price).toFixed(2)}</span> $${discounted.toFixed(2)}`;
            }

            card.innerHTML = `
                <img src="${room.image}" alt="${room.name}">
                <div class="room-info">
                    <h3>${removeAccents(room.name)}</h3>
                    <p class="room-price">${priceHtml} <span style="font-size: 12px; color: #64748b;">/noche</span></p>
                    <p class="room-meta">${removeAccents(room.description.substring(0, 60))}...</p>
                    <p class="room-meta" style="color: ${room.available > 0 ? '#10b981' : '#ef4444'}">${room.available} disponibles</p>
                    <button class="cta-button" style="width: 100%;" ${room.available <= 0 ? 'disabled' : ''} onclick="event.stopPropagation(); openDetailsModal(${room.id})">
                        ${room.available > 0 ? 'Ver Detalles' : 'Agotada'}
                    </button>
                </div>
            `;
            card.onclick = () => openDetailsModal(room.id);
            roomsContainer.appendChild(card);
        });
    }
    loadRooms();

    // Modales
    const detailsModal = document.getElementById('room-details-modal');
    const closeBtns = document.querySelectorAll('.close-btn');

    window.openDetailsModal = async function (id) {
        const rooms = await getRooms();
        const room = rooms.find(r => r.id == id);
        if (!room) return;

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
                if (index === 0) img.classList.add('active');
                img.onclick = function () {
                    mainImg.src = imgSrc;
                    Array.from(thumbnailsContainer.children).forEach(c => c.classList.remove('active'));
                    img.classList.add('active');
                };
                thumbnailsContainer.appendChild(img);
            });
        }

        let finalPrice = parseFloat(room.price);
        const priceLabel = document.getElementById('detail-room-price');
        const oldPriceLabel = document.getElementById('detail-room-original-price');

        if (room.discount > 0) {
            finalPrice = room.price - (room.price * (room.discount / 100));
            oldPriceLabel.textContent = `$${parseFloat(room.price).toFixed(2)}`;
            oldPriceLabel.style.display = 'inline-block';
        } else {
            oldPriceLabel.style.display = 'none';
        }
        priceLabel.textContent = `$${finalPrice.toFixed(2)}`;

        const bookBtn = document.getElementById('detail-book-btn');
        bookBtn.onclick = function () {
            const user = getCurrentUser();
            if (!user) {
                alert('Debes iniciar sesión primero para poder rentar una habitación.');
                detailsModal.style.display = 'none';
                loginModal.style.display = 'block';
                return;
            }

            clientNameInput.value = `${user.firstName} ${user.lastName}`;

            detailsModal.style.display = 'none';
            openModal(room.id, room.name, finalPrice);
        };
        bookBtn.disabled = room.available <= 0;
        bookBtn.textContent = room.available > 0 ? 'Proceder a Reserva' : 'Agotada';

        detailsModal.style.display = 'block';
    }

    window.openModal = function (id, name, bookedPrice) {
        roomIdInput.value = id;
        modalRoomName.textContent = name;
        bookingForm.dataset.bookedPrice = bookedPrice;
        modal.style.display = 'block';
    }

    closeBtns.forEach(btn => {
        btn.onclick = function () {
            modal.style.display = 'none';
            detailsModal.style.display = 'none';
            if (loginModal) loginModal.style.display = 'none';
            if (registerModal) registerModal.style.display = 'none';
            if (profileModal) profileModal.style.display = 'none';
        }
    });

    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        } else if (event.target == detailsModal) {
            detailsModal.style.display = 'none';
        } else if (event.target == document.getElementById('payment-modal')) {
            document.getElementById('payment-modal').style.display = 'none';
        } else if (event.target == loginModal) {
            loginModal.style.display = 'none';
        } else if (event.target == registerModal) {
            registerModal.style.display = 'none';
        } else if (event.target == profileModal) {
            profileModal.style.display = 'none';
        }
    }

    const paymentModal = document.getElementById('payment-modal');
    const paymentForm = document.getElementById('payment-form');

    // Formulario de Reserva
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const clientName = document.getElementById('client-name').value;
        const checkIn = document.getElementById('check-in').value;
        const checkOut = document.getElementById('check-out').value;
        const rId = document.getElementById('room-id').value;

        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);

        // Validar que checkout sea despues de checkin
        if (checkOutDate <= checkInDate) {
            alert('La fecha de salida debe ser posterior a la de llegada.');
            return;
        }

        const timeDiff = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
        const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));

        const rooms = await getRooms();
        const selectedRoom = rooms.find(r => r.id == rId);
        const pricePerNight = parseFloat(bookingForm.dataset.bookedPrice || selectedRoom.price);
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

        // Autofill payment form if user has a saved card
        const user = getCurrentUser();
        if (user && user.card) {
            document.getElementById('card-name').value = user.card.name;
            document.getElementById('card-number').value = user.card.number;
            document.getElementById('card-expiry').value = user.card.expiry;
            document.getElementById('card-cvv').value = user.card.cvv;
        } else {
            document.getElementById('card-name').value = '';
            document.getElementById('card-number').value = '';
            document.getElementById('card-expiry').value = '';
            document.getElementById('card-cvv').value = '';
        }

        paymentModal.style.display = 'block';
    });

    // Formulario de Pago (Confirmación de Reserva)
    paymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const rId = document.getElementById('pay-room-id').value;
        const clientName = document.getElementById('pay-client-name').value;
        const checkIn = document.getElementById('pay-check-in').value;
        const checkOut = document.getElementById('pay-check-out').value;
        const totalAmount = parseFloat(document.getElementById('pay-total-amount').value);

        const cardName = document.getElementById('card-name').value;
        const cardNumber = document.getElementById('card-number').value;

        const rooms = await getRooms();
        const room = rooms.find(r => r.id == rId);

        const user = getCurrentUser();
        const reservationPayload = {
            roomId: rId,
            roomName: room.name,
            // Prefer email if logged in, else client name
            userEmail: user ? user.email : undefined,
            clientName: user ? undefined : clientName,
            checkIn,
            checkOut,
            guests: 1,
            totalPrice: totalAmount,
            cardName,
            cardNumber
        };
        const result = await addReservation(reservationPayload);

        if (result.success) {
            alert('¡Pago exitoso! Reserva confirmada correctamente.');
            paymentModal.style.display = 'none';
            window.location.reload();
        } else {
            alert('Error al procesar reserva: ' + result.message);
        }
    });

    // PDF Generation Function
    window.downloadPDF = async function(resId) {
        const user = getCurrentUser();
        if (!user) return;
        
        const reservations = await getUserReservations(user.email);
        const res = reservations.find(r => r.id === resId);
        if (!res) return;

        // Calcular dias y precio por noche (aprox)
        const checkInDate = new Date(res.checkIn);
        const checkOutDate = new Date(res.checkOut);
        const timeDiff = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
        const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) || 1;
        
        const pricePerNight = parseFloat(res.totalPrice) / diffDays;
        const subtotal = parseFloat(res.totalPrice) / 1.16; // Asumiendo IVA 16% incluido en el total para que coincida con el diseno
        const tax = parseFloat(res.totalPrice) - subtotal;

        // Formatear fechas a un formato más legible (YYYY-MM-DD a DD/MM/YYYY)
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            // Si viene con timestamp, extraer solo la fecha
            const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
            const parts = cleanDate.split('-');
            if(parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
            return cleanDate;
        };

        // Poblar el template
        document.getElementById('inv-checkin').textContent = formatDate(res.checkIn);
        document.getElementById('inv-checkout').textContent = formatDate(res.checkOut);
        document.getElementById('inv-guests').textContent = "Según habitación";
        document.getElementById('inv-room').textContent = removeAccents(res.roomName);
        
        document.getElementById('inv-id').textContent = res.id;
        const today = new Date();
        document.getElementById('inv-date').textContent = `${today.getDate().toString().padStart(2,'0')}/${(today.getMonth()+1).toString().padStart(2,'0')}/${today.getFullYear()}`;
        
        document.getElementById('inv-client-name').textContent = `${user.firstName} ${user.lastName}`;
        document.getElementById('inv-client-email').textContent = user.email;

        document.getElementById('inv-nights').textContent = diffDays;
        document.getElementById('inv-price-per-night').textContent = `$${pricePerNight.toFixed(2)}`;
        document.getElementById('inv-subtotal1').textContent = `$${parseFloat(res.totalPrice).toFixed(2)}`;
        document.getElementById('inv-subtotal2').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('inv-tax').textContent = `$${tax.toFixed(2)}`;
        document.getElementById('inv-total').textContent = `$${parseFloat(res.totalPrice).toFixed(2)}`;

        // Mostrar temporalmente el template para html2pdf
        const element = document.getElementById('invoice-content');
        const opt = {
            margin: 0,
            filename: `Reserva_${res.id}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        // Hacemos que el template sea visible solo para html2pdf
        document.getElementById('invoice-template').style.display = 'block';
        html2pdf().set(opt).from(element).save().then(() => {
            // Volver a ocultar
            document.getElementById('invoice-template').style.display = 'none';
        });

    }
});