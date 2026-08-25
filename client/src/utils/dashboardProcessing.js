import { parseCalldate } from './dateUtils';

/**
 * Calculates summary statistics from the rows.
 * Optimizes performance by using a single pass (reduce) instead of multiple filters.
 *
 * @param {Array} rows - The raw CDR rows.
 * @param {Object} extensionsMap - Map of extension numbers to names.
 * @returns {Object} { total, answered, noAnswer, busy, failed, topExtension, topExtensionCount }
 */
export const calculateGeneralStats = (rows, extensionsMap) => {
    const start = performance.now();

    const defaults = {
        total: 0,
        answered: 0,
        noAnswer: 0,
        busy: 0,
        failed: 0,
        topExtension: 'N/A',
        topExtensionCount: 0
    };

    if (!rows || rows.length === 0) return defaults;

    const extActivity = {};
    const result = rows.reduce((acc, r) => {
        acc.total++;
        // Count statuses
        const disp = r.disposition;
        if (disp === 'ANSWERED') acc.answered++;
        else if (disp === 'NO ANSWER') acc.noAnswer++;
        else if (disp === 'BUSY') acc.busy++;
        else if (disp === 'FAILED') acc.failed++;

        // Track extension activity for top extension
        if (extensionsMap[r.src]) {
            extActivity[r.src] = (extActivity[r.src] || 0) + 1;
        }
        if (extensionsMap[r.destination]) {
            extActivity[r.destination] = (extActivity[r.destination] || 0) + 1;
        }

        return acc;
    }, { ...defaults, total: 0 });

    // Find top extension
    let topExt = 'N/A';
    let maxCount = 0;
    for (const [ext, count] of Object.entries(extActivity)) {
        if (count > maxCount) {
            maxCount = count;
            topExt = `${ext} - ${extensionsMap[ext] || ''}`;
        }
    }

    result.topExtension = topExt;
    result.topExtensionCount = maxCount;

    // console.log(`Stats calculation took ${performance.now() - start}ms`);
    return result;
};

/**
 * Processes data for all charts in a single pass where possible.
 * 
 * @param {Array} rows 
 * @param {Object} extensionsMap 
 * @returns {Object} An object containing data structures for all charts.
 */
