const { loginAndFetch } = require('../services/telmexService');
const { runManualFetch } = require('../services/schedulerService');
const extensionsMap = require('../config/extensions.json');
const cdrService = require('../services/cdrService');

// Almacenar cookies por sesión (en memoria)
const sessions = new Map();

exports.healthCheck = (req, res) => {
    res.json({
        status: 'ok',
        message: 'API CDR Telmex funcionando correctamente',
        db_status: 'connected',
        timestamp: new Date().toISOString()
    });
};

exports.queryLive = async (req, res) => {
    const { userid, userpass, from, to, source, destination, page_size } = req.body;

    if (!userid || !userpass) {
        return res.status(400).json({ error: 'Se requieren userid y userpass' });
    }

    if (!from || !to) {
        return res.status(400).json({ error: 'Se requieren fechas from y to' });
    }

    try {
        console.log(`[Live Query] Usuario: ${userid}, Rango: ${from} - ${to}`);

        const result = await loginAndFetch(userid, userpass, from, to, source, destination, page_size);

        // Guardar sesión
        const sessionId = `${userid}_${Date.now()}`;
        sessions.set(sessionId, {
            userid,
            cookies: result.cookies,
            timestamp: Date.now()
        });

        res.json({
            success: true,
            sessionId: sessionId,
            data: result.data,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error en consulta CDR:', error.message);
        res.status(500).json({
            error: 'Error en la consulta al servidor CUAD',
            details: error.message
        });
    }
};



exports.getExtensions = (req, res) => {
    try {
        res.json({
            success: true,
            data: extensionsMap
        });
    } catch (error) {
        console.error('Error enviando extensiones:', error);
        res.status(500).json({ error: 'Error obteniendo extensiones' });
    }
};

exports.getStoredCdrs = async (req, res) => {
    try {
        const rows = await cdrService.getAllCdrs(req.query);
        res.json({ success: true, count: rows.length, data: rows });
    } catch (error) {
        console.error('Error fetching stored CDRs:', error);
        res.status(500).json({ success: false, message: 'Database error' });
    }
};

exports.triggerManualFetch = async (req, res) => {
    try {
        const { year, fromDate } = req.body;

        let options = {};
        if (year) {
            options.fromDate = `${year}-01-01 00:00`;
        } else if (fromDate) {
            options.fromDate = fromDate;
        }

        console.log('Trigger manual de fetch solicitado...', options);
        runManualFetch(options).catch(err => console.error('Error en trigger manual:', err));

        res.json({
            success: true,
            message: 'Proceso de descarga iniciado en segundo plano'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
