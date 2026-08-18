import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { Chart as ChartJS } from 'chart.js';
import { processChartData } from './dashboardProcessing';

/**
 * Exporta el listado de llamadas (logs CDR) a un archivo Excel (.xlsx) de 1 sola pestaña.
 */
export const exportLogsToExcel = (data = [], extensionsMap = {}, filters = {}) => {
    if (!data || data.length === 0) {
        alert('No hay registros de llamadas para exportar.');
        return;
    }

    const splitCalldate = (calldate) => {
        if (!calldate) return { dateStr: '', timeStr: '' };
        const str = String(calldate).replace('T', ' ');
        const parts = str.split(' ');
        const dateRaw = parts[0] || '';
        const timeRaw = parts[1] ? parts[1].substring(0, 8) : '';
        let formattedDate = dateRaw;
        if (dateRaw.includes('-')) {
            const dParts = dateRaw.split('-');
            if (dParts.length === 3 && dParts[0].length === 4) {
                formattedDate = `${dParts[2]}/${dParts[1]}/${dParts[0]}`;
            }
        }
        return { dateStr: formattedDate, timeStr: timeRaw };
    };

    const rows = data.map((r) => {
        const srcName = typeof extensionsMap[r.src] === 'string' ? extensionsMap[r.src] : (r.clid || r.source || '');
        const destName = r.destination_desc || (typeof extensionsMap[r.destination] === 'string' ? extensionsMap[r.destination] : (typeof extensionsMap[r.dst] === 'string' ? extensionsMap[r.dst] : ''));

        let dispositionEs = r.disposition;
        if (r.disposition === 'ANSWERED') dispositionEs = 'Contestada';
        else if (r.disposition === 'NO ANSWER') dispositionEs = 'No Contestada';
        else if (r.disposition === 'BUSY') dispositionEs = 'Ocupado';
        else if (r.disposition === 'FAILED' || r.disposition === 'CONGESTION') dispositionEs = 'Fallida';

        let callTypeEs = 'Interna';
        if (String(r.calltype) === '2') callTypeEs = 'Entrante';
        else if (String(r.calltype) === '3') callTypeEs = 'Saliente';

        const { dateStr, timeStr } = splitCalldate(r.calldate);

        return {
            'ID CDR': r.cdr_id || '',
            'Fecha': dateStr,
            'Hora': timeStr,
            'Origen (Ext/Núm)': r.src || '',
            'Nombre Origen': srcName,
            'Destino (Ext/Núm)': r.destination || r.dst || '',
            'Nombre Destino': destName,
            'Estado': dispositionEs,
            'Duración (seg)': r.duration || 0,
            'Tiempo Hablado (seg)': r.billsec || 0,
            'Duración Formateada': r.duration ? `${Math.floor(r.duration / 60)}m ${r.duration % 60}s` : '0s',
            'Tiempo Hablado Formateado': r.billsec ? `${Math.floor(r.billsec / 60)}m ${r.billsec % 60}s` : '0s',
            'Tipo de Llamada': callTypeEs,
            'Canal Origen': r.channel || '',
            'Canal Destino': r.dstchannel || ''
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    const colWidths = [
        { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 25 },
        { wch: 18 }, { wch: 25 }, { wch: 15 }, { wch: 14 }, { wch: 18 },
        { wch: 18 }, { wch: 22 }, { wch: 15 }, { wch: 25 }, { wch: 25 }
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Logs');

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const filename = `logs_llamadas_cuad_${dateStr}.xlsx`;

    XLSX.writeFile(workbook, filename);
};

/**
 * Exporta el Reporte Ejecutivo de Gráficos a PDF usando Chart.js nativo.
 * Genera exactamente las mismas gráficas que el dashboard, respetando el filtro activo.
 */
export const exportChartsToPDF = async (stats = {}, filters = {}, configCharts = [], data = [], extensionsMap = {}, options = {}) => {
    try {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const PW = pdf.internal.pageSize.getWidth();   // 210mm
        const PH = pdf.internal.pageSize.getHeight();  // 297mm
        const M = 12;
        const AW = PW - M * 2;  // 186mm
        const FH = 12;

        // Paleta
        const RED = [195, 0, 47];
        const SLATE = [15, 23, 42];
        const LIGHT = [248, 250, 252];
        const BORDER = [226, 232, 240];

        // ── Datos ─────────────────────────────────────────────────────────────
        const safeData = Array.isArray(data) ? data : [];
        const totalCalls = safeData.length;
        const answered = safeData.filter(r => r.disposition === 'ANSWERED').length;
        const noAnswer = safeData.filter(r => r.disposition === 'NO ANSWER').length;
        const busy = safeData.filter(r => r.disposition === 'BUSY').length;
        const failed = safeData.filter(r => ['FAILED', 'CONGESTION'].includes(r.disposition)).length;

        // Mismo procesamiento que usa el dashboard con mapa de extensiones
        const chartData = processChartData(safeData, extensionsMap);

        // ── Helper: render de Chart.js en canvas offscreen ────────────────────
        const CW = 1860, CH = 870;  // aspect 2.14:1 idéntico al slot PDF

        const renderChart = (type, cd, extraOpts = {}) => new Promise(resolve => {
            const canvas = document.createElement('canvas');
            canvas.width = CW;
            canvas.height = CH;
            canvas.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none';
            document.body.appendChild(canvas);

            const chart = new ChartJS(canvas.getContext('2d'), {
                type,
                data: cd,
                options: {
                    responsive: false,
                    animation: false,
                    layout: { padding: { top: 20, right: 40, bottom: 20, left: 40 } },
                    plugins: {
                        legend: {
                            display: true,
                            labels: { font: { size: 24, family: 'Arial', weight: 'bold' }, padding: 28, usePointStyle: true }
                        }
                    },
                    ...extraOpts
                },
                plugins: [{
                    id: 'custom_canvas_background_color',
                    beforeDraw: (chart) => {
                        const ctx = chart.canvas.getContext('2d');
                        ctx.save();
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, chart.width, chart.height);
                        ctx.restore();
                    }
                }]
            });

            setTimeout(() => {
                const imgData = canvas.toDataURL('image/jpeg', 0.7);
                chart.destroy();
                document.body.removeChild(canvas);
                resolve({ imgData, title: cd._title || '' });
            }, 280);
        });

        const axisStyle = {
            ticks: { font: { size: 22, family: 'Arial' }, color: '#475569' },
            grid: { color: 'rgba(226,232,240,0.8)' },
            border: { color: '#e2e8f0' }
        };

        // ── Generación de gráficas (las mismas que el dashboard) ──────────────
        const captures = [];

        // Porcentaje helper
        const calcPct = (val) => totalCalls > 0 ? ((val / totalCalls) * 100).toFixed(1) : '0.0';

        // 1. DOUGHNUT — Estado de Llamadas (con porcentaje explícito en la leyenda y colores exactos del dashboard)
        if (totalCalls > 0) {
            const d1 = {
                _title: 'ESTADO DE LLAMADAS',
                labels: [
                    `Contestadas: ${answered.toLocaleString()} (${calcPct(answered)}%)`,
                    `No Contestadas: ${noAnswer.toLocaleString()} (${calcPct(noAnswer)}%)`,
                    `Ocupado: ${busy.toLocaleString()} (${calcPct(busy)}%)`,
                    `Fallido: ${failed.toLocaleString()} (${calcPct(failed)}%)`
                ],
                datasets: [{
                    data: [answered, noAnswer, busy, failed],
                    backgroundColor: ['#10B981', '#EF4444', '#F59E0B', '#64748B'], // Emerald, Red, Amber, Slate (Dashboard colors)
                    borderWidth: 3, borderColor: '#ffffff', hoverOffset: 10
                }]
            };
            captures.push(await renderChart('doughnut', d1, {
                cutout: '68%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { font: { size: 26, weight: 'bold', family: 'Arial' }, padding: 32, usePointStyle: true }
                    }
                }
            }));
        }

        // 2. LINE — Detalle por Hora (4 series: Contestadas, No Contestadas, Ocupado, Fallido)
        if (chartData.hourly) {
            const dh = { ...chartData.hourly, _title: 'DETALLE POR HORA DEL DÍA' };
            dh.datasets = dh.datasets.map(ds => ({ ...ds, borderWidth: 4, pointRadius: 4, tension: 0.4 }));
            captures.push(await renderChart('line', dh, {
                scales: {
                    x: { ...axisStyle, ticks: { ...axisStyle.ticks, maxRotation: 0 } },
                    y: { ...axisStyle, ticks: { ...axisStyle.ticks, callback: v => v.toLocaleString() } }
                },
                plugins: { legend: { labels: { font: { size: 22, family: 'Arial' }, padding: 24, usePointStyle: true } } }
            }));
        }

        // 3. LINE — Tendencia Diaria (con color de línea corporativo GASME)
        if (chartData.daily && chartData.daily.labels.length > 0) {
            const dd = { ...chartData.daily, _title: 'TENDENCIA DIARIA DE LLAMADAS' };
            dd.datasets = dd.datasets.map(ds => ({
                ...ds,
                borderColor: '#C3002F',
                backgroundColor: 'rgba(195, 0, 47, 0.08)',
                borderWidth: 4, pointRadius: 3, fill: true, tension: 0.4
            }));
            captures.push(await renderChart('line', dd, {
                scales: {
                    x: { ...axisStyle, ticks: { ...axisStyle.ticks, maxRotation: 45 } },
                    y: { ...axisStyle, ticks: { ...axisStyle.ticks, callback: v => v.toLocaleString() } }
                },
                plugins: { legend: { display: false } }
            }));
        }

        // 4. BAR — Distribución Semanal (con los 7 colores de día exactos del dashboard)
        if (chartData.weeklyCalls) {
            const dw = { ...chartData.weeklyCalls, _title: 'DISTRIBUCIÓN POR DÍA DE LA SEMANA' };
            dw.datasets = dw.datasets.map(ds => ({
                ...ds,
                backgroundColor: ['#EF4444', '#3B82F6', '#10B981', '#F97316', '#8B5CF6', '#EC4899', '#06B6D4'],
                borderRadius: 12, borderSkipped: false
            }));
            captures.push(await renderChart('bar', dw, {
                scales: {
                    x: axisStyle,
                    y: { ...axisStyle, ticks: { ...axisStyle.ticks, callback: v => v.toLocaleString() } }
                },
                plugins: { legend: { display: false } }
            }));
        }

        // 5. BAR — Llamadas por Código de Área (Entrantes) / Extensiones más Activas (Salientes)
        const isOutgoing = filters.calltype === '3';
        if (isOutgoing && chartData.srcExtOutgoing && chartData.srcExtOutgoing.labels.length > 0) {
            const dExt = { ...chartData.srcExtOutgoing, _title: 'EXTENSIONES MÁS ACTIVAS' };
            dExt.datasets = dExt.datasets.map(ds => ({ ...ds, borderRadius: 10, borderSkipped: false }));
            captures.push(await renderChart('bar', dExt, {
                scales: {
                    x: { ...axisStyle, ticks: { ...axisStyle.ticks, maxRotation: 45 } },
                    y: { ...axisStyle, ticks: { ...axisStyle.ticks, callback: v => v.toLocaleString() } }
                },
                plugins: { legend: { display: false } }
            }));
        } else if (chartData.areaCode && chartData.areaCode.labels.length > 0) {
            const da = { ...chartData.areaCode, _title: 'LLAMADAS POR CÓDIGO DE ÁREA (LADA)' };
            da.datasets = da.datasets.map(ds => ({ ...ds, borderRadius: 10, borderSkipped: false }));
            captures.push(await renderChart('bar', da, {
                scales: {
                    x: { ...axisStyle, ticks: { ...axisStyle.ticks, maxRotation: 45 } },
                    y: { ...axisStyle, ticks: { ...axisStyle.ticks, callback: v => v.toLocaleString() } }
                },
                plugins: { legend: { display: false } }
            }));
        }

        // 6. LINE — Tendencia Diaria por Línea / Sucursal (colores exactos de sucursales)
        if (chartData.dailyLine && chartData.dailyLine.labels.length > 0) {
            const dl = { ...chartData.dailyLine, _title: 'TENDENCIA DIARIA POR LÍNEA / SUCURSAL' };
            dl.datasets = dl.datasets.map(ds => ({ ...ds, borderWidth: 4, pointRadius: 3, tension: 0.4 }));
            captures.push(await renderChart('line', dl, {
                scales: {
                    x: { ...axisStyle, ticks: { ...axisStyle.ticks, maxRotation: 45 } },
                    y: { ...axisStyle, ticks: { ...axisStyle.ticks, callback: v => v.toLocaleString() } }
                },
                plugins: { legend: { labels: { font: { size: 22, family: 'Arial' }, padding: 24, usePointStyle: true } } }
            }));
        }

        // ── Helpers de dibujo PDF ─────────────────────────────────────────────
        const LABEL_H = 6.5;

        const drawChartSlot = (capture, slotY, slotH) => {
            const { imgData, title } = capture;

            // Franja de título / etiqueta de la gráfica
            pdf.setFillColor(...LIGHT);
            pdf.setDrawColor(...BORDER);
            pdf.roundedRect(M, slotY + 1, AW, LABEL_H, 1.5, 1.5, 'FD');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7);
            pdf.setTextColor(...SLATE);
            pdf.text(title, M + 3.5, slotY + 1 + LABEL_H * 0.68);

            // Contenedor blanco con bordes visibles
            const imgAreaY = slotY + 1 + LABEL_H + 1;
            const imgAreaH = slotH - 3.5 - LABEL_H;
            const boxX = M;
            const boxY = imgAreaY;
            const boxW = AW;
            const boxH = imgAreaH;

            pdf.setFillColor(255, 255, 255);
            pdf.setDrawColor(...BORDER);
            pdf.roundedRect(boxX, boxY, boxW, boxH, 2, 2, 'FD');

            // Imagen dentro de los bordes con 2.5mm de padding interno para mantener márgenes
            const PAD = 2.5;
            const maxW = boxW - (PAD * 2);
            const maxH = boxH - (PAD * 2);
            const aspect = CW / CH;

            let imgW = maxW;
            let imgH = imgW / aspect;
            if (imgH > maxH) {
                imgH = maxH;
                imgW = imgH * aspect;
            }

            const imgX = boxX + (boxW - imgW) / 2;
            const imgY = boxY + (boxH - imgH) / 2;

            pdf.addImage(imgData, 'JPEG', imgX, imgY, imgW, imgH);
        };

        // ── Determinación de Tipo de Reporte, Período y Líneas ────────────────
        let periodCategory = 'PERSONALIZADO';
        const strToTest = `${filters.frequency || ''} ${filters.customPeriodName || ''} ${filters.period || ''}`.toLowerCase();

        if (strToTest.includes('semanal') || strToTest.includes('semana') || strToTest.includes('weekly') || strToTest.includes('week')) {
            periodCategory = 'SEMANAL';
        } else if (strToTest.includes('quincenal') || strToTest.includes('quincena')) {
            periodCategory = 'QUINCENAL';
        } else if (strToTest.includes('mensual') || strToTest.includes('mes') || strToTest.includes('monthly') || strToTest.includes('month')) {
            periodCategory = 'MENSUAL';
        } else if (strToTest.includes('diario') || strToTest.includes('día') || strToTest.includes('dia') || strToTest.includes('yesterday')) {
            periodCategory = 'DIARIO';
        } else {
            periodCategory = 'PERSONALIZADO';
        }

        const reportTitleHeader = `GASME CUAD — REPORTE ${periodCategory}`;

        let lineDesc = 'General';
        const rawLine = filters.dst || filters.line || filters.phone_lines;
        if (rawLine && rawLine !== 'all' && rawLine !== 'Todas') {
            lineDesc = rawLine;
        }

        // Formateo de Período Limpio: "2026-08-01 al 2026-08-13" sin prefijos ni nombres de destinatario
        let rf = 'Período Completo';
        const cleanDateStr = (dStr) => {
            if (!dStr) return '';
            const str = String(dStr).replace('T', ' ');
            const datePart = str.split(' ')[0] || '';
            const dParts = datePart.split('-');
            if (dParts.length === 3) {
                return `${dParts[0]}-${dParts[1]}-${dParts[2]}`;
            }
            return datePart;
        };

        if (filters.startDate && filters.endDate) {
            rf = `${cleanDateStr(filters.startDate)} al ${cleanDateStr(filters.endDate)}`;
        } else if (filters.customPeriodName) {
            const match = filters.customPeriodName.match(/(\d{4}-\d{2}-\d{2}\s*al\s*\d{4}-\d{2}-\d{2})/i) ||
                          filters.customPeriodName.match(/(\d{2}\/\d{2}\/\d{4}\s*al\s*\d{2}\/\d{2}\/\d{4})/i);
            if (match) {
                rf = match[1];
            } else {
                let clean = filters.customPeriodName
                    .replace(/Periodo\s+Seleccionado\s*\(?/i, '')
                    .replace(/\)?\s*-.*$/, '')
                    .trim();
                rf = clean || filters.customPeriodName;
            }
        }

        const footerLabel = `Período: ${rf} | Líneas: ${lineDesc}`;

        let currentPage = 1;
        const drawFooter = (p, total) => {
            pdf.setDrawColor(...BORDER);
            pdf.line(M, PH - FH + 2, PW - M, PH - FH + 2);
            pdf.setFontSize(7); pdf.setTextColor(148, 163, 184); pdf.setFont('helvetica', 'normal');
            pdf.text(footerLabel, M, PH - 4);
            if (total) pdf.text(`Página ${p} de ${total}`, PW - M, PH - 4, { align: 'right' });
        };

        // ── Página 1: Banner + KPIs + 2 primeras gráficas ────────────────────
        pdf.setFillColor(...RED);
        pdf.rect(0, 0, PW, 22, 'F');
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13.5); pdf.setTextColor(255, 255, 255);
        pdf.text(reportTitleHeader, M, 14);

        let y = 25;

        // Metadata
        pdf.setFillColor(...LIGHT); pdf.setDrawColor(...BORDER);
        pdf.roundedRect(M, y, AW, 12, 2, 2, 'FD');
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(...SLATE);
        pdf.text('INFORMACIÓN DEL INFORME', M + 3, y + 4.5);
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5); pdf.setTextColor(51, 65, 85);
        const fe = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
        pdf.text(`Generado: ${fe}`, M + 3, y + 9);
        pdf.text(`Período: ${rf}`, M + 75, y + 9);
        pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...RED);
        pdf.text(`Total: ${totalCalls.toLocaleString()} llamadas`, PW - M - 3, y + 9, { align: 'right' });
        y += 16;

        // KPI Cards
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.setTextColor(...SLATE);
        pdf.text('RESUMEN EJECUTIVO', M, y); y += 4;

        const KW = (AW - 12) / 5;
        const KH = 20;
        const kpis = [
            { label: 'TOTAL LLAMADAS', val: totalCalls.toLocaleString(), sub: '100%', color: RED },
            { label: 'CONTESTADAS', val: answered.toLocaleString(), sub: `${totalCalls > 0 ? ((answered / totalCalls) * 100).toFixed(1) : 0}%`, color: [16, 185, 129] },
            { label: 'NO CONTESTADAS', val: noAnswer.toLocaleString(), sub: `${totalCalls > 0 ? ((noAnswer / totalCalls) * 100).toFixed(1) : 0}%`, color: [239, 68, 68] },
            { label: 'OCUPADO', val: busy.toLocaleString(), sub: `${totalCalls > 0 ? ((busy / totalCalls) * 100).toFixed(1) : 0}%`, color: [245, 158, 11] },
            { label: 'FALLIDAS', val: failed.toLocaleString(), sub: `${totalCalls > 0 ? ((failed / totalCalls) * 100).toFixed(1) : 0}%`, color: [100, 116, 139] }
        ];
        kpis.forEach((k, i) => {
            const bx = M + i * (KW + 3);
            pdf.setFillColor(255, 255, 255); pdf.setDrawColor(...BORDER);
            pdf.roundedRect(bx, y, KW, KH, 2, 2, 'FD');
            pdf.setFillColor(...k.color); pdf.rect(bx, y + 3, 1.5, KH - 6, 'F');
            pdf.setFontSize(5.5); pdf.setTextColor(100, 116, 139); pdf.setFont('helvetica', 'bold');
            pdf.text(k.label, bx + 3.5, y + 6.5);
            pdf.setFontSize(12); pdf.setTextColor(...k.color);
            pdf.text(k.val, bx + 3.5, y + 13.5);
            pdf.setFontSize(6); pdf.setTextColor(148, 163, 184); pdf.setFont('helvetica', 'normal');
            pdf.text(k.sub, bx + 3.5, y + 18.5);
        });
        y += KH + 3;

        // 2 gráficas en página 1
        const p1SlotH = Math.floor((PH - FH - y - 3) / 2);
        for (let i = 0; i < Math.min(2, captures.length); i++) {
            drawChartSlot(captures[i], y + i * p1SlotH, p1SlotH);
        }
        drawFooter(1, null);

        // ── Páginas 2+: 3 gráficas por página ────────────────────────────────
        const remaining = captures.slice(2);
        let ci = 0;
        while (ci < remaining.length) {
            pdf.addPage(); currentPage++;
            pdf.setFillColor(...SLATE); pdf.rect(0, 0, PW, 14, 'F');
            pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.setTextColor(255, 255, 255);
            pdf.text(reportTitleHeader, M, 10);

            const availH = PH - FH - 16;
            const sH = Math.floor(availH / 3);
            for (let s = 0; s < 3 && ci < remaining.length; s++) {
                drawChartSlot(remaining[ci], 15 + s * sH, sH);
                ci++;
            }
            drawFooter(currentPage, null);
        }

        // ── Páginas de Tabla de Análisis por Extensión (TODAS las extensiones) ──
        pdf.addPage(); currentPage++;
        let tableY = 22;
        const maxTableY = PH - FH - 15;

        // Cálculo de Estadísticas para TODAS las Extensiones
        const extMapStats = {};
        safeData.forEach(r => {
            const srcExt = r.src ? String(r.src).trim() : '';
            const destExt = (r.destination || r.dst) ? String(r.destination || r.dst).trim() : '';

            const processExt = (extKey) => {
                if (!extKey) return;
                const isKnown = typeof extensionsMap[extKey] === 'string';
                const isNumericExt = /^\d{3,4}$/.test(extKey);
                if (!isKnown && !isNumericExt) return;

                if (!extMapStats[extKey]) {
                    extMapStats[extKey] = {
                        ext: extKey,
                        name: typeof extensionsMap[extKey] === 'string' ? extensionsMap[extKey] : (extKey === srcExt ? (r.clid || '') : ''),
                        total: 0,
                        answered: 0,
                        noAnswer: 0,
                        busyFailed: 0,
                        totalBillsec: 0
                    };
                }

                extMapStats[extKey].total++;
                if (r.disposition === 'ANSWERED') {
                    extMapStats[extKey].answered++;
                    extMapStats[extKey].totalBillsec += (r.billsec || 0);
                } else if (r.disposition === 'NO ANSWER') {
                    extMapStats[extKey].noAnswer++;
                } else {
                    extMapStats[extKey].busyFailed++;
                }
            };

            processExt(srcExt);
            if (destExt && destExt !== srcExt) {
                processExt(destExt);
            }
        });

        const allExts = Object.values(extMapStats).sort((a, b) => b.total - a.total);

        const formatDur = (sec) => {
            if (!sec || sec <= 0) return '0s';
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            const s = sec % 60;
            if (h > 0) return `${h}h ${m}m`;
            if (m > 0) return `${m}m ${s}s`;
            return `${s}s`;
        };

        const cols = [
            { header: '#', w: 10, align: 'center' },
            { header: 'EXTENSIÓN', w: 22, align: 'left' },
            { header: 'NOMBRE / DESCRIPCIÓN', w: 52, align: 'left' },
            { header: 'TOTAL LLAM.', w: 20, align: 'right' },
            { header: 'CONTESTADAS', w: 22, align: 'right' },
            { header: 'NO CONTEST.', w: 20, align: 'right' },
            { header: 'OCUP./FALL.', w: 18, align: 'right' },
            { header: 'T. HABLADO', w: 22, align: 'right' }
        ];

        const rowH = 7;

        const drawTableHeader = () => {
            pdf.setFillColor(...SLATE); pdf.rect(0, 0, PW, 14, 'F');
            pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.setTextColor(255, 255, 255);
            pdf.text(reportTitleHeader, M, 10);

            pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.setTextColor(...SLATE);
            pdf.text('DETALLE DE ACTIVIDAD POR EXTENSIÓN', M, tableY);
            pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5); pdf.setTextColor(100, 116, 139);
            pdf.text(`Desglose total de ${allExts.length} extensión(es) con actividad en el período seleccionado.`, M, tableY + 4);
            tableY += 8;

            pdf.setFillColor(...SLATE);
            pdf.rect(M, tableY, AW, rowH, 'F');
            pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6.5); pdf.setTextColor(255, 255, 255);

            let curX = M;
            cols.forEach(c => {
                const textX = c.align === 'right' ? curX + c.w - 2 : (c.align === 'center' ? curX + c.w / 2 : curX + 2);
                pdf.text(c.header, textX, tableY + 4.8, { align: c.align === 'right' ? 'right' : (c.align === 'center' ? 'center' : 'left') });
                curX += c.w;
            });
            tableY += rowH;
        };

        drawTableHeader();

        let sumTotal = 0, sumAns = 0, sumNoAns = 0, sumBusyFail = 0, sumSec = 0;

        if (allExts.length === 0) {
            pdf.setFillColor(255, 255, 255);
            pdf.rect(M, tableY, AW, rowH, 'F');
            pdf.setFont('helvetica', 'italic'); pdf.setFontSize(6.5); pdf.setTextColor(148, 163, 184);
            pdf.text('No hay registros de extensiones disponibles en este período.', M + 4, tableY + 4.8);
            tableY += rowH;
        } else {
            allExts.forEach((row, idx) => {
                if (tableY + rowH > maxTableY) {
                    drawFooter(currentPage, null);
                    pdf.addPage(); currentPage++;
                    tableY = 22;
                    drawTableHeader();
                }

                sumTotal += row.total;
                sumAns += row.answered;
                sumNoAns += row.noAnswer;
                sumBusyFail += row.busyFailed;
                sumSec += row.totalBillsec;

                const bg = idx % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
                pdf.setFillColor(...bg); pdf.setDrawColor(...BORDER);
                pdf.rect(M, tableY, AW, rowH, 'FD');

                const rowData = [
                    { text: String(idx + 1), bold: true },
                    { text: row.ext, bold: true },
                    { text: row.name || 'Sin asignación' },
                    { text: row.total.toLocaleString(), bold: true },
                    { text: row.answered.toLocaleString() },
                    { text: row.noAnswer.toLocaleString() },
                    { text: row.busyFailed.toLocaleString() },
                    { text: formatDur(row.totalBillsec) }
                ];

                let curX = M;
                cols.forEach((c, cIdx) => {
                    const cell = rowData[cIdx];
                    pdf.setFont('helvetica', cell.bold ? 'bold' : 'normal'); pdf.setFontSize(6.5); pdf.setTextColor(...SLATE);
                    const textX = c.align === 'right' ? curX + c.w - 2 : (c.align === 'center' ? curX + c.w / 2 : curX + 2);

                    let textVal = cell.text;
                    if (cIdx === 2 && textVal.length > 32) {
                        textVal = textVal.substring(0, 30) + '...';
                    }

                    pdf.text(textVal, textX, tableY + 4.8, { align: c.align === 'right' ? 'right' : (c.align === 'center' ? 'center' : 'left') });
                    curX += c.w;
                });

                tableY += rowH;
            });
        }

        drawFooter(currentPage, null);

        // Numeración final
        const totalPages = pdf.internal.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
            pdf.setPage(p);
            pdf.setFillColor(255, 255, 255);
            pdf.rect(PW - M - 44, PH - FH, 46, 8, 'F');
            pdf.setFontSize(7); pdf.setTextColor(148, 163, 184); pdf.setFont('helvetica', 'normal');
            pdf.text(`Página ${p} de ${totalPages}`, PW - M, PH - 4, { align: 'right' });
        }

        const now = new Date();
        const ds = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

        if (options.autoSave !== false) {
            pdf.save(`reporte_ejecutivo_cuad_${ds}.pdf`);
        }

        if (options.returnDataUrl) {
            return pdf.output('datauristring');
        }

    } catch (error) {
        console.error('Error generando PDF:', error);
        alert('Error al generar el PDF: ' + error.message);
    }
};
