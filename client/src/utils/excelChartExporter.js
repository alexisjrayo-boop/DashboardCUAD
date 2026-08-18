import ExcelJS from 'exceljs';

const formatDateShort = (dStr) => {
    if (!dStr) return '';
    try {
        const d = new Date(dStr);
        if (isNaN(d.getTime())) return String(dStr).substring(0, 10);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (e) {
        return String(dStr).substring(0, 10);
    }
};

/**
 * Exportación a Excel de Logs CDR mediante ExcelJS
 * Genera un archivo Excel limpio con una sola pestaña dedicada exclusivamente a la bitácora de Logs de Llamadas.
 */
export const exportInteractiveExcelWithCharts = async (data = [], stats = {}, chartsData = {}, extensionsMap = {}, filters = {}) => {
    try {
        if (!data || data.length === 0) {
            alert('No hay registros de llamadas para exportar.');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'GASME CUAD';
        workbook.created = new Date();

        // Estilos ejecutivos
        const redHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC3002F' } };
        const headerFont = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };

        // ÚNICA HOJA DEL LIBRO: LOGS DE LLAMADAS
        const sheetLogs = workbook.addWorksheet('Logs');
        sheetLogs.views = [{ showGridLines: true }];

        const headers = [
            'ID CDR', 'Fecha', 'Hora', 'Origen (Ext/Núm)', 'Nombre Origen',
            'Destino (Ext/Núm)', 'Nombre Destino', 'Estado', 'Duración (seg)',
            'Tiempo Hablado (seg)', 'Duración Formateada', 'Tiempo Hablado Formateado',
            'Tipo de Llamada', 'Canal Origen', 'Canal Destino'
        ];

        const headerRow = sheetLogs.getRow(1);
        headers.forEach((h, idx) => {
            const cell = headerRow.getCell(idx + 1);
            cell.value = h;
            cell.fill = redHeaderFill;
            cell.font = headerFont;
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
        headerRow.height = 25;

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

        data.forEach((r) => {
            const srcName = typeof extensionsMap[r.src] === 'string' ? extensionsMap[r.src] : (r.clid || r.source || '');
            const destName = r.destination_desc || (typeof extensionsMap[r.destination] === 'string' ? extensionsMap[r.destination] : (typeof extensionsMap[r.dst] === 'string' ? extensionsMap[r.dst] : ''));

            let disp = 'Fallida';
            if (r.disposition === 'ANSWERED') disp = 'Contestada';
            else if (r.disposition === 'NO ANSWER') disp = 'No Contestada';
            else if (r.disposition === 'BUSY') disp = 'Ocupado';

            let type = 'Interna';
            if (String(r.calltype) === '2') type = 'Entrante';
            else if (String(r.calltype) === '3') type = 'Saliente';

            const durStr = r.duration ? `${Math.floor(r.duration / 60)}m ${r.duration % 60}s` : '0s';
            const billStr = r.billsec ? `${Math.floor(r.billsec / 60)}m ${r.billsec % 60}s` : '0s';
            const { dateStr, timeStr } = splitCalldate(r.calldate);

            sheetLogs.addRow([
                r.cdr_id || '',
                dateStr,
                timeStr,
                r.src || '',
                srcName,
                r.destination || r.dst || '',
                destName,
                disp,
                r.duration || 0,
                r.billsec || 0,
                durStr,
                billStr,
                type,
                r.channel || '',
                r.dstchannel || ''
            ]);
        });

        sheetLogs.columns = [
            { width: 14 }, { width: 14 }, { width: 12 }, { width: 18 }, { width: 25 },
            { width: 18 }, { width: 25 }, { width: 15 }, { width: 14 }, { width: 18 },
            { width: 18 }, { width: 22 }, { width: 15 }, { width: 25 }, { width: 25 }
        ];

        // Exportar buffer limpio
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
        const filename = `logs_llamadas_cuad_${dateStr}.xlsx`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Error generando Excel de Logs:', error);
        alert('Error generando Excel: ' + error.message);
    }
};
