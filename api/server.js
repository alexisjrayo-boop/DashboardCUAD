// ============================================
// API Backend para Dashboard CDR Telmex (Updated SMTP Config)
// ============================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const { initDB } = require('./src/config/db');
const { startScheduler, checkAndRunInitialFetch } = require('./src/services/schedulerService');
const cdrRoutes = require('./src/routes/cdrRoutes');
const authRoutes = require('./src/routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de Seguridad
app.use(helmet({
    contentSecurityPolicy: false, // Deshabilitar si causa problemas con el frontend en dev
    crossOriginEmbedderPolicy: false
}));
app.use(hpp());

// Rate Limiting (Protección contra fuerza bruta y DDoS)
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 500, // Máximo 500 peticiones por ventana
    message: { error: 'Demasiadas peticiones desde esta IP, por favor intente más tarde.' }
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 50, // Máximo 50 intentos por hora
    message: { error: 'Demasiados intentos de acceso, por favor intente en una hora.' }
});

// Aplicar limitadores
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);

// Configuración de CORS
const corsOptions = {
    origin: '*', // En producción, cambiar por el dominio específico del cliente
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middleware Base
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Soporte para imágenes Base64 grandes
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api', cdrRoutes);

// ============================================
// INICIAR SERVIDOR
// ============================================

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error(`[Error] ${err.message}`);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Error interno del servidor'
            : err.message
    });
});

// Inicializar BD y luego arrancar servidor
initDB().then(() => {
    startScheduler();
    checkAndRunInitialFetch();

    app.listen(PORT, () => {
        console.log('='.repeat(50));
        console.log(`✓ API CDR Telmex + MySQL iniciada en puerto ${PORT}`);
        console.log(`✓ Ambiente: ${process.env.NODE_ENV || 'development'}`);
        console.log('='.repeat(50));
    });
}).catch(err => {
    console.error('CRITICAL: Failed to initialize DB:', err);
    process.exit(1);
});
