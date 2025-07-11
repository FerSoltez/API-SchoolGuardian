# School Guardian API

Una API REST para la gestión de usuarios, asistencia y administración escolar.

## Características

- **Autenticación JWT**: Sistema seguro de autenticación con tokens JWT
- **Verificación por correo**: Verificación automática de cuentas mediante correo electrónico
- **Gestión de usuarios**: CRUD completo para usuarios con diferentes roles
- **Login seguro para estudiantes**: Sistema de login usando UUID para estudiantes
- **Recuperación de contraseña**: Sistema de recuperación de contraseñas por correo
- **Middleware de autenticación**: Protección de rutas mediante middleware
- **Base de datos MySQL**: Integración con MySQL usando Sequelize ORM

## Tecnologías Utilizadas

- **Node.js** con **TypeScript**
- **Express.js** - Framework web
- **Sequelize** - ORM para MySQL
- **MySQL2** - Driver de base de datos
- **JWT** - JSON Web Tokens para autenticación
- **bcryptjs** - Hashing de contraseñas
- **Nodemailer** - Envío de correos electrónicos
- **UUID** - Generación de identificadores únicos
- **CORS** - Manejo de políticas de origen cruzado

## Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/tu-usuario/API-SchoolGuardian.git
   cd API-SchoolGuardian
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   
   Crear un archivo `.env` en la raíz del proyecto con las siguientes variables:
   ```env
   # Base de datos
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=tu_password
   DB_NAME=schoolguardian
   DB_PORT=3306

   # JWT
   JWT_SECRET=tu_jwt_secret_muy_seguro

   # Nodemailer (Gmail)
   EMAIL_USER=tu_email@gmail.com
   EMAIL_PASSWORD=tu_app_password_de_gmail

   # Puerto del servidor
   PORT=3002
   ```

4. **Compilar TypeScript**
   ```bash
   npm run build
   ```

5. **Ejecutar el servidor**
   ```bash
   npm start
   ```

## Estructura del Proyecto

```
API-SchoolGuardian/
├── src/
│   ├── config/
│   │   └── database.ts          # Configuración de la base de datos
│   ├── controllers/
│   │   ├── usersController.ts   # Controladores de usuarios
│   │   ├── attendanceController.ts
│   │   ├── classesController.ts
│   │   └── ...
│   ├── middleware/
│   │   ├── authMiddleware.ts    # Middleware de autenticación
│   │   └── roleMiddleware.ts    # Middleware de roles
│   ├── models/
│   │   ├── associations.ts      # Asociaciones entre modelos
│   │   ├── users.ts            # Modelo de usuarios
│   │   ├── attendance.ts
│   │   ├── classes.ts
│   │   └── ...
│   ├── routes/
│   │   ├── usersRoutes.ts      # Rutas de usuarios
│   │   └── ...
│   ├── utils/
│   │   └── emailTransporter.ts # Configuración de nodemailer
│   └── index.ts                # Archivo principal
├── public/
│   ├── verificarCuenta.html    # Página de verificación de cuenta
│   └── cambiarContrasena.html  # Página de cambio de contraseña
├── package.json
├── tsconfig.json
└── README.md
```

## Endpoints Principales

### Usuarios

#### Registro de Usuario
- **POST** `/api/users`
- **Body**: `{ name, email, password, role, phone }`
- **Respuesta**: Crea usuario y envía correo de verificación

#### Login de Usuario
- **POST** `/api/users/login`
- **Body**: 
  - Para administradores/profesores: `{ email, password }`
  - Para estudiantes: `{ email, password, user_uuid }`
- **Respuesta**: Token JWT y datos del usuario

#### Verificación de Cuenta
- **POST** `/api/users/verify-email`
- **Body**: `{ token }`
- **Respuesta**: Activa la cuenta del usuario

- **GET** `/api/users/verify-email?token=TOKEN`
- **Respuesta**: Activa la cuenta del usuario (método alternativo)

#### Cambio de Contraseña
- **POST** `/api/users/cambiarContrasena`
- **Body**: `{ token, newPassword }`
- **Respuesta**: Cambia la contraseña del usuario

