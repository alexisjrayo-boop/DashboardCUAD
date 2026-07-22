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
        'CUAD': {}
    };

    // For Extension Heatmap Grid (integrated into main loop)
    // We will collect hourly data for ALL extensions first, then pick the top 15
    const extHourlyActivity = {};

    // Single Pass Loop (O(n))
    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const calldate = r.calldate;
        if (!calldate) continue;

        // FAST DATE PARSING: Use string ops for local time logic instead of new Date()
        // Format: YYYY-MM-DD HH:mm:ss OR YYYY-MM-DDTHH:mm:ss.sssZ
        const isISO = calldate.includes('T');
        const hour = parseInt(isISO ? calldate.substring(11, 13) : calldate.substring(11, 13), 10);
        const dayStr = calldate.substring(0, 10); // YYYY-MM-DD

        // For day of week, we still need Date, but we can cache it or only do it if needed
        const dateObj = new Date(calldate.replace('T', ' ').replace('Z', ''));
        const dayIndex = dateObj.getDay();

        let branch = null;
        const srcName = extensionsMap[r.src];
        const destName = extensionsMap[r.destination];

        if (srcName) {
            if (srcName.startsWith('TX')) branch = 'Tuxtepec';
            else if (srcName.startsWith('SC')) branch = 'Salina Cruz';
            else if (srcName.startsWith('JT')) branch = 'Juchitán';
            else if (srcName.startsWith('CB')) branch = 'CUAD';
        }

        if (!branch && destName) {
            if (destName.startsWith('TX')) branch = 'Tuxtepec';
            else if (destName.startsWith('SC')) branch = 'Salina Cruz';
            else if (destName.startsWith('JT')) branch = 'Juchitán';
            else if (destName.startsWith('CB')) branch = 'CUAD';
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

        // 3. Concurrency Intervals
        const durationSec = parseInt(r.duration || 0, 10);
        const startTime = dateObj.getTime();
        const endTime = startTime + (durationSec * 1000);
        callIntervals.push({ start: startTime, end: endTime });

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
    }

    // --- Post-Processing (Transform into ChartJS formats) ---

    // 1. Hourly Stacked Chart
    const hourlyChart = {
        labels: Array.from({ length: HOURS_COUNT }, (_, i) => `${i + START_HOUR}:00`),
        datasets: [
            { label: 'Contestadas', data: hoursStacked.map(h => h.answered), borderColor: 'rgb(34, 197, 94)', backgroundColor: 'rgba(34, 197, 94, 0.5)', pointRadius: 4, tension: 0.3 },
            { label: 'No Contestadas', data: hoursStacked.map(h => h.noAnswer), borderColor: 'rgb(239, 68, 68)', backgroundColor: 'rgba(239, 68, 68, 0.5)', pointRadius: 4, tension: 0.3 },
            { label: 'Ocupado', data: hoursStacked.map(h => h.busy), borderColor: 'rgb(249, 115, 22)', backgroundColor: 'rgba(249, 115, 22, 0.5)', pointRadius: 4, tension: 0.3 },
            { label: 'Fallido', data: hoursStacked.map(h => h.failed), borderColor: 'rgb(107, 114, 128)', backgroundColor: 'rgba(107, 114, 128, 0.5)', pointRadius: 4, tension: 0.3 }
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
                    label: 'CUAD',
                    data: dailyLabels.map(date => dailyBranchCounts['CUAD'][date] || 0),
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
 * Calculates max concurrent calls per hour.
 * @param {Array} callIntervals - Array of {start, end} timestamps
 */
const calculateConcurrency = (callIntervals) => {
    if (callIntervals.length === 0) return { labels: [], datasets: [] };

    // Events approach: +1 at start, -1 at end
    const events = [];
    callIntervals.forEach(i => {
        events.push({ time: i.start, type: 1 });
        events.push({ time: i.end, type: -1 });
    });
    // Sort events by time
    events.sort((a, b) => a.time - b.time);

    let currentConcurrent = 0;
    const hourMaxMap = new Map();

    events.forEach(e => {
        currentConcurrent += e.type;
        // Optimization: Date creation can be slow. 
        // But for hour buckets we need it. 
        const d = new Date(e.time);
        // Creating Key: "16 Dec, 10:00"
        d.setMinutes(0, 0, 0);
        // Using toLocaleString is a bit slow inside a loop of potentially 300k events.
        // Faster key: YYYY-MM-DD-HH
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;

        // We only really care about updating the max for this hour
        const currentMax = hourMaxMap.get(key) || { max: 0, label: d.toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) };

        if (currentConcurrent > currentMax.max) {
            currentMax.max = currentConcurrent;
            hourMaxMap.set(key, currentMax);
        } else if (!hourMaxMap.has(key)) {
            hourMaxMap.set(key, currentMax);
        }
    });

    // Convert map to chart arrays
    // Sort keys based on time? 
    // keys are "YYYY-MM-DD-HH", checking string order might work if we pad.
    // Let's just trust the insertion order (mostly chronological due to event sort)
    // or sort the Map entries.
    const sortedEntries = Array.from(hourMaxMap.entries()).sort((a, b) => {
        // Recover time from key or just rely on events order?
        // Events are sorted, so map insertion *should* be chronological for the FIRST time we see an hour.
        // But we might revisit an hour? No, time moves forward.
        return 0; // Assume sorted
    });

    return {
        labels: sortedEntries.map(e => e[1].label),
        datasets: [{
            label: 'Llamadas Simultáneas Máximas',
            data: sortedEntries.map(e => e[1].max),
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            fill: true,
            tension: 0.4
        }]
    };
};