export const processChartData = (rows, extensionsMap) => {
    const start = performance.now();

    // Init data structures
    // Init data structures - USING FULL 24H TO FIX ALIGNMENT ISSUES
    const START_HOUR = 0;
    const END_HOUR = 23;
    const HOURS_COUNT = 24;

    // Helper to init hourly buckets
    const createHourBuckets = () => Array(HOURS_COUNT).fill(0).map(() => ({ answered: 0, noAnswer: 0, busy: 0, failed: 0 }));
    const hoursStacked = createHourBuckets();

    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const weeklyMatrix = days.map(day => ({ label: day, values: Array(HOURS_COUNT).fill(0) }));

    const destCounts = {};
    const extStatsMap = {};
    const dailyCounts = {};
    const callerCounts = {}; // external callers
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    const callIntervals = [];
    const areaCodeCounts = {};
    const sankeyCounts = {};
    const destExternalCounts = {};
    const srcExtOutgoingCounts = {};
    const dailyBranchCounts = {
        'Tuxtepec': {},
        'Salina Cruz': {},
        'Juchitán': {},
        'BDC': {}
    };
    const lastappCounts = { 'Llamada': 0, 'IVR/Fondo': 0, 'Buzón': 0, 'Colgar': 0, 'Cola': 0, 'Otros': 0 };

    // For Extension Heatmap Grid (integrated into main loop)
    // We will collect hourly data for ALL extensions first, then pick the top 15
    const extHourlyActivity = {};

    // Single Pass Loop (O(n))
    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const calldate = r.calldate;
        if (!calldate) continue;

        // Parse date correctly using local browser timezone (shifts UTC from DB to local time)
        const dateObj = parseCalldate(calldate);
        const hour = dateObj.getHours();
        const pad = (n) => n < 10 ? '0' + n : n;
        const dayStr = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
        const dayIndex = dateObj.getDay();

        let branch = null;
        const srcName = extensionsMap[r.src];
        const destName = extensionsMap[r.destination];

        if (srcName) {
            if (srcName.startsWith('TX')) branch = 'Tuxtepec';
            else if (srcName.startsWith('SC')) branch = 'Salina Cruz';
            else if (srcName.startsWith('JT')) branch = 'Juchitán';
            else if (srcName.startsWith('CB')) branch = 'BDC';
        }

        if (!branch && destName) {
            if (destName.startsWith('TX')) branch = 'Tuxtepec';
            else if (destName.startsWith('SC')) branch = 'Salina Cruz';
            else if (destName.startsWith('JT')) branch = 'Juchitán';
            else if (destName.startsWith('CB')) branch = 'BDC';
        }

        // Trunk Lines Check (Tuxtepec)
        const TX_TRUNKS = ['2878759701', '2878750303'];
        if (!branch) {
            if (TX_TRUNKS.includes(r.src) || TX_TRUNKS.includes(r.destination)) {
                branch = 'Tuxtepec';
            }
        }

        // 1. Weekly Calls (Bar Chart)
        dayCounts[dayIndex]++;

        // 2. Daily Trend (Line Chart)
        dailyCounts[dayStr] = (dailyCounts[dayStr] || 0) + 1;

        // 6c. Track daily trend for branches
        if (branch) {
            dailyBranchCounts[branch][dayStr] = (dailyBranchCounts[branch][dayStr] || 0) + 1;
        }

        // 3. Concurrency Intervals (desde que sonó hasta que se colgó)
        const durationSec = Math.max(parseInt(r.duration || 0, 10), 1);
        const startTime = dateObj.getTime();
        const endTime = startTime + (durationSec * 1000);
        callIntervals.push({ start: startTime, end: endTime, row: r });

        // 4. Area Code (Lada)
        const src = r.src || '';
        if (src.length === 10) {
            const code = src.substring(0, 3);
            areaCodeCounts[code] = (areaCodeCounts[code] || 0) + 1;
        } else if (src.length === 12 && src.startsWith('52')) {
            const code = src.substring(2, 5);
            areaCodeCounts[code] = (areaCodeCounts[code] || 0) + 1;
        }

        // 5. Sankey Flows
        const dispNode = r.disposition || 'UNKNOWN';
        let destNode = r.destination || 'Unknown';
        const flowKey = `${dispNode}|${destNode}`;
        sankeyCounts[flowKey] = (sankeyCounts[flowKey] || 0) + 1;

        // 6. Top Callers (Incoming) / Source Ext (Outgoing)
        if (src) {
            if (!extensionsMap[src]) {
                callerCounts[src] = (callerCounts[src] || 0) + 1;
            } else {
                srcExtOutgoingCounts[src] = (srcExtOutgoingCounts[src] || 0) + 1;
            }
        }

        // 6b. External Destinations (Outgoing)
        const dest = r.destination;
        if (dest && !extensionsMap[dest] && !['s', 'h', 'i', 't'].includes(dest)) {
            destExternalCounts[dest] = (destExternalCounts[dest] || 0) + 1;
        }

        // 7. Hourly Stacked & Weekly Heatmap
        if (hour >= 0 && hour <= 23) {
            const hourIndex = hour;

            // Hourly Stacked
            if (r.disposition === 'ANSWERED') hoursStacked[hourIndex].answered++;
            else if (r.disposition === 'NO ANSWER') hoursStacked[hourIndex].noAnswer++;
            else if (r.disposition === 'BUSY') hoursStacked[hourIndex].busy++;
            else if (r.disposition === 'FAILED') hoursStacked[hourIndex].failed++;

            // Weekly Heatmap
            weeklyMatrix[dayIndex].values[hourIndex]++;

            // 8. Extension Specific Stats & Heatmap Pre-calc
            const dest = r.destination;
            if (dest && extensionsMap[dest]) {
                destCounts[dest] = (destCounts[dest] || 0) + 1;

                // Heatmap tracker for this extension
                if (!extHourlyActivity[dest]) extHourlyActivity[dest] = Array(HOURS_COUNT).fill(0);
                extHourlyActivity[dest][hourIndex]++;

                // Stats Map
                if (!extStatsMap[dest]) {
                    extStatsMap[dest] = {
                        extension: dest,
                        name: extensionsMap[dest] || 'Desconocido',
                        total: 0, answered: 0, noAnswer: 0, busy: 0, failed: 0, totalDuration: 0
                    };
                }
                const stat = extStatsMap[dest];
                stat.total++;
                stat.totalDuration += (r.billsec || 0);

                if (r.disposition === 'ANSWERED') stat.answered++;
                else if (r.disposition === 'NO ANSWER') stat.noAnswer++;
                else if (r.disposition === 'BUSY') stat.busy++;
                else if (r.disposition === 'FAILED') stat.failed++;
            }
        }

        // Conteo de Acción (lastapp)
        const lastappVal = r.lastapp;
        if (lastappVal) {
            let actionCategory = 'Otros';
            if (lastappVal === 'Dial' || lastappVal === 'AppDial') {
                actionCategory = 'Llamada';
            } else if (['BackGround', 'WaitExten', 'Return', 'Playback'].includes(lastappVal)) {
                actionCategory = 'IVR/Fondo';
            } else if (lastappVal.toLowerCase().includes('voicemail')) {
                actionCategory = 'Buzón';
            } else if (lastappVal === 'Hangup') {
                actionCategory = 'Colgar';
            } else if (lastappVal === 'Queue') {
                actionCategory = 'Cola';
            }
            lastappCounts[actionCategory]++;
        } else {
            lastappCounts['Otros']++;
        }
    }

    // --- Post-Processing (Transform into ChartJS formats) ---

    // 1. Hourly Stacked Chart (Dynamically trimmed between first call and last call, preserving 0s in-between)
    let firstActiveHour = -1;
    let lastActiveHour = -1;

    for (let i = 0; i < HOURS_COUNT; i++) {
        const h = hoursStacked[i];
        const total = h.answered + h.noAnswer + h.busy + h.failed;
        if (total > 0) {
            if (firstActiveHour === -1) firstActiveHour = i;
            lastActiveHour = i;
        }
    }

    // Default to 8:00 - 19:00 if no calls exist in range, otherwise use actual first & last active hours
    const startHour = firstActiveHour !== -1 ? firstActiveHour : 8;
    const endHour = lastActiveHour !== -1 ? lastActiveHour : 19;

    const trimmedHourlyLabels = [];
    for (let i = startHour; i <= endHour; i++) {
        trimmedHourlyLabels.push(`${i}:00`);
    }

    const activeHourBuckets = hoursStacked.slice(startHour, endHour + 1);

    const hourlyChart = {
        labels: trimmedHourlyLabels,
        datasets: [
            { label: 'Contestadas', data: activeHourBuckets.map(h => h.answered), borderColor: 'rgb(34, 197, 94)', backgroundColor: 'rgba(34, 197, 94, 0.5)', pointRadius: 4, tension: 0.3 },
            { label: 'No Contestadas', data: activeHourBuckets.map(h => h.noAnswer), borderColor: 'rgb(239, 68, 68)', backgroundColor: 'rgba(239, 68, 68, 0.5)', pointRadius: 4, tension: 0.3 },
            { label: 'Ocupado', data: activeHourBuckets.map(h => h.busy), borderColor: 'rgb(249, 115, 22)', backgroundColor: 'rgba(249, 115, 22, 0.5)', pointRadius: 4, tension: 0.3 },
            { label: 'Fallido', data: activeHourBuckets.map(h => h.failed), borderColor: 'rgb(107, 114, 128)', backgroundColor: 'rgba(107, 114, 128, 0.5)', pointRadius: 4, tension: 0.3 }
        ]
    };

    // 2. Extension Heatmap (Pick top 15 from pre-calculated activity)
    const topDests = Object.entries(destCounts).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([ext]) => ext);
    const extMatrix = topDests.map(ext => ({
        label: `${ext} - ${extensionsMap[ext]?.substring(0, 10) || ''}...`,
        values: extHourlyActivity[ext] || Array(HOURS_COUNT).fill(0)
    }));

    // 3. Ext Stats Table
    const extStatsArray = Object.values(extStatsMap).map(stat => ({
        ...stat,
        avgDuration: stat.answered > 0 ? Math.round(stat.totalDuration / stat.answered) : 0,
        successRate: stat.total > 0 ? ((stat.answered / stat.total) * 100).toFixed(1) : '0.0'
    })).sort((a, b) => b.total - a.total).slice(0, 1000);

    // 4. Daily Chart
    const dailyLabels = Object.keys(dailyCounts).sort();
    const dailyChart = {
        labels: dailyLabels,
        datasets: [{ label: 'Llamadas por Día', data: dailyLabels.map(d => dailyCounts[d]), borderColor: '#111111', backgroundColor: 'rgba(17, 17, 17, 0.1)', fill: true, tension: 0.4 }]
    };

    // 5. Top Callers
    const topCallersList = Object.entries(callerCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const topCallersChart = {
        labels: topCallersList.map(([n]) => n),
        datasets: [{ label: 'Llamadas', data: topCallersList.map(([, c]) => c), backgroundColor: 'rgba(195, 0, 47, 0.8)', borderColor: 'rgb(195, 0, 47)', borderWidth: 1 }]
    };

    // 6. Weekly Calls
    const weeklyCallsChart = {
        labels: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
        datasets: [{
            label: 'Llamadas', data: dayCounts, borderWidth: 2,
            backgroundColor: ['rgba(239, 68, 68, 0.8)', 'rgba(59, 130, 246, 0.8)', 'rgba(34, 197, 94, 0.8)', 'rgba(251, 146, 60, 0.8 )', 'rgba(168, 85, 247, 0.8)', 'rgba(236, 72, 153, 0.8)', 'rgba(14, 165, 233, 0.8)'],
            borderColor: ['rgb(239, 68, 68)', 'rgb(59, 130, 246)', 'rgb(34, 197, 94)', 'rgb(251, 146, 60)', 'rgb(168, 85, 247)', 'rgb(236, 72, 153)', 'rgb(14, 165, 233)']
        }]
    };

    // 7. Area Codes
    const topAreaCodes = Object.entries(areaCodeCounts).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const areaCodeChartData = {
        labels: topAreaCodes.map(([k]) => k),
        datasets: [{ label: 'Llamadas por Lada', data: topAreaCodes.map(([, v]) => v), backgroundColor: 'rgba(54, 162, 235, 0.6)' }]
    };

    // 8. Sankey
    const sankeyData = Object.entries(sankeyCounts).map(([key, value]) => {
        const [from, to] = key.split('|');
        return { from, to, flow: value };
    }).sort((a, b) => b.flow - a.flow).slice(0, 30);

    // 9. Concurrency
    const concurrencyChartData = calculateConcurrency(callIntervals);

    // 10. Treemap Data (Top Callers / Top Destinations)
    const treemapData = topCallersList.map(([name, count]) => ({
        name,
        value: count,
    }));

    const topDestExternalList = Object.entries(destExternalCounts).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const treemapDestData = topDestExternalList.map(([name, count]) => ({
        name,
        value: count
    }));

    const topSrcExtOutgoing = Object.entries(srcExtOutgoingCounts).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const srcExtOutgoingChartData = {
        labels: topSrcExtOutgoing.map(([ext]) => `${ext} - ${extensionsMap[ext] || ''}`),
        datasets: [{ label: 'Llamadas Salientes', data: topSrcExtOutgoing.map(([, c]) => c), backgroundColor: 'rgba(79, 70, 229, 0.8)' }]
    };

    // 11. Calendar Data
    const calendarData = Object.entries(dailyCounts).map(([date, count]) => {
        const d = new Date(date + 'T12:00:00');
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const week = Math.floor((d - yearStart) / (7 * 24 * 60 * 60 * 1000));
        return {
            x: week,
            y: d.getDay(),
            v: count,
            date
        };
    });

    console.log(`Processing ${rows.length} rows took ${Math.round(performance.now() - start)}ms`);

    // Format lastapp / acción chart data
    const lastappChart = {
        labels: Object.keys(lastappCounts),
        datasets: [{
            label: 'Interacciones',
            data: Object.values(lastappCounts),
            backgroundColor: [
                '#6750A4', // Primary Purple
                '#0288D1', // Cyan/Blue
                '#00897B', // Teal
                '#F57C00', // Orange
                '#E91E63', // Pink
                '#78909C'  // Blue Grey (Otros)
            ]
        }]
    };

    return {
        hourly: hourlyChart,
        daily: dailyChart,
        topCallers: topCallersChart,
        weeklyCalls: weeklyCallsChart,
        weeklyHeatmap: weeklyMatrix,
        destExtensionHeatmap: extMatrix,
        extensionStats: extStatsArray,
        concurrency: concurrencyChartData,
        areaCode: areaCodeChartData,
        sankey: { datasets: [{ data: sankeyData }] },
        treemap: treemapData,
        treemapDest: treemapDestData,
        srcExtOutgoing: srcExtOutgoingChartData,
        calendar: calendarData,
        lastapp: lastappChart,
        dailyLine: {
            labels: dailyLabels,
            datasets: [
                {
                    label: 'Tuxtepec',
                    data: dailyLabels.map(date => dailyBranchCounts['Tuxtepec'][date] || 0),
                    borderColor: '#3B82F6', // Blue
                    backgroundColor: '#3B82F622',
                    fill: false,
                    tension: 0.4
                },
                {
                    label: 'Salina Cruz',
                    data: dailyLabels.map(date => dailyBranchCounts['Salina Cruz'][date] || 0),
                    borderColor: '#10B981', // Green
                    backgroundColor: '#10B98122',
                    fill: false,
                    tension: 0.4
                },
                {
                    label: 'Juchitán',
                    data: dailyLabels.map(date => dailyBranchCounts['Juchitán'][date] || 0),
                    borderColor: '#F59E0B', // Amber
                    backgroundColor: '#F59E0B22',
                    fill: false,
                    tension: 0.4
                },
                {
                    label: 'BDC',
                    data: dailyLabels.map(date => dailyBranchCounts['BDC'][date] || 0),
                    borderColor: '#8B5CF6', // Purple
                    backgroundColor: '#8B5CF622',
                    fill: false,
                    tension: 0.4
                }
            ]
        }
    };
};

