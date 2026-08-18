const ExcelJS = require('exceljs');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const { pool } = require('../config/db');
const cdrService = require('../services/cdrService');

// ==========================================
// 1. MANEJO DE CONFIGURACIÓN DE REPORTES
// ==========================================

exports.getEmailReportConfigs = async (req, res) => {
    try {
        const [configs] = await pool.query('SELECT * FROM email_report_configs ORDER BY created_at DESC');
        res.json({ success: true, data: configs, configs });
    } catch (error) {
        console.error('Error fetching report configs:', error);
        res.status(500).json({ error: 'Error del servidor al obtener configuraciones' });
    }
};

exports.saveEmailReportConfig = async (req, res) => {
    const targetId = req.params.id || req.body.id;
    const recipient_email = req.body.recipient_email;
    const recipient_name = req.body.recipient_name || req.body.name || 'Destinatario';
    const active = req.body.active !== undefined ? (req.body.active ? 1 : 0) : 1;
    const frequency = req.body.frequency || 'semanal';
    const phone_lines = req.body.phone_lines || 'all';
    const call_type = req.body.call_type || '2';
    const format = req.body.format || 'pdf';

    if (!recipient_email || !recipient_email.trim()) {
        return res.status(400).json({ error: 'El correo electrónico es obligatorio' });
    }

    try {
        if (targetId && targetId !== 'undefined' && targetId !== 'null') {
            await pool.query(
                `UPDATE email_report_configs 
                 SET recipient_name = ?, name = ?, recipient_email = ?, active = ?, frequency = ?, phone_lines = ?, call_type = ?, format = ? 
                 WHERE id = ?`,
                [recipient_name, recipient_name, recipient_email.trim(), active, frequency, phone_lines, call_type, format, targetId]
            );
            res.json({ success: true, message: 'Destinatario actualizado exitosamente' });
        } else {
            const [result] = await pool.query(
                `INSERT INTO email_report_configs 
                 (recipient_name, name, recipient_email, active, frequency, phone_lines, call_type, format) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [recipient_name, recipient_name, recipient_email.trim(), active, frequency, phone_lines, call_type, format]
            );
            res.status(201).json({ success: true, message: 'Destinatario agregado exitosamente', id: result.insertId });
        }
    } catch (error) {
        console.error('Error saving report config:', error);
        res.status(500).json({ error: 'Error del servidor al guardar la configuración' });
    }
};

exports.deleteEmailReportConfig = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM email_report_configs WHERE id = ?', [id]);
        res.json({ success: true, message: 'Destinatario eliminado exitosamente' });
    } catch (error) {
        console.error('Error deleting report config:', error);
        res.status(500).json({ error: 'Error del servidor al eliminar destinatario' });
    }
};

// ==========================================
// 2. GENERADOR DE EXCEL (UNIFICADO)
// ==========================================

function buildExcelWorkbook(records, chartImages = null, filters = {}) {
    return new Promise((resolve, reject) => {
        const os = require('os');
        const uniqueId = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        const jsonPath = path.join(os.tmpdir(), `cuad_data_${uniqueId}.json`);
        const outputPath = path.join(os.tmpdir(), `cuad_output_${uniqueId}.xlsx`);
        const templatePath = path.join(__dirname, '../templates/report_template.xlsx');

        // Formatear payload para enviárselo a Python
        const payload = {
            filters: filters,
            records: records
        };

        fs.writeFile(jsonPath, JSON.stringify(payload, null, 2), 'utf8', (err) => {
            if (err) {
                return reject(err);
            }

            const pythonScript = path.join(__dirname, '../templates/generate_report.py');
            
            // Ejecutar script de Python para poblar la plantilla
            execFile('python', [pythonScript, jsonPath, templatePath, outputPath], (error, stdout, stderr) => {
                if (error) {
                    console.error('Python execution error:', stderr || error.message);
                    fs.unlink(jsonPath, () => {});
                    return reject(new Error(stderr || error.message));
                }

                // Leer el archivo de salida generado
                fs.readFile(outputPath, (readErr, dataBuffer) => {
                    // Limpiar archivos temporales
                    fs.unlink(jsonPath, () => {});
                    fs.unlink(outputPath, () => {});

                    if (readErr) {
                        return reject(readErr);
                    }

                    resolve(dataBuffer);
                });
            });
        });
    });
}

// ==========================================
// 3. EXPORTAR REPORTE MANUAL
// ==========================================

exports.downloadManualReport = async (req, res) => {
    const { filters = {} } = req.body;

    try {
        console.log('[Manual Report] Generando reporte manual...');
        
        // Mapear filtros del frontend al formato esperado por el repositorio
        const queryFilters = {
            startDate: filters.startDate,
            endDate: filters.endDate,
            disposition: filters.disposition,
            limit: 80000
        };

        if (filters.destination && filters.destination.length > 0) {
            queryFilters.destination = filters.destination.join(',');
        }

        if (filters.line) {
            let lineValue = filters.line;
            if (lineValue === 'CUAD') {
                lineValue = '301,375,378,379,380,381';
            }
            queryFilters.dst = lineValue;
        }

        // Importante: No filtramos por calltype en la base de datos para el reporte
        // de modo que podamos traer todos los tipos (entrantes, salientes, internas)
        // y poblar las 4 hojas correspondientes.

        const records = await cdrService.getAllCdrs(queryFilters);
        
        const buffer = await buildExcelWorkbook(records, null, filters);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Reporte_CUAD_Manual.xlsx"');
        
        res.send(buffer);
        console.log('[Manual Report] Reporte manual enviado correctamente.');
    } catch (error) {
        console.error('Error generating manual report:', error);
        res.status(500).json({ error: 'Error del servidor al generar el reporte' });
    }
};

// ==========================================
// 4. ENVÍO DE REPORTES AUTOMÁTICOS POR CORREO
// ==========================================

// Configuración del transportador de nodemailer
function getMailTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true', // true para puerto 465, false para otros
        auth: {
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || ''
        }
    });
}

// Función ejecutada periódicamente por el scheduler para procesar y enviar correos
exports.processAndSendScheduledReports = async () => {
    console.log(`[${new Date().toISOString()}] Ejecutando revisión de reportes programados de llamadas entrantes...`);
    
    const smtpUser = process.env.SMTP_USER;
    if (!smtpUser) {
        console.warn('⚠ Advertencia: SMTP_USER no configurado en .env. Se cancela el envío de reportes por correo.');
        return;
    }

    try {
        const [configs] = await pool.query('SELECT * FROM email_report_configs');
        if (configs.length === 0) {
            console.log('  No hay destinatarios de reportes programados en la BD.');
            return;
        }

        const now = new Date();
        const pad = n => n.toString().padStart(2, '0');
        const transporter = getMailTransporter();

        // -------------------------------------------------------------
        // 1. REPORTE SEMANAL (Se ejecuta los Lunes, abarca Lunes a Domingo pasados)
        // -------------------------------------------------------------
        if (now.getDay() === 1) { // 1 = Lunes
            const startDateWeekly = new Date(now);
            startDateWeekly.setDate(now.getDate() - 7);
            startDateWeekly.setHours(0, 0, 0, 0);

            const endDateWeekly = new Date(now);
            endDateWeekly.setDate(now.getDate() - 1);
            endDateWeekly.setHours(23, 59, 59, 999);

            const startStrWeekly = `${startDateWeekly.getFullYear()}-${pad(startDateWeekly.getMonth() + 1)}-${pad(startDateWeekly.getDate())} 00:00:00`;
            const endStrWeekly = `${endDateWeekly.getFullYear()}-${pad(endDateWeekly.getMonth() + 1)}-${pad(endDateWeekly.getDate())} 23:59:59`;

            // Filtrar únicamente llamadas entrantes (calltype = '2')
            const weeklyFilters = {
                startDate: startStrWeekly,
                endDate: endStrWeekly,
                calltype: '2'
            };

            console.log(`  [Reporte Semanal] Consultando llamadas entrantes (${startStrWeekly} - ${endStrWeekly})...`);
            const recordsWeekly = await cdrService.getAllCdrs(weeklyFilters);
            const bufferWeekly = await buildExcelWorkbook(recordsWeekly, null, weeklyFilters);

            for (const recipient of configs) {
                // Verificar si ya se le envió en los últimos 5 días
                const lastSent = recipient.last_sent_weekly || recipient.last_sent;
                if (lastSent && (now.getTime() - new Date(lastSent).getTime()) < 5 * 24 * 60 * 60 * 1000) {
                    continue;
                }

                console.log(`  Envío de Reporte Semanal (Entrantes) para: ${recipient.recipient_email}`);
                try {
                    const mailOptions = {
                        from: `"GASME CUAD Reports" <${process.env.SMTP_FROM || smtpUser}>`,
                        to: recipient.recipient_email,
                        subject: `Reporte Semanal de Llamadas Entrantes (${startDateWeekly.toLocaleDateString()} - ${endDateWeekly.toLocaleDateString()})`,
                        text: `Hola ${recipient.name || ''},\n\nAdjunto encontrarás el reporte semanal consolidado de LLAMADAS ENTRANTES correspondiente al periodo del ${startStrWeekly.split(' ')[0]} al ${endStrWeekly.split(' ')[0]}.\n\nTotal de llamadas entrantes registradas: ${recordsWeekly.length}\n\nEste correo se genera automáticamente. No responder.`,
                        attachments: [
                            {
                                filename: `Reporte_Semanal_Entrantes_${startStrWeekly.split(' ')[0]}.xlsx`,
                                content: bufferWeekly
                            }
                        ]
                    };

                    await transporter.sendMail(mailOptions);
                    console.log(`  ✓ Correo semanal enviado exitosamente a ${recipient.recipient_email}`);
                    await pool.query('UPDATE email_report_configs SET last_sent_weekly = CURRENT_TIMESTAMP, last_sent = CURRENT_TIMESTAMP WHERE id = ?', [recipient.id]);
                } catch (err) {
                    console.error(`  ✗ Error enviando reporte semanal a ${recipient.recipient_email}:`, err.message);
                }
            }
        }

        // -------------------------------------------------------------
        // 2. REPORTE MENSUAL (Se ejecuta el día 1 de cada mes, abarca del 1 al último día del mes pasado)
        // -------------------------------------------------------------
        if (now.getDate() === 1) { // 1° de mes
            const startDateMonthly = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
            const endDateMonthly = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

            const startStrMonthly = `${startDateMonthly.getFullYear()}-${pad(startDateMonthly.getMonth() + 1)}-${pad(startDateMonthly.getDate())} 00:00:00`;
            const endStrMonthly = `${endDateMonthly.getFullYear()}-${pad(endDateMonthly.getMonth() + 1)}-${pad(endDateMonthly.getDate())} 23:59:59`;

            // Filtrar únicamente llamadas entrantes (calltype = '2')
            const monthlyFilters = {
                startDate: startStrMonthly,
                endDate: endStrMonthly,
                calltype: '2'
            };

            console.log(`  [Reporte Mensual] Consultando llamadas entrantes (${startStrMonthly} - ${endStrMonthly})...`);
            const recordsMonthly = await cdrService.getAllCdrs(monthlyFilters);
            const bufferMonthly = await buildExcelWorkbook(recordsMonthly, null, monthlyFilters);

            for (const recipient of configs) {
                // Verificar si ya se le envió en los últimos 20 días
                const lastSent = recipient.last_sent_monthly;
                if (lastSent && (now.getTime() - new Date(lastSent).getTime()) < 20 * 24 * 60 * 60 * 1000) {
                    continue;
                }

                console.log(`  Envío de Reporte Mensual (Entrantes) para: ${recipient.recipient_email}`);
                try {
                    const mailOptions = {
                        from: `"GASME CUAD Reports" <${process.env.SMTP_FROM || smtpUser}>`,
                        to: recipient.recipient_email,
                        subject: `Reporte Mensual de Llamadas Entrantes (${startDateMonthly.toLocaleDateString()} - ${endDateMonthly.toLocaleDateString()})`,
                        text: `Hola ${recipient.name || ''},\n\nAdjunto encontrarás el reporte mensual consolidado de LLAMADAS ENTRANTES correspondiente al periodo del ${startStrMonthly.split(' ')[0]} al ${endStrMonthly.split(' ')[0]}.\n\nTotal de llamadas entrantes registradas: ${recordsMonthly.length}\n\nEste correo se genera automáticamente. No responder.`,
                        attachments: [
                            {
                                filename: `Reporte_Mensual_Entrantes_${startStrMonthly.split(' ')[0]}.xlsx`,
                                content: bufferMonthly
                            }
                        ]
                    };

                    await transporter.sendMail(mailOptions);
                    console.log(`  ✓ Correo mensual enviado exitosamente a ${recipient.recipient_email}`);
                    await pool.query('UPDATE email_report_configs SET last_sent_monthly = CURRENT_TIMESTAMP WHERE id = ?', [recipient.id]);
                } catch (err) {
                    console.error(`  ✗ Error enviando reporte mensual a ${recipient.recipient_email}:`, err.message);
                }
            }
        }

    } catch (err) {
        console.error('Error general revisando reportes programados:', err.message);
    }
};

// Envío de correo de prueba por destinatario
exports.sendTestEmailReport = async (req, res) => {
    try {
        const { recipient_email, recipient_name, frequency, phone_lines, call_type, startDate, endDate, pdfBase64 } = req.body;

        if (!recipient_email) {
            return res.status(400).json({ success: false, message: 'Correo destinatario requerido' });
        }

        const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
        const smtpPort = parseInt(process.env.SMTP_PORT || '587');
        const smtpUser = process.env.SMTP_USER || '';
        const smtpPass = process.env.SMTP_PASS || '';
        const smtpFrom = process.env.SMTP_FROM || `"GASME CUAD Reportes" <${smtpUser || 'notificaciones@gasme.com.mx'}>`;

        if (!smtpUser || !smtpPass) {
            return res.status(400).json({
                success: false,
                message: 'Servidor SMTP no configurado en .env (SMTP_USER / SMTP_PASS faltante en servidor). Por favor configura las credenciales SMTP en el archivo .env de la API.'
            });
        }

        const appUrl = process.env.APP_URL || 'http://localhost:5173';
        const queryParams = new URLSearchParams();
        if (startDate) {
            const formattedStart = startDate.replace(' ', 'T').substring(0, 16);
            queryParams.append('startDate', formattedStart);
        }
        if (endDate) {
            const formattedEnd = endDate.replace(' ', 'T').substring(0, 16);
            queryParams.append('endDate', formattedEnd);
        }
        if (call_type) {
            queryParams.append('calltype', call_type);
        }
        if (phone_lines && phone_lines !== 'all') {
            queryParams.append('line', phone_lines);
        }
        const dashboardLink = `${appUrl}/?${queryParams.toString()}`;

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
                user: smtpUser,
                pass: smtpPass
            }
        });

        const attachments = [];

        // Generar archivo Excel de prueba idéntico al del Dashboard web
        try {
            let lineValue = phone_lines || 'all';
            if (lineValue === 'CUAD') lineValue = '301,375,378,379,380,381';

            const testFilters = {
                startDate: startDate || null,
                endDate: endDate || null,
                dst: lineValue,
                calltype: call_type || '2'
            };

            const testRecords = await cdrService.getAllCdrs(testFilters);
            const excelBuffer = await buildExcelWorkbook(testRecords, null, testFilters);

            attachments.push({
                filename: `Reporte_Muestra_GASME_${(recipient_name || 'Prueba').replace(/\s+/g, '_')}.xlsx`,
                content: excelBuffer
            });
        } catch (excelErr) {
            console.warn('Advertencia al generar Excel de prueba:', excelErr.message);
        }

        if (pdfBase64) {
            const cleanBase64 = pdfBase64.includes('base64,') ? pdfBase64.split('base64,')[1] : pdfBase64;
            attachments.push({
                filename: `Reporte_Ejecutivo_GASME_${(recipient_name || 'Muestra').replace(/\s+/g, '_')}.pdf`,
                content: Buffer.from(cleanBase64, 'base64'),
                contentType: 'application/pdf'
            });
        }

        const mailOptions = {
            from: smtpFrom,
            to: recipient_email,
            subject: `[PRUEBA DE REPORTE] Analytics GASME CUAD - ${recipient_name || recipient_email}`,
            html: `
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 30px 0; font-family: Arial, Helvetica, sans-serif;">
                    <tr>
                        <td align="center">
                            <table width="600" cellpadding="0" cellspacing="0" border="0" style="width: 600px; max-width: 600px; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
                                <tr>
                                    <td bgcolor="#C3002F" align="center" style="background-color: #C3002F; padding: 28px 20px; text-align: center;">
                                        <div style="font-size: 10px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #ffffff; margin-bottom: 4px; opacity: 0.9;">SISTEMA DE INTELIGENCIA DE TELEFONÍA</div>
                                        <h1 style="margin: 0; font-size: 22px; font-weight: bold; color: #ffffff; letter-spacing: -0.5px;">Analytics GASME CUAD</h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 28px 24px; color: #334155; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5;">
                                        <p style="margin-top: 0; font-size: 16px; color: #0f172a; margin-bottom: 8px;">Hola, <strong>${recipient_name || 'Destinatario'}</strong></p>
                                        <p style="color: #64748b; margin-top: 0; margin-bottom: 22px; font-size: 14px;">Se ha generado el reporte ejecutivo automatizado correspondiente a la configuración de tu cuenta en <strong>GASME CUAD</strong>.</p>
                                        
                                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 22px;">
                                            <tr>
                                                <td style="padding: 16px;">
                                                    <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; margin-bottom: 12px;">CONFIGURACIÓN DEL REPORTE</div>
                                                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px;">
                                                        <tr>
                                                            <td width="140" style="padding: 8px 0; font-weight: bold; color: #64748b; border-bottom: 1px solid #e2e8f0;">Frecuencia:</td>
                                                            <td style="padding: 8px 0; color: #0f172a; font-weight: bold; border-bottom: 1px solid #e2e8f0;"><span style="background-color: #e2e8f0; padding: 2px 8px; border-radius: 3px; font-size: 12px; text-transform: capitalize;">${frequency || 'semanal'}</span></td>
                                                        </tr>
                                                        <tr>
                                                            <td width="140" style="padding: 8px 0; font-weight: bold; color: #64748b; border-bottom: 1px solid #e2e8f0;">Líneas telefónicas:</td>
                                                            <td style="padding: 8px 0; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${phone_lines === 'all' ? 'Todas las líneas' : phone_lines || 'Todas'}</td>
                                                        </tr>
                                                        <tr>
                                                            <td width="140" style="padding: 8px 0; font-weight: bold; color: #64748b;">Tipo de llamada:</td>
                                                            <td style="padding: 8px 0; color: #0f172a;">${call_type === 'all' ? 'Todos (Entrante / Saliente / Interna)' : (call_type === '2' ? 'Entrantes' : (call_type === '3' ? 'Salientes' : (call_type === '1' ? 'Internas' : call_type || 'Todas')))}</td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>

                                        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 25px; margin-bottom: 0;">Este es un mensaje automático generado por el sistema. Por favor no responda a este correo.</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td bgcolor="#f8fafc" align="center" style="background-color: #f8fafc; padding: 16px 20px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
                                        <strong>GASME CUAD © ${new Date().getFullYear()}</strong> &nbsp;|&nbsp; Inteligencia & Analítica Operativa de Telefonía
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            `,
            attachments
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'Correo de prueba enviado correctamente' });
    } catch (error) {
        console.error('Error al enviar correo de prueba:', error);
        res.status(500).json({ success: false, message: 'Error al enviar correo de prueba: ' + error.message });
    }
};