#### Envío de Correo para Cambio de Contraseña
- **POST** `/api/users/enviarCorreoCambioContrasena`
- **Body**: `{ email }`
- **Respuesta**: Envía correo con enlace para cambiar contraseña

### Gestión de Usuarios (Requiere autenticación)

#### Obtener Todos los Usuarios
- **POST** `/api/users/get`
- **Headers**: `Authorization: Bearer TOKEN`

#### Obtener Usuario Específico
- **POST** `/api/users/detalle`
- **Headers**: `Authorization: Bearer TOKEN`

#### Actualizar Usuario
- **PATCH** `/api/users/:id`
- **Headers**: `Authorization: Bearer TOKEN`

#### Eliminar Usuario
- **DELETE** `/api/users/:id`
- **Headers**: `Authorization: Bearer TOKEN`

## Flujo de Verificación de Cuenta

1. **Registro**: El usuario se registra mediante POST `/api/users`
2. **Correo enviado**: Se envía un correo con un enlace de verificación
3. **Click en enlace**: El usuario hace click en el enlace del correo
4. **Verificación automática**: La página `verificarCuenta.html` se carga y verifica automáticamente la cuenta
5. **Redirección**: El usuario puede navegar al login o inicio

### Página de Verificación

La página `verificarCuenta.html` incluye:
- **Estados visuales**: Carga, éxito, error
- **Verificación automática**: Se ejecuta al cargar la página
- **Manejo de errores**: Diferentes mensajes según el tipo de error
- **Navegación**: Enlaces a login y página principal
- **Diseño responsive**: Compatible con dispositivos móviles

## Autenticación JWT

### Generar Token
```javascript
const token = jwt.sign(
  { id_user: user.id_user, email: user.email, role: user.role },
  JWT_SECRET,
  { expiresIn: '24h' }
);
```

### Verificar Token
```javascript
const decoded = jwt.verify(token, JWT_SECRET);
```

## Middleware de Autenticación

El middleware `authMiddleware.ts` protege las rutas que requieren autenticación:

```typescript
// Rutas protegidas
router.post("/users/detalle", authMiddleware, usersController.getUser);
router.patch("/users/:id", authMiddleware, usersController.partialUpdateUser);
router.delete("/users/:id", authMiddleware, usersController.deleteUser);
```

## Configuración de Correo

Para usar Gmail con nodemailer:

1. Activar la verificación en dos pasos en tu cuenta de Gmail
2. Generar una contraseña de aplicación
3. Usar la contraseña de aplicación en `EMAIL_PASSWORD`

## Modelos de Base de Datos

### Usuarios
```typescript
interface User {
  id_user: number;
  name: string;
  email: string;
  password: string;
  role: 'student' | 'teacher' | 'admin';
  phone?: string;
  user_uuid: string;
  attempts: number;
  verification: boolean;
  created_at: Date;
  updated_at: Date;
}
```

### Roles Disponibles
- **student**: Estudiante
- **teacher**: Profesor
- **admin**: Administrador

## Seguridad

- Passwords hasheadas con bcryptjs
- Tokens JWT con expiración
- Middleware de autenticación
- Validación de datos de entrada
- Control de intentos de login
- Verificación de correo obligatoria

## Desarrollo

### Scripts Disponibles
```bash
npm run dev        # Ejecutar en modo desarrollo
npm run build      # Compilar TypeScript
npm start          # Ejecutar servidor de producción
npm run lint       # Verificar código con ESLint
```

### Compilación
```bash
npm run build
```

### Modo Desarrollo
```bash
npm run dev
```

## Deployment

Este proyecto está configurado para ser desplegado en **Render** u otros servicios de hosting.

### Variables de Entorno en Producción
Asegúrate de configurar todas las variables de entorno en tu servicio de hosting:
- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`
- `EMAIL_USER`
- `EMAIL_PASSWORD`
- `PORT`

## Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo `LICENSE` para más detalles.

## Contacto

- **Equipo ORIZON**
- **GitHub**: [https://github.com/Orizon-team/SchoolGuardian](https://github.com/Orizon-team/SchoolGuardian)

---

**Nota**: Este proyecto forma parte del sistema SchoolGuardian desarrollado por el equipo ORIZON.
