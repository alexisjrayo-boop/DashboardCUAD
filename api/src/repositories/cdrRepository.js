const { pool } = require('../config/db');
const extensionsMap = require('../config/extensions.json');

const getStoredCdrsFromDb = async ({
    startDate, endDate,
    source, destination, // Comma separated extensions 
    dst, // Line (e.g. 2878750303)
    calltype, // 1=Internal, 2=Incoming, 3=Outgoing
    locationSource, locationDestination, // Location codes (TX, SC, etc.)
    disposition, limit
}) => {
    // Specify only needed columns to improve performance and reduce network load
    // Specify columns needed for Dashboard and Call Details (excluding heavy raw_data JSON)
    let query = 'SELECT cdr_id, calldate, source, src, dst, destination, duration, billsec, disposition, channel, dstchannel, lastapp, calltype FROM cdrs WHERE 1=1';
    const params = [];

    // --- Date Logic ---
    if (startDate) {
        query += ' AND calldate >= ?';
        // If it looks like a full datetime (has : or T), use as is, else append start of day
        const startVal = (startDate.includes('T') || startDate.includes(':')) ? startDate.replace('T', ' ') : `${startDate} 00:00:00`;
        params.push(startVal);
    }
    if (endDate) {
        query += ' AND calldate <= ?';
        // If it looks like a full datetime (has : or T), use as is, else append end of day
        const endVal = (endDate.includes('T') || endDate.includes(':')) ? endDate.replace('T', ' ') : `${endDate} 23:59:59`;
        params.push(endVal);
    }

    // --- Source Logic ---
    // 1. Explicit Source Extensions selected
    if (source) {
        const sources = (Array.isArray(source) ? source.join(',') : String(source)).split(',').map(s => s.trim()).filter(Boolean);
        if (sources.length > 0 || sources.includes('NO_EXTENSION')) {
            const realSources = sources.filter(s => s !== 'NO_EXTENSION');
            const hasNoExtension = sources.includes('NO_EXTENSION');
            const knownExtensions = Object.keys(extensionsMap);

            let sourceConditions = [];
            let sourceParams = [];

            if (realSources.length > 0) {
                const extRegex = `(Local|SIP|PJSIP)/(${realSources.join('|')})[@-]`;
                sourceConditions.push(`(src IN (${realSources.map(() => '?').join(',')}) OR channel REGEXP ?)`);
                sourceParams.push(...realSources, extRegex);
            }

            if (hasNoExtension) {
                const knownExts = knownExtensions.filter(Boolean);
                if (knownExts.length > 0) {
                    const extRegex = `(Local|SIP|PJSIP)/(${knownExts.join('|')})[@-]`;
                    sourceConditions.push(`(src NOT IN (${knownExts.map(() => '?').join(',')}) AND (channel NOT REGEXP ? OR channel IS NULL))`);
                    sourceParams.push(...knownExts, extRegex);
                } else {
                    sourceConditions.push(`src NOT REGEXP '^[0-9]+$'`);
                }
            }

            if (sourceConditions.length > 0) {
                query += ` AND (${sourceConditions.join(' OR ')})`;
                params.push(...sourceParams);
            }
        }
    }
    // 2. Fallback: Location Source (if no explicit extensions)
    else if (locationSource) {
        if (locationSource === 'BACKGROUND') {
            query += " AND src NOT REGEXP '^[0-9]+$'";
        } else {
            const targetExtensions = [];
            Object.entries(extensionsMap).forEach(([ext, desc]) => {
                if (desc && desc.startsWith(locationSource)) {
                    targetExtensions.push(ext);
                }
            });
            if (targetExtensions.length > 0) {
                query += ` AND src IN (${targetExtensions.map(() => '?').join(',')})`;
                params.push(...targetExtensions);
            } else {
                query += ' AND 1=0'; // Location has no extensions
            }
        }
    }

    // --- Dst (Line) Logic ---
    if (dst) {
        if (dst === 'BACKGROUND') {
            query += " AND dst NOT REGEXP '^[0-9]+$'";
        } else {
            // Check if the dst (Line) implies a location with extensions to include
            let prefix = null;

            // TUXTEPEC (Starts with 5 OR specific lines)
            if (dst.startsWith('5') || dst === '2878750303' || dst === '2878759701') {
                prefix = '5';
            }
            // SALINA CRUZ (Starts with 7 OR specific line)
            else if (dst.startsWith('7') || dst === '9716884348') {
                prefix = '7';
            }
            // JUCHITAN (Starts with 6 OR specific line)
            else if (dst.startsWith('6') || dst === '9717120739') {
                prefix = '6';
            }
            // CORDOBA (Starts with 3)
            else if (dst.startsWith('3')) {
                prefix = '3';
            }

            if (prefix) {
                // Include the specific line OR any extension starting with the prefix
                query += ' AND (dst = ? OR dst LIKE ?)';
                params.push(dst, `${prefix}%`);
            } else {
                // Standard exact match
                query += ' AND dst = ?';
                params.push(dst);
            }
        }
    }

    // --- Destination Logic ---
    // 1. Explicit Destination Extensions selected
    if (destination) {
        const dests = (Array.isArray(destination) ? destination.join(',') : String(destination)).split(',').map(s => s.trim()).filter(Boolean);
        if (dests.length > 0 || dests.includes('NO_EXTENSION')) {
            const realDests = dests.filter(d => d !== 'NO_EXTENSION');
            const hasNoExtension = dests.includes('NO_EXTENSION');
            const knownExtensions = Object.keys(extensionsMap).filter(Boolean);

            let destConditions = [];
            let destParams = [];

            if (realDests.length > 0) {
                const extRegex = `(Local|SIP|PJSIP)/(${realDests.join('|')})[@-]`;
                destConditions.push(`(destination IN (${realDests.map(() => '?').join(',')}) OR (calltype = '2' AND dstchannel REGEXP ?))`);
                destParams.push(...realDests, extRegex);
            }

            if (hasNoExtension) {
                if (knownExtensions.length > 0) {
                    const extRegex = `(Local|SIP|PJSIP)/(${knownExtensions.join('|')})[@-]`;
                    destConditions.push(`(destination NOT IN (${knownExtensions.map(() => '?').join(',')}) AND (calltype != '2' OR (dstchannel NOT REGEXP ? OR dstchannel IS NULL)))`);
                    destParams.push(...knownExtensions, extRegex);
                } else {
                    destConditions.push(`destination NOT REGEXP '^[0-9]+$'`);
                }
            }

            if (destConditions.length > 0) {
                query += ` AND (${destConditions.join(' OR ')})`;
                params.push(...destParams);
            }
        }
    }
    // 2. Fallback: Location Destination
    else if (locationDestination) {
        if (locationDestination === 'BACKGROUND') {
            query += " AND destination NOT REGEXP '^[0-9]+$'";
        } else {
            const targetExtensions = [];
            Object.entries(extensionsMap).forEach(([ext, desc]) => {
                if (desc && desc.startsWith(locationDestination)) {
                    targetExtensions.push(ext);
                }
            });
            if (targetExtensions.length > 0) {
                query += ` AND destination IN (${targetExtensions.map(() => '?').join(',')})`;
                params.push(...targetExtensions);
            } else {
                query += ' AND 1=0';
            }
        }
    }

    if (disposition) {
        query += ' AND disposition = ?';
        params.push(disposition);
    }

    if (calltype) {
        query += ' AND calltype = ?';
        params.push(calltype);
    }

    if (limit) {
        query += ' LIMIT ?';
        params.push(parseInt(limit));
    } else {
        query += ' LIMIT 20000';
    }


    const [rows] = await pool.query(query, params);

    // Logging for debug
    console.log('CDR Query:', query);
    console.log('Params:', params);
    console.log('CDR Query Result Count:', rows ? rows.length : 0);

    return rows;
};

module.exports = {
    getStoredCdrsFromDb
};
