const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Configuración de la conexión
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'telmex_cdr',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Inicializar base de datos
async function initDB() {
    try {
        const connection = await pool.getConnection();
        console.log('✓ Conectado a MySQL');

        // Crear tabla si no existe
        // Estructura basada en el JSON proporcionado por el usuario
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS cdrs (
                cdr_id BIGINT PRIMARY KEY, -- Usamos cdr_id del JSON como Primary Key
                calldate DATETIME,
                clid VARCHAR(255),
                source VARCHAR(50),
                src VARCHAR(50),
                dst VARCHAR(50),
                destination VARCHAR(50),
                dcontext VARCHAR(50),
                channel VARCHAR(100),
                dstchannel VARCHAR(100),
                lastapp VARCHAR(50),
                lastdata VARCHAR(255),
                duration INT,
                billsec INT,
                disposition VARCHAR(50),
                amaflags INT,
                accountcode VARCHAR(50),
                auth_code VARCHAR(50),
                customer_code VARCHAR(50),
                pin_code VARCHAR(50),
                userfield VARCHAR(255),
                uniqueid VARCHAR(255),
                linkedid VARCHAR(255),
                sequence INT,
                peeraccount VARCHAR(50),
                calltype VARCHAR(50),
                recfile VARCHAR(255),
                recfile_cloud VARCHAR(255),
                charge DECIMAL(10, 5),
                chargebuy DECIMAL(10, 5),
                cleartext VARCHAR(50),
                unit VARCHAR(50),
                chargeunit VARCHAR(50),
                calldate_utc DATETIME,
                recorded BOOLEAN,
                destination_desc VARCHAR(100), -- Descripción basada en extensión
                
                raw_data JSON, -- Respaldo del registro original
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        await connection.query(createTableQuery);
        console.log('✓ Tabla cdrs verificada/creada con esquema actualizado');

        // Asegurar que la columna destination_desc existe (para migraciones)
        try {
            await connection.query(`ALTER TABLE cdrs ADD COLUMN destination_desc VARCHAR(100) AFTER recorded`);
        } catch (e) {
            // Ignorar error si la columna ya existe
            if (e.code !== 'ER_DUP_FIELDNAME') {
                console.warn('  Nota: ' + e.message);
            }
        }

        // Crear tabla de usuarios
        const createUsersTableQuery = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(255) NULL,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(100),
                profile_picture LONGTEXT,
                role VARCHAR(20) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await connection.query(createUsersTableQuery);
        console.log('✓ Tabla users verificada/creada');

        // Asegurar que las columnas name, profile_picture y email existen (para migraciones)
        try {
            await connection.query(`ALTER TABLE users ADD COLUMN email VARCHAR(255) AFTER username`);
        } catch (e) {
            if (e.code !== 'ER_DUP_FIELDNAME') console.warn('  Nota: ' + e.message);
        }
        try {
            await connection.query(`ALTER TABLE users ADD COLUMN name VARCHAR(100) AFTER password`);
        } catch (e) {
            if (e.code !== 'ER_DUP_FIELDNAME') console.warn('  Nota: ' + e.message);
        }
        try {
            await connection.query(`ALTER TABLE users ADD COLUMN profile_picture LONGTEXT AFTER name`);
        } catch (e) {
            // Si ya existe, nos aseguramos que sea LONGTEXT
            try {
                await connection.query(`ALTER TABLE users MODIFY COLUMN profile_picture LONGTEXT`);
            } catch (err) { }
            if (e.code !== 'ER_DUP_FIELDNAME') console.warn('  Nota: ' + e.message);
        }

        // Crear tabla de configuración de envío de reportes
        const createReportConfigsTableQuery = `
            CREATE TABLE IF NOT EXISTS email_report_configs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                recipient_email VARCHAR(255) NOT NULL,
                name VARCHAR(100) NULL,
                periodicity VARCHAR(20) DEFAULT 'weekly',
                line VARCHAR(50) DEFAULT 'all',
                last_sent TIMESTAMP NULL,
                last_sent_weekly TIMESTAMP NULL,
                last_sent_monthly TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await connection.query(createReportConfigsTableQuery);
        console.log('✓ Tabla email_report_configs verificada/creada');

        // Asegurar columnas para migraciones
        try {
            await connection.query(`ALTER TABLE email_report_configs ADD COLUMN name VARCHAR(100) NULL AFTER recipient_email`);
        } catch (e) {
            if (e.code !== 'ER_DUP_FIELDNAME') console.warn('  Nota: ' + e.message);
        }
        try {
            await connection.query(`ALTER TABLE email_report_configs ADD COLUMN last_sent_weekly TIMESTAMP NULL AFTER last_sent`);
        } catch (e) {
            if (e.code !== 'ER_DUP_FIELDNAME') console.warn('  Nota: ' + e.message);
        }
        try {
            await connection.query(`ALTER TABLE email_report_configs ADD COLUMN last_sent_monthly TIMESTAMP NULL AFTER last_sent_weekly`);
        } catch (e) {
            if (e.code !== 'ER_DUP_FIELDNAME') console.warn('  Nota: ' + e.message);
        }

        // Asegurar que el usuario administrador existe (resetear si es necesario)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);
        await connection.query(`
            INSERT INTO users (username, password, role, name) 
            VALUES ('admin', ?, 'admin', 'Sistemas')
            ON DUPLICATE KEY UPDATE password = VALUES(password), role = 'admin'
        `, [hashedPassword]);
        console.log('✓ Usuario administrador verificado/resetado: admin / admin123');

        // Create Indexes for performance (Standard MySQL does not support IF NOT EXISTS for CREATE INDEX)
        console.log('  Verificando índices de rendimiento...');
        const indexQueries = [
            { name: 'idx_calldate', sql: `CREATE INDEX idx_calldate ON cdrs(calldate)` },
            { name: 'idx_src', sql: `CREATE INDEX idx_src ON cdrs(src)` },
            { name: 'idx_destination', sql: `CREATE INDEX idx_destination ON cdrs(destination)` },
            { name: 'idx_disposition', sql: `CREATE INDEX idx_disposition ON cdrs(disposition)` },
            { name: 'idx_calltype', sql: `CREATE INDEX idx_calltype ON cdrs(calltype)` }
        ];

        for (const item of indexQueries) {
            try {
                await connection.query(item.sql);
            } catch (e) {
                // Ignore "Duplicate key name" error (1061)
                if (e.code === 'ER_DUP_KEYNAME') {
                    // Index already exists, normal
                } else {
                    console.warn(`  Nota: No se pudo crear el índice ${item.name}: ${e.message}`);
                }
            }
        }
        console.log('✓ Índices de rendimiento verificados');

        connection.release();
    } catch (error) {
        console.error('✗ Error conectando a MySQL:', error.message);
        console.error('  Asegúrate de configurar las variables de entorno en .env');
    }
}

module.exports = {
    pool,
    initDB
};