/**
 * Calcula los picos reales de llamadas simultáneas (>= 2 llamadas coincidiendo al mismo tiempo).
 * Evalúa los intervalos exactos desde que sonó hasta que se colgó la llamada.
 * @param {Array} callIntervals - Array de {start, end, row}
 */
const calculateConcurrency = (callIntervals) => {
    if (!callIntervals || callIntervals.length === 0) {
        return {
            labels: [],
            datasets: [{
                label: 'Llamadas Simultáneas',
                data: [],
                borderColor: '#EC4899',
                backgroundColor: 'rgba(236, 72, 153, 0.15)',
                fill: true,
                tension: 0.3
            }],
            episodes: []
        };
    }

    // 1. Generar eventos de inicio (+1) y fin (-1)
    const events = [];
    for (let idx = 0; idx < callIntervals.length; idx++) {
        const item = callIntervals[idx];
        if (item.start && item.end && item.end >= item.start) {
            events.push({ time: item.start, type: 1, row: item.row, id: idx });
            events.push({ time: item.end, type: -1, row: item.row, id: idx });
        }
    }

    // 2. Ordenar cronológicamente. Si empatan en tiempo, procesar fines (-1) antes que inicios (+1)
    events.sort((a, b) => {
        if (a.time !== b.time) return a.time - b.time;
        return a.type - b.type;
    });

    const activeCallsMap = new Map();
    const episodes = [];
    let currentEpisode = null;

    // 3. Barrido temporal para capturar episodios donde coinciden >= 2 llamadas
    for (let i = 0; i < events.length; i++) {
        const e = events[i];
        if (e.type === 1) {
            activeCallsMap.set(e.id, e.row);
        } else {
            activeCallsMap.delete(e.id);
        }

        const count = activeCallsMap.size;

        if (count >= 2) {
            if (!currentEpisode) {
                // Inicia un nuevo período de simultaneidad
                currentEpisode = {
                    startTime: e.time,
                    peakTime: e.time,
                    maxConcurrent: count,
                    callsMap: new Map(activeCallsMap)
                };
            } else {
                // Actualizar el pico más alto registrado en esta coincidencia
                if (count > currentEpisode.maxConcurrent) {
                    currentEpisode.maxConcurrent = count;
                    currentEpisode.peakTime = e.time;
                }
                // Acumular todas las llamadas que formaron parte del solapamiento
                activeCallsMap.forEach((call, id) => {
                    currentEpisode.callsMap.set(id, call);
                });
            }
        } else {
            // Concurrencia bajó a menos de 2: cerrar el episodio de pico
            if (currentEpisode) {
                currentEpisode.endTime = e.time;
                currentEpisode.durationSec = Math.max(Math.round((currentEpisode.endTime - currentEpisode.startTime) / 1000), 1);
                currentEpisode.calls = Array.from(currentEpisode.callsMap.values());
                episodes.push(currentEpisode);
                currentEpisode = null;
            }
        }
    }

    if (currentEpisode) {
        currentEpisode.endTime = events[events.length - 1]?.time || currentEpisode.startTime;
        currentEpisode.durationSec = Math.max(Math.round((currentEpisode.endTime - currentEpisode.startTime) / 1000), 1);
        currentEpisode.calls = Array.from(currentEpisode.callsMap.values());
        episodes.push(currentEpisode);
    }

    if (episodes.length === 0) {
        return {
            labels: [],
            datasets: [{
                label: 'Llamadas Simultáneas',
                data: [],
                borderColor: '#EC4899',
                backgroundColor: 'rgba(236, 72, 153, 0.15)',
                fill: true,
                tension: 0.3
            }],
            episodes: []
        };
    }

    // 4. Formatear etiquetas de fecha y hora
    const firstDate = new Date(episodes[0].peakTime);
    const lastDate = new Date(episodes[episodes.length - 1].peakTime);
    const isSameDay = firstDate.toDateString() === lastDate.toDateString();

    const labels = episodes.map(ep => {
        const d = new Date(ep.peakTime);
        if (isSameDay) {
            return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } else {
            const dayMonth = d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
            const time = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return `${dayMonth} ${time}`;
        }
    });

    const data = episodes.map(ep => ep.maxConcurrent);

    return {
        labels,
        datasets: [{
            label: 'Llamadas Simultáneas',
            data,
            borderColor: '#EC4899',
            backgroundColor: 'rgba(236, 72, 153, 0.15)',
            fill: true,
            tension: 0.3
        }],
        episodes
    };
};
