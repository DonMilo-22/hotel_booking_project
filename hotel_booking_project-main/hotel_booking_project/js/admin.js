document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');

    // Comprobar sesion
    if (sessionStorage.getItem('admin_logged_in') === 'true') {
        showDashboard();
    }

    // Auth simple
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;

        if (user === 'admin' && pass === 'admin123') {
            sessionStorage.setItem('admin_logged_in', 'true');
            document.getElementById('login-error').style.display = 'none';
            showDashboard();
        } else {
            document.getElementById('login-error').style.display = 'block';
        }
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('admin_logged_in');
        dashboardSection.style.display = 'none';
        loginSection.style.display = 'flex';
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    });

    function showDashboard() {
        loginSection.style.display = 'none';
        dashboardSection.style.display = 'block';
        loadDashboardData();
    }

    function loadDashboardData() {
        const rooms = getRooms();
        const reservations = getReservations();

        // Stats
        let totalRooms = rooms.reduce((acc, current) => acc + current.available, 0);
        document.getElementById('stat-total-rooms').textContent = totalRooms;
        document.getElementById('stat-total-reservations').textContent = reservations.length;
        
        let revenue = reservations.reduce((acc, current) => acc + current.totalPrice, 0);
        document.getElementById('stat-revenue').textContent = `$${revenue}`;

        // Llenar tabla de reservas
        const resBody = document.getElementById('reservations-body');
        resBody.innerHTML = '';
        if (reservations.length === 0) {
            resBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No hay reservas todavía</td></tr>';
        } else {
            reservations.reverse().forEach(res => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${res.id}</td>
                    <td>${res.clientName}</td>
                    <td>${res.roomName}</td>
                    <td>${res.checkIn}</td>
                    <td>${res.checkOut}</td>
                    <td style="color:#10b981; font-weight:bold;">$${res.totalPrice ? parseFloat(res.totalPrice).toFixed(2) : '0.00'}</td>
                    <td>
                        <span style="font-size:12px; color:#64748b; display:block;">${res.cardName ? res.cardName : 'Tarjeta no registrada'}</span>
                        <span style="font-family:monospace; color:var(--gold);">**** ${res.cardNumber ? res.cardNumber.toString().slice(-4) : '0000'}</span>
                    </td>
                    <td>
                        <button onclick="adminEditRes('${res.id}')" style="background:transparent; border:none; color:var(--gold); cursor:pointer; margin-right: 10px;">Editar</button>
                        <button onclick="downloadPDF('${res.id}')" style="background:#0284c7; border:none; color:white; cursor:pointer; padding: 4px 8px; border-radius: 3px; font-size: 12px;">PDF</button>
                    </td>
                `;
                resBody.appendChild(tr);
            });
        }

        // Llenar tabla de habitaciones
        const roomsBody = document.getElementById('rooms-body');
        roomsBody.innerHTML = '';
        rooms.forEach(room => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${room.name}</td>
                <td style="color:var(--gold)">$${room.price}</td>
                <td style="color:${room.discount > 0 ? '#10b981' : '#64748b'}">${room.discount || 0}%</td>
                <td>
                    <span style="display:inline-block; padding: 2px 8px; border-radius: 10px; background: ${room.available > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; color: ${room.available > 0 ? '#10b981' : '#ef4444'};">
                        ${room.available}
                    </span>
                </td>
                <td><button onclick="adminEditRoom(${room.id})" style="background:transparent; border:none; color:var(--gold); cursor:pointer;">Editar</button></td>
            `;
            roomsBody.appendChild(tr);
        });
    }

    // Modal Edit Room
    const editRoomModal = document.getElementById('edit-room-modal');
    window.adminEditRoom = function(roomId) {
        const room = getRooms().find(r => r.id == roomId);
        if(!room) return;
        document.getElementById('edit-room-id').value = room.id;
        document.getElementById('admin-room-name').textContent = room.name;
        document.getElementById('edit-room-price').value = room.price;
        document.getElementById('edit-room-discount').value = room.discount || 0;
        document.getElementById('edit-room-available').value = room.available;
        editRoomModal.style.display = 'block';
    }

    document.getElementById('edit-room-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const roomId = document.getElementById('edit-room-id').value;
        const price = parseFloat(document.getElementById('edit-room-price').value);
        const discount = parseFloat(document.getElementById('edit-room-discount').value);
        const available = parseInt(document.getElementById('edit-room-available').value);
        
        updateRoom(roomId, { price, discount, available });
        alert("Habitación actualizada.");
        closeAdminModals();
        loadDashboardData();
    });

    // Modal Edit Reservation
    const editResModal = document.getElementById('edit-res-modal');
    window.adminEditRes = function(resId) {
        const res = getReservations().find(r => r.id == resId);
        if(!res) return;
        document.getElementById('edit-res-id-val').value = res.id;
        document.getElementById('admin-res-id').textContent = res.id;
        document.getElementById('edit-res-in').value = res.checkIn;
        document.getElementById('edit-res-out').value = res.checkOut;
        editResModal.style.display = 'block';
    }

    document.getElementById('edit-res-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const resId = document.getElementById('edit-res-id-val').value;
        const checkIn = document.getElementById('edit-res-in').value;
        const checkOut = document.getElementById('edit-res-out').value;
        
        if(new Date(checkOut) <= new Date(checkIn)){
            alert('La fecha de salida debe ser posterior a la de llegada.');
            return;
        }

        updateReservation(resId, { checkIn, checkOut });
        alert("Reserva actualizada.");
        closeAdminModals();
        loadDashboardData();
    });

    window.adminDeleteRes = function() {
        const resId = document.getElementById('edit-res-id-val').value;
        if(confirm("¿Seguro que deseas eliminar esta reserva y restaurar la disponibilidad de la habitación?")) {
            deleteReservation(resId);
            alert("Reserva eliminada.");
            closeAdminModals();
            loadDashboardData();
        }
    }

    window.closeAdminModals = function() {
        editRoomModal.style.display = 'none';
        editResModal.style.display = 'none';
    }

    window.addEventListener('click', (e) => {
        if(e.target == editRoomModal) editRoomModal.style.display = 'none';
        if(e.target == editResModal) editResModal.style.display = 'none';
    });

    // PDF Generation Function
    window.downloadPDF = function(resId) {
        const reservations = getReservations();
        const res = reservations.find(r => r.id === resId);
        if (!res) return;

        // Calcular dias y precio por noche (aprox)
        const checkInDate = new Date(res.checkIn);
        const checkOutDate = new Date(res.checkOut);
        const timeDiff = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
        const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) || 1;
        
        const pricePerNight = res.totalPrice / diffDays;
        const subtotal = res.totalPrice / 1.16; // Asumiendo IVA 16% incluido en el total
        const tax = res.totalPrice - subtotal;

        // Formatear fechas a un formato más legible
        const formatDate = (dateStr) => {
            const parts = dateStr.split('-');
            if(parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
            return dateStr;
        };

        // Poblar el template
        document.getElementById('inv-checkin').textContent = formatDate(res.checkIn);
        document.getElementById('inv-checkout').textContent = formatDate(res.checkOut);
        document.getElementById('inv-guests').textContent = "Según habitación";
        document.getElementById('inv-room').textContent = res.roomName;
        
        document.getElementById('inv-id').textContent = res.id;
        const today = new Date();
        document.getElementById('inv-date').textContent = `${today.getDate().toString().padStart(2,'0')}/${(today.getMonth()+1).toString().padStart(2,'0')}/${today.getFullYear()}`;
        
        document.getElementById('inv-client-name').textContent = res.clientName;
        document.getElementById('inv-client-email').textContent = res.userEmail || "No registrado";

        document.getElementById('inv-nights').textContent = diffDays;
        document.getElementById('inv-price-per-night').textContent = `$${pricePerNight.toFixed(2)}`;
        document.getElementById('inv-subtotal1').textContent = `$${res.totalPrice.toFixed(2)}`;
        document.getElementById('inv-subtotal2').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('inv-tax').textContent = `$${tax.toFixed(2)}`;
        document.getElementById('inv-total').textContent = `$${res.totalPrice.toFixed(2)}`;

        // Mostrar temporalmente y exportar
        const element = document.getElementById('invoice-content');
        const opt = {
            margin:       0,
            filename:     `Reserva_${res.id}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        // Hacemos que el template sea visible solo para html2pdf
        document.getElementById('invoice-template').style.display = 'block';
        
        html2pdf().set(opt).from(element).save().then(() => {
            // Volver a ocultar
            document.getElementById('invoice-template').style.display = 'none';
        });
    }
});
