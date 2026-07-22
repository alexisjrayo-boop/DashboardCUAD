const cron = require('node-cron');
const { loginAndFetch } = require('./telmexService');
const { pool } = require('../config/db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const EXTENSION_MAP = require('../config/extensions.json');

// Función para obtener la fecha de hoy en formato YYYY-MM-DD
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

// Helper para formatear fecha para la API (YYYY-MM-DD HH:mm)
function formatDateForApi(date) {
    const d = new Date(date);
    const pad = n => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Función para determinar el rango de fechas a consultar
async function determineDateRange() {
    const connection = await pool.getConnection();
    try {
        // Buscar la fecha más reciente en la BD
        const [rows] = await connection.query('SELECT MAX(calldate) as last_date FROM cdrs');
        const lastDate = rows[0].last_date;

        const today = getTodayDate();
        const end = `${today} 23:59`;

        if (!lastDate) {
            const currentYear = new Date().getFullYear();
            console.log(`  BD vacía. Iniciando carga histórica desde el 1 de Enero de ${currentYear}.`);
            return {
                from: `${currentYear}-01-01 00:00`,
                to: end
            };
        }

        // Si hay datos, consultar desde el último día registrado
        const lastDateObj = new Date(lastDate);
        const lastDateStr = lastDateObj.toISOString().split('T')[0];

        console.log(`  Último registro encontrado: ${lastDateStr}. Sincronizando desde esa fecha.`);

        return {
            from: `${lastDateStr} 00:00`,
            to: end
        };

    } finally {
        connection.release();
    }
}

async function processAndSaveRows(rows) {
    if (!rows || rows.length === 0) return;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const insertQuery = `
            INSERT IGNORE INTO cdrs (
                cdr_id, calldate, clid, source, src, dst, destination, dcontext, 
                channel, dstchannel, lastapp, lastdata, duration, billsec, disposition, 
                amaflags, accountcode, auth_code, customer_code, pin_code, userfield, 
                uniqueid, linkedid, sequence, peeraccount, calltype, recfile, 
                recfile_cloud, charge, chargebuy, cleartext, unit, chargeunit, 
                calldate_utc, recorded, destination_desc, raw_data
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, 
                ?, ?, ?, ?, ?, ?, ?, 
                ?, ?, ?, ?, ?, ?, 
                ?, ?, ?, ?, ?, ?, 
                ?, ?, ?, ?, ?, ?, 
                ?, ?, ?, ?
            )
        `;

        // Detectar formato (Array vs Objeto)
        let dataRows = rows;
        let isArrayFormat = false;

        if (rows.length > 0) {
            const firstRow = rows[0];
            if (Array.isArray(firstRow)) {
                isArrayFormat = true;
                if (firstRow[0] === 'cdr_id') {
                    dataRows = rows.slice(1);
                }
            }
        }

        for (const row of dataRows) {
            let values = [];
            let destination = '';

            if (isArrayFormat) {
                const calltype = row[25]; // Move calltype extraction up
                destination = row[6]; // destination index
                const dstchannel = row[9];
                const lastapp = row[10];

                if (!destination) {
                    if (dstchannel) {
                        // "la extension viene despues de los caracteres sip/ o local/"
                        // Prioritize this extraction. 
                        const sipMatch = dstchannel.match(/^SIP\/(\d+)/);
                        if (sipMatch) destination = sipMatch[1];
                        else {
                            const localMatch = dstchannel.match(/^Local\/(\d+)/);
                            if (localMatch) destination = localMatch[1];
                        }
                    }

                    if (!destination && lastapp) {
                        // Fallback to lastapp for ALL calltypes
                        destination = lastapp;
                    }
                }

                const desc = EXTENSION_MAP[destination] || null;

                // linea_receptora logic removed

                values = [
                    row[0],  // cdr_id
                    parseDate(row[1]), // calldate
                    row[2],  // clid
                    row[3],  // source
                    row[4],  // src
                    row[5],  // dst
                    destination,  // destination
                    row[7],  // dcontext
                    row[8],  // channel
                    row[9],  // dstchannel
                    row[10], // lastapp
                    row[11], // lastdata
                    row[12], // duration
                    row[13], // billsec
                    row[14], // disposition
                    row[15], // amaflags
                    row[16], // accountcode
                    row[17], // auth_code
                    row[18], // customer_code
                    row[19], // pin_code
                    row[20], // userfield
                    row[21], // uniqueid
                    row[22], // linkedid
                    row[23], // sequence
                    row[24], // peeraccount
                    row[25], // calltype
                    row[26], // recfile
                    row[27], // recfile_cloud
                    row[28], // charge
                    row[29], // chargebuy
                    row[30], // cleartext
                    row[31], // unit
                    row[32], // chargeunit
                    parseDate(row[34]), // calldate_utc
                    row[35],  // recorded
                    desc // destination_desc
                ];
            } else {
                destination = row.destination || row.dst;
                const dstchannel = row.dstchannel;
                const lastapp = row.lastapp;
                const calltype = row.calltype;  // Move calltype extraction up

                if (!destination) {
                    if (dstchannel) {
                        const sipMatch = dstchannel.match(/^SIP\/(\d+)/);
                        if (sipMatch) destination = sipMatch[1];
                        else {
                            const localMatch = dstchannel.match(/^Local\/(\d+)/);
                            if (localMatch) destination = localMatch[1];
                        }
                    }

                    if (!destination && lastapp) {
                        destination = lastapp;
                    }
                }

                const desc = EXTENSION_MAP[destination] || null;

                // linea_receptora logic removed

                values = [
                    row.cdr_id || row.id,
                    parseDate(row.calldate || row.call_date),
                    row.clid,
                    row.source || row.src,
                    row.src,
                    row.dst,
                    destination,
                    row.dcontext,
                    row.channel,
                    row.dstchannel,
                    row.lastapp,
                    row.lastdata,
                    row.duration,
                    row.billsec,
                    row.disposition,
                    row.amaflags,
                    row.accountcode,
                    row.auth_code || row.authcode,
                    row.customer_code || row.customercode,
                    row.pin_code || row.pincode,
                    row.userfield,
                    row.uniqueid,
                    row.linkedid,
                    row.sequence,
                    row.peeraccount,
                    row.calltype,
                    row.recfile,
                    row.recfile_cloud,
                    row.charge,
                    row.chargebuy,
                    row.cleartext,
                    row.unit,
                    row.chargeunit,
                    parseDate(row.calldate_utc),
                    row.recorded,
                    desc // destination_desc
                ];
            }

            values.push(JSON.stringify(row));
            await connection.query(insertQuery, values);
        }

        await connection.commit();
        console.log(`  ✓ Guardados ${dataRows.length} registros.`);
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}

async function fetchAndSaveDailyCDRs(options = {}) {
    console.log(`[${new Date().toISOString()}] Iniciando proceso de sincronización de CDRs`, options);

    const userid = process.env.TELMEX_USERID;
    const userpass = process.env.TELMEX_USERPASS;

    if (!userid || !userpass) {
        console.error('✗ Error: Credenciales de Telmex no configuradas en .env');
        return;
    }

    try {
        let from, to;

        if (options.fromDate) {
            from = options.fromDate;
            to = options.toDate || `${getTodayDate()} 23:59`;
            console.log(`  Usando rango manual: ${from} - ${to}`);
        } else {
            // 1. Determinar rango TOTAL automático
            const range = await determineDateRange();
            from = range.from;
            to = range.to;
            console.log(`  Rango total a sincronizar (Auto): ${from} - ${to}`);
        }

        let currentDate = new Date(from);
        const endDate = new Date(to);

        // Loop mes a mes (Chunking)
        while (currentDate < endDate) {
            // Calcular fin del chunk (fin de mes o fecha final total)
            // Primer día del siguiente mes
            const nextMonth = new Date(currentDate);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            nextMonth.setDate(1);
            nextMonth.setHours(0, 0, 0, 0);

            // El fin de este chunk es el último momento del mes actual (nextMonth - 1ms)
            // O el endDate si es menor
            let chunkEnd = new Date(nextMonth.getTime() - 1);

            if (chunkEnd > endDate) {
                chunkEnd = endDate;
            }

            const chunkFromStr = formatDateForApi(currentDate);
            const chunkToStr = formatDateForApi(chunkEnd);

            console.log(`  >> Procesando mes: ${chunkFromStr} al ${chunkToStr}`);

            try {
                // 2. Consultar API para este chunk
                const result = await loginAndFetch(userid, userpass, chunkFromStr, chunkToStr);

                // 3. Procesar resultados del chunk
                if (result.data && result.data.rows && result.data.rows.length > 0) {
                    await processAndSaveRows(result.data.rows);
                } else {
                    console.log('     Sin registros en este periodo.');
                }
            } catch (e) {
                console.error(`     ✗ Error procesando chunk ${chunkFromStr}:`, e.message);
            }

            // Avanzar al siguiente mes
            currentDate = nextMonth;

            // Pequeña pausa para no saturar
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('✓ Proceso de sincronización finalizado.');

    } catch (error) {
        console.error('✗ Error general en el proceso de sincronización:', error.message);
    }
}

// Función para verificar si la BD está vacía y ejecutar fetch inicial
async function checkAndRunInitialFetch() {
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.query('SELECT COUNT(*) as count FROM cdrs');
        const count = rows[0].count;

        if (count === 0) {
            console.log('⚠ BD vacía detectada al inicio.');
            console.log('🔄 Iniciando carga inicial automática...');
            // Ejecutar sin await para no bloquear el inicio del servidor, o con await si preferimos esperar
            fetchAndSaveDailyCDRs().catch(err => console.error('✗ Error en carga inicial:', err));
        } else {
            console.log(`✓ BD contiene ${count} registros. No se requiere carga inicial.`);
        }
    } catch (error) {
        console.error('✗ Error verificando estado de BD:', error);
    } finally {
        connection.release();
    }
}

// Helper para parsear fechas
function parseDate(dateStr) {
    if (!dateStr) return null;
    try {
        // Formato "1/11/25, 8:59"
        if (typeof dateStr === 'string' && dateStr.includes(',') && dateStr.includes('/')) {
            const [datePart, timePart] = dateStr.split(', ');
            const [day, month, year] = datePart.split('/');
            const fullYear = year.length === 2 ? '20' + year : year;
            const pad = n => n.toString().padStart(2, '0');
            return `${fullYear}-${pad(month)}-${pad(day)} ${timePart}:00`;
        }
        // Formato ISO o timestamp
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            return d.toISOString().slice(0, 19).replace('T', ' ');
        }
        return null;
    } catch (e) {
        return null;
    }
}

// Programar tarea para las 01:00 AM todos los días
const task = cron.schedule('0 1 * * *', fetchAndSaveDailyCDRs, {
    scheduled: false
});

module.exports = {
    startScheduler: () => {
        task.start();
        console.log('✓ Scheduler iniciado: Ejecución diaria a las 01:00 AM');
    },
    runManualFetch: fetchAndSaveDailyCDRs,
    checkAndRunInitialFetch
};
