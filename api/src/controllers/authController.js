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

// Plantilla HTML de correo corporativo para Activación / Restablecimiento (100% Compatible con Microsoft Outlook)
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

    const btnText = isInvite ? 'Crear mi Contraseña' : 'Restablecer Contraseña';

    const htmlContent = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${subject}</title>
    <!--[if gte mso 9]>
    <xml>
        <o:OfficeDocumentSettings>
            <o:AllowPNG/>
            <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
    </xml>
    <![endif]-->
    <style type="text/css">
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f4f6f9; font-family: Arial, Helvetica, sans-serif; }
    </style>
</head>
<body bgcolor="#f4f6f9" style="margin: 0; padding: 0; background-color: #f4f6f9;">
    <!-- Contenedor Exterior -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f4f6f9" style="background-color: #f4f6f9; table-layout: fixed;">
        <tr>
            <td align="center" valign="top" style="padding: 25px 15px;">
                <!--[if (gte mso 9)|(IE)]>
                <table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
                <tr>
                <td align="center" valign="top" width="600">
                <![endif]-->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    
                    <!-- Encabezado Rojo GASME -->
                    <tr>
                        <td align="center" valign="middle" bgcolor="#C3002F" style="background-color: #C3002F; padding: 30px 20px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 26px; font-weight: bold; letter-spacing: 1px; line-height: 30px; text-transform: uppercase;">
                                        GASME CUAD
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="color: #ffd6dc; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: bold; letter-spacing: 2px; line-height: 16px; padding-top: 6px; text-transform: uppercase;">
                                        Inteligencia Operativa y Control
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Cuerpo del Correo -->
                    <tr>
                        <td align="left" valign="top" style="padding: 30px 28px; background-color: #ffffff;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                
                                <!-- Saludo -->
                                <tr>
                                    <td style="color: #0f172a; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: bold; line-height: 24px; padding-bottom: 12px;">
                                        Hola, ${user.name || 'Usuario'}
                                    </td>
                                </tr>

                                <!-- Texto Principal -->
                                <tr>
                                    <td style="color: #334155; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 22px; padding-bottom: 24px;">
                                        ${isInvite 
                                            ? 'Se ha registrado tu cuenta de acceso a la plataforma <strong>GASME CUAD</strong>. Para comenzar a utilizar el panel analítico de llamadas, por favor crea tu contraseña mediante el siguiente botón:'
                                            : 'Hemos recibido una solicitud para restablecer tu contraseña de acceso a <strong>GASME CUAD</strong>. Haz clic en el botón a continuación para definir tu nueva contraseña:'
                                        }
                                    </td>
                                </tr>

                                <!-- Botón Compatible con Outlook -->
                                <tr>
                                    <td align="center" valign="middle" style="padding: 10px 0 26px 0;">
                                        <table border="0" cellspacing="0" cellpadding="0" align="center">
                                            <tr>
                                                <td align="center" bgcolor="#C3002F" style="border-radius: 6px; background-color: #C3002F;">
                                                    <!--[if mso]>
                                                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${actionUrl}" style="height:46px;v-text-anchor:middle;width:260px;" arcsize="12%" stroke="f" fillcolor="#C3002F">
                                                        <w:anchorlock/>
                                                        <center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">
                                                            ${btnText}
                                                        </center>
                                                    </v:roundrect>
                                                    <![endif]-->
                                                    <!--[if !mso]><!-->
                                                    <a href="${actionUrl}" target="_blank" style="font-size: 14px; font-family: Arial, Helvetica, sans-serif; font-weight: bold; color: #ffffff; text-decoration: none; border-radius: 6px; padding: 14px 28px; display: inline-block; background-color: #C3002F; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #C3002F;">
                                                        ${btnText}
                                                    </a>
                                                    <!--<![endif]-->
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Enlace de Respaldo -->
                                <tr>
                                    <td style="color: #64748b; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 18px; padding-bottom: 6px;">
                                        Si el botón no abre correctamente, copia y pega este enlace en tu navegador:
                                    </td>
                                </tr>
                                <tr>
                                    <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; word-break: break-all;">
                                        <a href="${actionUrl}" target="_blank" style="color: #C3002F; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 16px; text-decoration: underline; word-break: break-all;">
                                            ${actionUrl}
                                        </a>
                                    </td>
                                </tr>

                                <!-- Aviso de Seguridad -->
                                <tr>
                                    <td style="padding-top: 20px;">
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fff1f2; border-left: 4px solid #C3002F; border-radius: 4px;">
                                            <tr>
                                                <td style="padding: 12px 14px; color: #9f1239; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 18px;">
                                                    <strong>⏱️ Nota de Seguridad:</strong> Este enlace es de uso único y tiene una vigencia de <strong>24 horas</strong>. Si no solicitaste este acceso, puedes ignorar este mensaje.
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                            </table>
                        </td>
                    </tr>

                    <!-- Pie de Página -->
                    <tr>
                        <td align="center" valign="middle" bgcolor="#f8fafc" style="background-color: #f8fafc; padding: 18px 20px; border-top: 1px solid #e2e8f0;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="color: #94a3b8; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 16px;">
                                        &copy; ${new Date().getFullYear()} Grupo GASME &bull; Plataforma de Inteligencia Operativa CUAD
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                </table>
                <!--[if (gte mso 9)|(IE)]>
                </td>
                </tr>
                </table>
                <![endif]-->
            </td>
        </tr>
    </table>
</body>
</html>`;

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

        // Sincronizar reportes
        if (cleanEmail) {
            if (receive_reports) {
                const [existingConfig] = await pool.query('SELECT id FROM email_report_configs WHERE LOWER(recipient_email) = ?', [cleanEmail]);
                if (existingConfig.length === 0) {
                    await pool.query(
                        'INSERT INTO email_report_configs (recipient_name, name, recipient_email, periodicity, line, active, frequency, phone_lines, call_type, format) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [name, name, cleanEmail, 'semanal', 'all', 1, 'semanal', 'all', '2', 'pdf']
                    );
                } else {
                    await pool.query(
                        'UPDATE email_report_configs SET recipient_name = ?, name = ?, active = 1 WHERE id = ?',
                        [name, name, existingConfig[0].id]
                    );
                }
            } else {
                await pool.query('UPDATE email_report_configs SET active = 0 WHERE LOWER(recipient_email) = ?', [cleanEmail]);
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

        const [userToDelete] = await pool.query('SELECT username, email FROM users WHERE id = ?', [id]);
        if (userToDelete.length > 0) {
            if (userToDelete[0].username === 'admin') {
                return res.status(403).json({ error: 'No se puede eliminar el usuario administrador maestro' });
            }
            if (userToDelete[0].email) {
                // Eliminar de destinatarios de reportes
                await pool.query('DELETE FROM email_report_configs WHERE LOWER(recipient_email) = ?', [userToDelete[0].email.toLowerCase().trim()]);
            }
        }

        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ success: true, message: 'Usuario eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ error: 'Error del servidor al eliminar usuario' });
    }
};
