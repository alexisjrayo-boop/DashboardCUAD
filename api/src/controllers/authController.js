const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { pool } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'G4sm32025';

// Configuración del transportador SMTP (IONOS / GASME)
function getMailTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ionos.com',
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER || 'notificaciones.ti@grupogasme.com',
            pass: process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/^"|"$/g, '') : ''
        }
    });
}

// Plantilla HTML de correo corporativo para Activación / Restablecimiento
async function sendAuthEmail(user, token, req, type = 'invite') {
    const transporter = getMailTransporter();
    const fromAddress = process.env.SMTP_FROM || `"GASME CUAD Notificaciones" <${process.env.SMTP_USER || 'notificaciones.ti@grupogasme.com'}>`;
    
    // Extraer base URL del cliente
    const origin = req.headers.origin || req.headers.referer;
    let baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    if (origin) {
        try {
            const urlObj = new URL(origin);
            baseUrl = `${urlObj.protocol}//${urlObj.host}`;
        } catch (e) {}
    }

    const actionUrl = `${baseUrl}/set-password?token=${token}`;
    const isInvite = type === 'invite';
    const subject = isInvite
        ? 'Bienvenido a GASME CUAD — Activa tu cuenta y crea tu contraseña'
        : 'GASME CUAD — Restablecimiento de contraseña';

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 0; color: #1e293b; }
            .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
            .header { background: linear-gradient(135deg, #8E0022 0%, #C3002F 50%, #9C0026 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 1px; }
            .header p { margin: 6px 0 0; font-size: 11px; font-weight: bold; opacity: 0.85; text-transform: uppercase; letter-spacing: 2px; }
            .content { padding: 32px 28px; line-height: 1.6; }
            .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
            .button-wrapper { text-align: center; margin: 32px 0; }
            .btn { display: inline-block; background-color: #C3002F; color: #ffffff !important; padding: 14px 32px; border-radius: 12px; font-weight: 800; font-size: 14px; text-decoration: none; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 15px rgba(195,0,47,0.35); }
            .footer { background-color: #f8fafc; padding: 20px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
            .fallback-link { word-break: break-all; color: #C3002F; font-size: 12px; }
            .warning { background-color: #fff1f2; border: 1px solid #ffe4e6; color: #9f1239; padding: 12px 16px; border-radius: 8px; font-size: 12px; margin-top: 24px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>GASME CUAD</h1>
                <p>Inteligencia Operativa y Control</p>
            </div>
            <div class="content">
                <div class="greeting">Hola, ${user.name || 'Usuario'}</div>
                <p>
                    ${isInvite 
                        ? 'Se ha registrado tu cuenta en la plataforma <strong>GASME CUAD</strong>. Para comenzar a utilizar el panel analítico, por favor crea tu contraseña de acceso mediante el siguiente botón:'
                        : 'Hemos recibido una solicitud para restablecer tu contraseña de acceso a <strong>GASME CUAD</strong>. Haz clic en el botón a continuación para definir una nueva contraseña:'
                    }
                </p>
                <div class="button-wrapper">
                    <a href="${actionUrl}" target="_blank" class="btn">
                        ${isInvite ? 'Crear mi Contraseña' : 'Restablecer Contraseña'}
                    </a>
                </div>
                <p style="font-size: 13px; color: #64748b;">
                    Si el botón no funciona, copia y pega el siguiente enlace en tu navegador web:
                </p>
                <p><a href="${actionUrl}" class="fallback-link">${actionUrl}</a></p>
                <div class="warning">
                    ⏱️ Este enlace es personal y tiene una validez de <strong>24 horas</strong> por motivos de seguridad. Si no solicitaste este acceso, puedes ignorar este mensaje.
                </div>
            </div>
            <div class="footer">
                &copy; ${new Date().getFullYear()} Grupo GASME. Todos los derechos reservados.
            </div>
        </div>
    </body>
    </html>
    `;

    return transporter.sendMail({
        from: fromAddress,
        to: user.email,
        subject: subject,
        html: htmlContent
    });
}

// 1. INICIAR SESIÓN (Por correo electrónico o username para admin)
exports.login = async (req, res) => {
    const { email, username, password } = req.body;
    const loginIdentifier = (email || username || '').trim();

    if (!loginIdentifier || !password) {
        return res.status(400).json({ error: 'El correo electrónico y la contraseña son obligatorios' });
    }

    try {
        // Buscar por email o por username
        const [users] = await pool.query(
            'SELECT * FROM users WHERE email = ? OR username = ?',
            [loginIdentifier, loginIdentifier]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const user = users[0];

        // Verificar si la cuenta ya tiene contraseña configurada
        if (!user.password) {
            return res.status(400).json({ 
                error: 'Tu cuenta aún no ha sido activada. Por favor revisa el correo que te enviamos para crear tu contraseña o solicita un reenvío.' 
            });
        }

        // Verificar contraseña
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        // Generar JWT
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                profile_picture: user.profile_picture,
                role: user.role,
                receive_reports: user.receive_reports === 1
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                profile_picture: user.profile_picture,
                role: user.role,
                receive_reports: user.receive_reports === 1
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor al iniciar sesión' });
    }
};

// 2. DAR DE ALTA / INVITAR USUARIO (Genera token y envía correo)
exports.register = async (req, res) => {
    const { name, email, role = 'user', receive_reports = false } = req.body;

    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'El correo electrónico es obligatorio y debe ser válido' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || cleanEmail.split('@')[0]).trim();
    const autoUsername = cleanEmail.split('@')[0];

    try {
        // Verificar si el correo ya existe
        const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);
        if (existing.length > 0) {
            const user = existing[0];
            // Si el usuario existe pero no ha establecido contraseña, reenviar enlace
            if (!user.password) {
                const token = crypto.randomBytes(32).toString('hex');
                const expires = new Date(Date.now() + 24 * 3600 * 1000);

                await pool.query(
                    'UPDATE users SET name = ?, role = ?, receive_reports = ?, reset_token = ?, reset_token_expires = ? WHERE id = ?',
                    [cleanName, role, receive_reports ? 1 : 0, token, expires, user.id]
                );

                await sendAuthEmail(user, token, req, 'invite');

                return res.status(200).json({
                    success: true,
                    message: `Se ha reenviado el correo de invitación a ${cleanEmail}`
                });
            } else {
                return res.status(400).json({ error: 'El correo electrónico ya se encuentra registrado' });
            }
        }

        // Generar token criptográfico para activación
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 24 * 3600 * 1000); // 24 Horas

        // Insertar usuario sin contraseña (pendiente de activación)
        const [result] = await pool.query(
            'INSERT INTO users (username, email, password, name, role, receive_reports, reset_token, reset_token_expires) VALUES (?, ?, NULL, ?, ?, ?, ?, ?)',
            [autoUsername, cleanEmail, cleanName, role, receive_reports ? 1 : 0, token, expires]
        );

        // Si se marcó recibir reportes, sincronizar con email_report_configs
        if (receive_reports) {
            const [existingConfig] = await pool.query('SELECT id FROM email_report_configs WHERE recipient_email = ?', [cleanEmail]);
            if (existingConfig.length === 0) {
                await pool.query(
                    'INSERT INTO email_report_configs (recipient_name, recipient_email, periodicity, line, active, frequency, phone_lines, call_type, format) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [cleanName, cleanEmail, 'semanal', 'all', 1, 'semanal', 'all', '2', 'pdf']
                );
            }
        }

        // Enviar correo de invitación
        try {
            await sendAuthEmail({ name: cleanName, email: cleanEmail }, token, req, 'invite');
        } catch (mailErr) {
            console.error('Error enviando correo de invitación:', mailErr);
            // No fallamos la creación pero avisamos en el log
        }

        res.status(201).json({
            success: true,
            message: `Usuario creado exitosamente. Se ha enviado un correo a ${cleanEmail} para crear su contraseña.`,
            userId: result.insertId
        });
    } catch (error) {
        console.error('Error al registrar usuario:', error);
        res.status(500).json({ error: 'Error del servidor al dar de alta al usuario' });
    }
};

// 3. OLVIDÉ MI CONTRASEÑA (Solicitud pública desde pantalla de Login)
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'El correo electrónico es obligatorio' });
    }

    const cleanEmail = email.trim().toLowerCase();

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);
        if (users.length === 0) {
            // Por seguridad responder éxito genérico
            return res.json({ 
                success: true, 
                message: 'Si el correo está registrado en el sistema, recibirás un enlace de restablecimiento en breve.' 
            });
        }

        const user = users[0];
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 24 * 3600 * 1000);

        await pool.query(
            'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
            [token, expires, user.id]
        );

        await sendAuthEmail(user, token, req, 'reset');

        res.json({
            success: true,
            message: `Se ha enviado un correo a ${cleanEmail} con las instrucciones para restablecer tu contraseña.`
        });
    } catch (error) {
        console.error('Error en forgotPassword:', error);
        res.status(500).json({ error: 'Error al procesar la solicitud de recuperación' });
    }
};

// 4. CREAR / RESTABLECER CONTRASEÑA (Valida token y genera sesión automática)
exports.setPassword = async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
        return res.status(400).json({ error: 'El token y la nueva contraseña son obligatorios' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    try {
        // Validar token no expirado
        const [users] = await pool.query(
            'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
            [token]
        );

        if (users.length === 0) {
            return res.status(400).json({ 
                error: 'El enlace es inválido o ha expirado. Por favor solicita uno nuevo.' 
            });
        }

        const user = users[0];

        // Hashear nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Guardar contraseña y limpiar token
        await pool.query(
            'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
            [hashedPassword, user.id]
        );

        // Iniciar sesión inmediatamente (Generar JWT)
        const sessionToken = jwt.sign(
            {
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                profile_picture: user.profile_picture,
                role: user.role,
                receive_reports: user.receive_reports === 1
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Contraseña guardada exitosamente.',
            token: sessionToken,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                profile_picture: user.profile_picture,
                role: user.role,
                receive_reports: user.receive_reports === 1
            }
        });
    } catch (error) {
        console.error('Error en setPassword:', error);
        res.status(500).json({ error: 'Error del servidor al guardar la contraseña' });
    }
};

// 5. REENVIAR ENLACE DE RESTABLECIMIENTO (Desde panel de administración)
exports.resendResetLink = async (req, res) => {
    const { id } = req.params;

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = users[0];
        if (!user.email) {
            return res.status(400).json({ error: 'El usuario no tiene un correo electrónico registrado' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 24 * 3600 * 1000);

        await pool.query(
            'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
            [token, expires, user.id]
        );

        await sendAuthEmail(user, token, req, user.password ? 'reset' : 'invite');

        res.json({
            success: true,
            message: `Se ha enviado el enlace al correo ${user.email}`
        });
    } catch (error) {
        console.error('Error al reenviar enlace:', error);
        res.status(500).json({ error: 'Error al reenviar el correo de acceso' });
    }
};

// 6. OBTENER LISTA DE USUARIOS
exports.getUsers = async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, username, email, name, profile_picture, role, receive_reports, (password IS NOT NULL) as is_active, created_at FROM users ORDER BY created_at DESC'
        );
        res.json({ success: true, users });
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ error: 'Error del servidor al obtener la lista de usuarios' });
    }
};

// 7. ACTUALIZAR USUARIO
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { name, email, profile_picture, role, receive_reports } = req.body;

    try {
        const adminId = req.user.id;

        // Si es el admin maestro, no permitir cambio de rol por seguridad
        const [userToUpdate] = await pool.query('SELECT username, email FROM users WHERE id = ?', [id]);
        if (userToUpdate.length > 0 && userToUpdate[0].username === 'admin') {
            if (role && role !== 'admin') {
                return res.status(403).json({ error: 'No se puede degradar el rol del administrador maestro' });
            }
        }

        if (parseInt(id) === parseInt(adminId) && role === 'user') {
            return res.status(403).json({ error: 'No puedes quitarte tus propios privilegios de administrador' });
        }

        const cleanEmail = email ? email.trim().toLowerCase() : userToUpdate[0].email;

        // Actualizar usuario
        await pool.query(
            'UPDATE users SET name = ?, email = ?, profile_picture = ?, role = ?, receive_reports = ? WHERE id = ?',
            [name, cleanEmail, profile_picture || null, role || 'user', receive_reports ? 1 : 0, id]
        );

        // Sincronizar reportes si aplica
        if (receive_reports && cleanEmail) {
            const [existingConfig] = await pool.query('SELECT id FROM email_report_configs WHERE recipient_email = ?', [cleanEmail]);
            if (existingConfig.length === 0) {
                await pool.query(
                    'INSERT INTO email_report_configs (recipient_name, recipient_email, periodicity, line, active, frequency, phone_lines, call_type, format) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [name, cleanEmail, 'semanal', 'all', 1, 'semanal', 'all', '2', 'pdf']
                );
            }
        }

        res.json({ success: true, message: 'Usuario actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'El correo electrónico ya existe' });
        }
        res.status(500).json({ error: 'Error del servidor al actualizar usuario' });
    }
};

// 8. ELIMINAR USUARIO
exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    const adminId = req.user.id;

    try {
        if (parseInt(id) === parseInt(adminId)) {
            return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
        }

        const [userToDelete] = await pool.query('SELECT username FROM users WHERE id = ?', [id]);
        if (userToDelete.length > 0 && userToDelete[0].username === 'admin') {
            return res.status(403).json({ error: 'No se puede eliminar el usuario administrador maestro' });
        }

        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ success: true, message: 'Usuario eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ error: 'Error del servidor al eliminar usuario' });
    }
};
