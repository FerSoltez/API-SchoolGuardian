// Ejemplo de cliente WebSocket para conectar con la API
// Incluir en tu HTML: <script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>

class SchoolGuardianWebSocket {
  constructor(serverUrl, token) {
    this.serverUrl = serverUrl;
    this.token = token;
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    try {
      console.log('🔌 Conectando a WebSocket...', this.serverUrl);
      
      this.socket = io(this.serverUrl, {
        auth: {
          token: this.token
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        maxReconnectionAttempts: this.maxReconnectAttempts
      });

      this.setupEventListeners();
      
    } catch (error) {
      console.error('❌ Error al conectar WebSocket:', error);
    }
  }

  setupEventListeners() {
    // Conexión exitosa
    this.socket.on('connect', () => {
      console.log('✅ Conectado a WebSocket');
      this.reconnectAttempts = 0;
    });

    // Confirmación del servidor
    this.socket.on('connection-confirmed', (data) => {
      console.log('🎉 Conexión confirmada:', data);
    });

    // Eventos de asistencia
    this.socket.on('new-ping', (data) => {
      console.log('📍 Nuevo ping recibido:', data);
      this.onNewPing(data);
    });

    this.socket.on('batch-pings', (data) => {
      console.log('📦 Lote de pings recibido:', data);
      this.onBatchPings(data);
    });

    this.socket.on('attendance-consolidated', (data) => {
      console.log('✅ Asistencia consolidada:', data);
      this.onAttendanceConsolidated(data);
    });

    this.socket.on('enrollment-updated', (data) => {
      console.log('👥 Inscripciones actualizadas:', data);
      this.onEnrollmentUpdate(data);
    });

    this.socket.on('refresh-pings', (data) => {
      console.log('🔄 Refrescar pings:', data);
      this.onRefreshPings(data);
    });

    // Eventos de sala
    this.socket.on('joined-class', (data) => {
      console.log('🏫 Unido a clase:', data);
    });

    this.socket.on('left-class', (data) => {
      console.log('👋 Salido de clase:', data);
    });

    // Manejo de errores
    this.socket.on('error', (error) => {
      console.error('❌ Error de WebSocket:', error);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión:', error);
      this.handleConnectionError(error);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Desconectado:', reason);
      this.handleDisconnection(reason);
    });

    // Eventos de reconexión
    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconectado después de', attemptNumber, 'intentos');
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Intento de reconexión', attemptNumber);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Falló la reconexión');
    });
  }

  handleConnectionError(error) {
    console.error('❌ Error de conexión WebSocket:', error);
    
    if (error.message.includes('timeout')) {
      console.log('⏰ Timeout de conexión - reintentando...');
    } else if (error.message.includes('token')) {
      console.error('🔒 Error de autenticación - token inválido');
      this.onAuthError();
    }
  }

  handleDisconnection(reason) {
    console.log('🔌 Desconectado por:', reason);
    
    if (reason === 'io server disconnect') {
      // El servidor desconectó al cliente, reconectar manualmente
      this.socket.connect();
    }
  }

  // Métodos para unirse/salir de clases
  joinClass(classId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join-class', { classId });
      console.log('🏫 Uniéndose a clase:', classId);
    } else {
      console.error('❌ No conectado a WebSocket');
    }
  }

  leaveClass(classId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave-class', { classId });
      console.log('👋 Saliendo de clase:', classId);
    }
  }

  // Callbacks que puedes personalizar
  onNewPing(data) {
    // Implementar lógica para mostrar nuevo ping en la UI
    console.log('📍 Implementar: mostrar nuevo ping', data);
  }

  onBatchPings(data) {
    // Implementar lógica para mostrar lote de pings en la UI
    console.log('📦 Implementar: mostrar lote de pings', data.pings);
  }

  onAttendanceConsolidated(data) {
    // Implementar lógica para mostrar asistencia consolidada
    console.log('✅ Implementar: asistencia consolidada', data);
  }

  onEnrollmentUpdate(data) {
    // Implementar lógica para actualizar lista de estudiantes
    console.log('👥 Implementar: actualizar inscripciones', data);
  }

  onRefreshPings(data) {
    // Implementar lógica para refrescar la lista de pings
    console.log('🔄 Implementar: refrescar pings', data);
  }

  onAuthError() {
    // Implementar lógica para manejar error de autenticación
    console.log('🔒 Implementar: manejar error de auth - redirigir a login');
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// Ejemplo de uso:
/*
const token = 'tu-jwt-token-aqui';
const serverUrl = 'https://api-schoolguardian.onrender.com';

const wsClient = new SchoolGuardianWebSocket(serverUrl, token);
wsClient.connect();

// Unirse a una clase
wsClient.joinClass(1);

// Personalizar callbacks
wsClient.onNewPing = (data) => {
  // Tu lógica para mostrar nuevos pings
  const pingElement = document.createElement('div');
  pingElement.innerHTML = `Nuevo ping: ${data.student_name} - ${data.status}`;
  document.getElementById('pings-container').appendChild(pingElement);
};
*/
