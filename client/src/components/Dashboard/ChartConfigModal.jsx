import React, { useState, useEffect } from 'react';
import { X, Mail, Send, Eye, FileText, FileSpreadsheet, Download, CheckCircle, Clock, PhoneCall, Filter, ShieldCheck, Play, Plus, Edit2, Trash2, User, ToggleLeft, ToggleRight, Sparkles, RefreshCw, Check, Phone, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { useDashboard } from '../../context/DashboardContext';
import { exportChartsToPDF } from '../../utils/exportUtils';
import { exportInteractiveExcelWithCharts } from '../../utils/excelChartExporter';
import { calculateGeneralStats } from '../../utils/dashboardProcessing';

const AVAILABLE_LINES = [
    { id: '2878750303', name: 'Tuxtepec' },
    { id: '9716884348', name: 'Salina Cruz' },
    { id: '9717120739', name: 'Juchitán' },
    { id: 'CUAD', name: 'BDC Central' }
];

const ALL_LINE_IDS = ['2878750303', '9716884348', '9717120739', 'CUAD'];

const ChartConfigModal = ({ isOpen, onClose }) => {
    const { data, stats, chartsData, filters, extensionsMap } = useDashboard();

    // Estado de la Lista de Destinatarios
    const [recipientsList, setRecipientsList] = useState([]);
    const [loadingList, setLoadingList] = useState(false);

    // Formulario de Agregar / Editar Destinatario
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [selectedLines, setSelectedLines] = useState(ALL_LINE_IDS);
    const [formData, setFormData] = useState({
        recipient_name: '',
        recipient_email: '',
        frequency: 'semanal',
        phone_lines: 'all',
        call_type: '2', // Solo llamadas entrantes
        format: 'pdf',
        active: true
    });

    const [saving, setSaving] = useState(false);
    const [testingId, setTestingId] = useState(null);
    const [sendingEmailId, setSendingEmailId] = useState(null);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [exportingExcel, setExportingExcel] = useState(false);

    const toggleLineSelection = (lineId) => {
        setSelectedLines(prev => {
            if (prev.includes(lineId)) {
                if (prev.length === 1) return prev; // Mantener al menos 1 seleccionada
                return prev.filter(id => id !== lineId);
            } else {
                return [...prev, lineId];
            }
        });
    };

    // Cargar lista de destinatarios al abrir el modal
    const loadRecipients = async () => {
        setLoadingList(true);
        try {
            const res = await api.get('/config/email-report');
            if (res.data?.success && Array.isArray(res.data?.data)) {
                setRecipientsList(res.data.data);
            }
        } catch (err) {
            console.warn('Error al cargar destinatarios:', err.message);
        } finally {
            setLoadingList(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadRecipients();
            setIsFormOpen(false);
            setEditingId(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Resetear Formulario
    const handleOpenNewForm = () => {
        setFormData({
            recipient_name: '',
            recipient_email: '',
            frequency: 'semanal',
            phone_lines: 'all',
            call_type: '2',
            format: 'pdf',
            active: true
        });
        setSelectedLines(ALL_LINE_IDS);
        setEditingId(null);
        setIsFormOpen(true);
    };

    // Abrir Formulario para Editar
    const handleEditItem = (item) => {
        setFormData({
            recipient_name: item.recipient_name || '',
            recipient_email: item.recipient_email || '',
            frequency: item.frequency || 'semanal',
            phone_lines: item.phone_lines || 'all',
            call_type: item.call_type || '2',
            format: item.format || 'pdf',
            active: Boolean(item.active)
        });

        if (!item.phone_lines || item.phone_lines === 'all') {
            setSelectedLines(ALL_LINE_IDS);
        } else {
            const linesArr = item.phone_lines.split(',').map(s => s.trim()).filter(Boolean);
            setSelectedLines(linesArr.length > 0 ? linesArr : ALL_LINE_IDS);
        }

        setEditingId(item.id);
        setIsFormOpen(true);
    };

    // Guardar (Crear o Actualizar) Destinatario
    const handleSaveForm = async (e) => {
        e.preventDefault();
        if (!formData.recipient_email.trim()) {
            alert('Por favor introduce la dirección de correo electrónico.');
            return;
        }

        const linesString = selectedLines.length === ALL_LINE_IDS.length ? 'all' : selectedLines.join(',');
        const payload = {
            ...formData,
            phone_lines: linesString,
            call_type: '2' // Garantizar llamadas entrantes
        };

        setSaving(true);
        try {
            const isEditingValid = Boolean(editingId && (typeof editingId === 'number' || !isNaN(Number(editingId))) && Number(editingId) > 0);
            if (isEditingValid) {
                await api.put(`/config/email-report/${editingId}`, payload);
            } else {
                await api.post('/config/email-report', payload);
            }
            await loadRecipients();
            setIsFormOpen(false);
            setEditingId(null);
        } catch (err) {
            console.error('Error guardando destinatario:', err);
            alert('Error al guardar destinatario: ' + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    // Eliminar Destinatario
    const handleDeleteItem = async (id, name) => {
        if (!confirm(`¿Eliminar al destinatario "${name || 'seleccionado'}" de los envíos de correo?`)) return;
        try {
            await api.delete(`/config/email-report/${id}`);
            await loadRecipients();
        } catch (err) {
            console.error('Error eliminando destinatario:', err);
            alert('Error al eliminar destinatario: ' + err.message);
        }
    };

    // Toggle estado activo/inactivo directo en la lista
    const handleToggleActive = async (item) => {
        try {
            const updated = { ...item, active: !item.active };
            await api.put(`/config/email-report/${item.id}`, updated);
            setRecipientsList(prev => prev.map(r => r.id === item.id ? { ...r, active: !r.active } : r));
        } catch (err) {
            console.error('Error cambiando estado:', err);
        }
    };

    // BOTÓN DE PROBAR / VISTA PREVIA ESPECÍFICO DE UN DESTINATARIO
    // Consulta la base de datos MySQL directamente para el rango de fechas de la frecuencia asignada
    // garantizando que 100% de las llamadas sean incluidas sin ninguna pérdida.
    // Helper para consultar datos de MySQL con fallback si el día/período actual aún no tiene registros
    const fetchTestRows = async (recipient) => {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const formatShortDate = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
        const formatDbDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

        let startDate = '';
        let endDate = formatDbDate(now);
        let periodName = 'Reporte Programado';

        if (filters && filters.startDate && filters.endDate) {
            startDate = filters.startDate;
            endDate = filters.endDate;
            periodName = `Periodo Seleccionado (${filters.startDate.replace('T', ' ').substring(0, 10)} al ${filters.endDate.replace('T', ' ').substring(0, 10)})`;
        } else if (recipient.frequency === 'diario') {
            const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            startDate = formatDbDate(startToday);
            periodName = `Reporte Diario (${formatShortDate(now)})`;
        } else if (recipient.frequency === 'semanal') {
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            startDate = formatDbDate(sevenDaysAgo);
            periodName = `Reporte Semanal (${formatShortDate(sevenDaysAgo)} al ${formatShortDate(now)})`;
        } else if (recipient.frequency === 'quincenal') {
            const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
            startDate = formatDbDate(fifteenDaysAgo);
            periodName = `Reporte Quincenal (${formatShortDate(fifteenDaysAgo)} al ${formatShortDate(now)})`;
        } else if (recipient.frequency === 'mensual') {
            const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            startDate = formatDbDate(firstOfMonth);
            periodName = `Reporte Mensual (${formatShortDate(firstOfMonth)} al ${formatShortDate(now)})`;
        }

        const buildParams = (sDate) => {
            const params = new URLSearchParams({ limit: 80000 });
            if (sDate) params.append('startDate', sDate);
            if (endDate) params.append('endDate', endDate);
            if (recipient.call_type && recipient.call_type !== 'all') params.append('calltype', recipient.call_type);
            if (recipient.phone_lines && recipient.phone_lines !== 'all') {
                let lineValue = recipient.phone_lines;
                if (lineValue === 'CUAD') lineValue = '301,375,378,379,380,381';
                params.append('dst', lineValue);
            }
            return params;
        };

        let fetchedRows = [];
        try {
            let res = await api.get(`/db/cdrs?${buildParams(startDate).toString()}`);
            if (res.data?.success && Array.isArray(res.data?.data)) {
                fetchedRows = res.data.data;
            }

            // Fallback 1: Si para la fecha exacta de hoy no hay registros, consultar el mes en curso
            if (fetchedRows.length === 0) {
                const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
                res = await api.get(`/db/cdrs?${buildParams(formatDbDate(firstOfMonth)).toString()}`);
                if (res.data?.success && Array.isArray(res.data?.data)) {
                    fetchedRows = res.data.data;
                }
            }

            // Fallback 2: Consultar sin filtro de fecha
            if (fetchedRows.length === 0) {
                res = await api.get(`/db/cdrs?${buildParams('').toString()}`);
                if (res.data?.success && Array.isArray(res.data?.data)) {
                    fetchedRows = res.data.data;
                }
            }
        } catch (e) {
            console.warn('Fallback a datos locales del dashboard:', e.message);
        }

        // Fallback 3: Usar datos cargados en el contexto del Dashboard si la API no devolvió filas
        if (fetchedRows.length === 0 && Array.isArray(data) && data.length > 0) {
            fetchedRows = [...data];
            if (recipient.call_type && recipient.call_type !== 'all') {
                fetchedRows = fetchedRows.filter(r => String(r.calltype) === String(recipient.call_type));
            }
        }

        return { fetchedRows, periodName, startDate, endDate };
    };

    // BOTÓN DE PROBAR / VISTA PREVIA ESPECÍFICO DE UN DESTINATARIO
    const handleTestRecipientReport = async (recipient) => {
        setTestingId(recipient.id || 'form');
        try {
            const { fetchedRows, periodName } = await fetchTestRows(recipient);

            const testStats = calculateGeneralStats(fetchedRows, extensionsMap);
            const testFilters = {
                ...filters,
                frequency: recipient.frequency,
                calltype: recipient.call_type,
                line: recipient.phone_lines,
                customPeriodName: periodName
            };

            await exportChartsToPDF(testStats, testFilters, [], fetchedRows, extensionsMap);
            alert(`✓ Vista previa generada exitosamente para "${recipient.recipient_name || 'Destinatario'}".\n\nTotal de llamadas recuperadas desde MySQL: ${fetchedRows.length.toLocaleString()} llamadas.`);
        } catch (err) {
            console.error('Error generando vista previa:', err);
            alert('Ocurrió un error al generar la vista previa del reporte: ' + err.message);
        } finally {
            setTestingId(null);
        }
    };

    // BOTÓN DE PROBAR ENVÍO REAL DE CORREO POR DESTINATARIO
    const handleSendTestEmail = async (recipient) => {
        setSendingEmailId(recipient.id || 'form');
        try {
            const { fetchedRows, periodName, startDate, endDate } = await fetchTestRows(recipient);

            const testStats = calculateGeneralStats(fetchedRows, extensionsMap);
            const testFilters = {
                ...filters,
                frequency: recipient.frequency,
                calltype: recipient.call_type,
                line: recipient.phone_lines,
                customPeriodName: periodName
            };

            // Generar PDF base64 en memoria sin forzar cuadro de descarga
            const pdfBase64 = await exportChartsToPDF(testStats, testFilters, [], fetchedRows, extensionsMap, { returnDataUrl: true, autoSave: false });

            // Enviar petición al backend para despachar el correo por IONOS SMTP
            const emailRes = await api.post('/config/send-test-email', {
                recipient_email: recipient.recipient_email,
                recipient_name: recipient.recipient_name,
                frequency: recipient.frequency,
                phone_lines: recipient.phone_lines,
                call_type: recipient.call_type,
                startDate,
                endDate,
                pdfBase64
            });

            if (emailRes.data?.success) {
                alert(`✉️ ${emailRes.data.message}`);
            } else {
                alert(`⚠️ ${emailRes.data?.message || 'No se pudo enviar el correo'}`);
            }

        } catch (err) {
            console.error('Error al probar envío de correo:', err);
            alert(`❌ Error al enviar correo de prueba: ${err.response?.data?.message || err.message}`);
        } finally {
            setSendingEmailId(null);
        }
    };

    // Exportación manual inmediata PDF
    const handleExportPDF = async () => {
        setExportingPdf(true);
        try {
            await exportChartsToPDF(stats, filters, [], data, extensionsMap);
        } catch (err) {
            alert('Error exportando PDF: ' + err.message);
        } finally {
            setExportingPdf(false);
        }
    };

    // Exportación manual inmediata Excel
    const handleExportExcel = async () => {
        setExportingExcel(true);
        try {
            await exportInteractiveExcelWithCharts(data, stats, chartsData, extensionsMap, filters);
        } catch (err) {
            alert('Error exportando Excel: ' + err.message);
        } finally {
            setExportingExcel(false);
        }
    };

    const getLineText = (code) => {
        if (code === 'all') return 'Todas las líneas';
        if (code === '2878750303') return 'Línea 1 (Tuxtepec)';
        if (code === '9716884348') return 'Línea 2 (Salina Cruz)';
        if (code === '9717120739') return 'Línea 3 (Juchitán)';
        if (code === 'CUAD') return 'BDC Central';
        return code;
    };

    const getCallTypeText = (code) => {
        if (code === '2') return 'Solo Entrantes';
        if (code === '3') return 'Solo Salientes';
        return 'Todas';
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[680px] max-h-[90vh] min-h-[550px] overflow-hidden border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header corporativo GASME */}
                <div className="bg-gradient-to-r from-red-700 via-red-600 to-rose-700 text-white px-6 py-4 flex justify-between items-center shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                            <Mail className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold uppercase tracking-wide">Configuración de Reportes y Envíos por Correo</h2>
                            <p className="text-[11px] text-red-100 font-normal">Gestión de lista de destinatarios, frecuencias y pruebas de muestra</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="hover:bg-white/20 text-white rounded-full p-1.5 transition-colors"
                        title="Cerrar ventana"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body scrollable */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">

                    {/* SECCIÓN 1: Generación manual de reportes */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Download className="h-4 w-4 text-red-600" />
                                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Generación Inmediata de Reportes</h3>
                            </div>
                            <span className="text-[10px] bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full border border-red-200">Descarga Manual</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                onClick={handleExportPDF}
                                disabled={exportingPdf}
                                className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl shadow-md hover:from-red-700 hover:to-rose-700 hover:shadow-lg transition-all group text-left disabled:opacity-50"
                            >
                                <div className="p-2 bg-white/20 text-white rounded-lg group-hover:scale-110 transition-transform">
                                    {exportingPdf ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <FileText className="h-5 w-5 text-white" />
                                    )}
                                </div>
                                <div>
                                    <div className="text-xs font-bold uppercase tracking-wide text-white">
                                        {exportingPdf ? 'Generando PDF...' : 'Descargar Reporte PDF'}
                                    </div>
                                    <div className="text-[10px] text-red-100 font-normal">Gráficos y métricas ejecutivas en PDF</div>
                                </div>
                            </button>

                            <button
                                onClick={handleExportExcel}
                                disabled={exportingExcel}
                                className="flex items-center gap-3 p-3 bg-white border border-emerald-200 rounded-xl hover:border-emerald-600 hover:bg-emerald-50/50 hover:shadow-sm transition-all group text-left disabled:opacity-50"
                            >
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform">
                                    <FileSpreadsheet className="h-4 w-4" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-800 uppercase">
                                        {exportingExcel ? 'Generando Excel...' : 'Descargar Logs Excel (.xlsx)'}
                                    </div>
                                    <div className="text-[10px] text-slate-500">{data ? data.length.toLocaleString() : 0} llamadas filtradas</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* SECCIÓN 2: Lista de Destinatarios Programados */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <Send className="h-4 w-4 text-red-600" />
                                <div>
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Lista de Destinatarios para Envíos de Reportes</h3>
                                    <p className="text-[10px] text-slate-400">Agrega los usuarios que recibirán automáticamente los reportes consolidados por correo</p>
                                </div>
                            </div>
                            
                            <button
                                onClick={handleOpenNewForm}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm transform hover:scale-105"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Agregar Destinatario</span>
                            </button>
                        </div>

                        {/* Formulario Modal Interno para Agregar / Editar */}
                        {isFormOpen && (
                            <form onSubmit={handleSaveForm} className="bg-slate-50 p-4 rounded-xl border-2 border-red-200 space-y-4 animate-in fade-in duration-200">
                                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                    <h4 className="text-xs font-bold uppercase text-red-700 flex items-center gap-1.5">
                                        <Sparkles className="h-4 w-4" />
                                        <span>{editingId ? 'Editar Destinatario' : 'Nuevo Destinatario de Reportes'}</span>
                                    </h4>
                                    <button 
                                        type="button" 
                                        onClick={() => setIsFormOpen(false)}
                                        className="text-slate-400 hover:text-slate-600 p-1"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Nombre / Cargo del Destinatario</label>
                                        <input
                                            type="text"
                                            value={formData.recipient_name}
                                            onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                                            placeholder="ej. Dirección General / Gerente Tuxtepec"
                                            className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-red-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Correo Electrónico *</label>
                                        <input
                                            type="email"
                                            required
                                            value={formData.recipient_email}
                                            onChange={(e) => setFormData({ ...formData, recipient_email: e.target.value })}
                                            placeholder="ej. usuario@gasme.com.mx"
                                            className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-red-500"
                                        />
                                    </div>
                                </div>

                                {/* Selección Múltiple de Líneas Telefónicas (4 Rectángulos) */}
                                <div className="space-y-1.5 pt-1">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                            Líneas Telefónicas a Incluir
                                        </label>
                                        <span className="text-[10px] text-slate-400 font-semibold">
                                            {selectedLines.length === 4 ? 'Todas las líneas seleccionadas' : `${selectedLines.length} de 4 líneas seleccionadas`}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                        {AVAILABLE_LINES.map((line) => {
                                            const isSelected = selectedLines.includes(line.id);
                                            return (
                                                <button
                                                    key={line.id}
                                                    type="button"
                                                    onClick={() => toggleLineSelection(line.id)}
                                                    className={`relative p-3.5 rounded-xl border text-center transition-all duration-200 flex items-center justify-center select-none cursor-pointer group ${
                                                        isSelected
                                                            ? 'bg-red-50/90 border-red-600 text-red-900 ring-2 ring-red-500/20 shadow-sm transform active:scale-[0.98]'
                                                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <span className={`text-xs font-black tracking-tight ${
                                                        isSelected ? 'text-red-700' : 'text-slate-700 group-hover:text-slate-900'
                                                    }`}>
                                                        {line.name}
                                                    </span>

                                                    <div className={`absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                                                        isSelected ? 'bg-red-600 text-white' : 'border border-slate-300 bg-white'
                                                    }`}>
                                                        {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    {/* Activar Envío Checkbox */}
                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                                        <input
                                            type="checkbox"
                                            checked={formData.active}
                                            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                            className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                                        />
                                        <span>Activar envío automático</span>
                                    </label>

                                    {/* Botones de Acción */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        {/* Botón Probar Envío por Correo */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!formData.recipient_email || !formData.recipient_email.trim()) {
                                                    alert('Por favor introduce primero la dirección de correo electrónico.');
                                                    return;
                                                }
                                                const linesString = selectedLines.length === ALL_LINE_IDS.length ? 'all' : selectedLines.join(',');
                                                handleSendTestEmail({
                                                    ...formData,
                                                    phone_lines: linesString,
                                                    call_type: '2',
                                                    frequency: 'semanal'
                                                });
                                            }}
                                            disabled={sendingEmailId === 'form'}
                                            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-all shadow-sm whitespace-nowrap disabled:opacity-50"
                                            title="Probar envío real de correo a la dirección ingresada"
                                        >
                                            <Send className="h-3.5 w-3.5 text-red-400 shrink-0" />
                                            <span>{sendingEmailId === 'form' ? 'Enviando...' : 'Probar Envío'}</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setIsFormOpen(false)}
                                            className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-all whitespace-nowrap"
                                        >
                                            Cancelar
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-all whitespace-nowrap disabled:opacity-50"
                                        >
                                            <CheckCircle className="h-3.5 w-3.5" />
                                            <span>{saving ? 'Guardando...' : (editingId ? 'Actualizar Destinatario' : 'Guardar Destinatario')}</span>
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}

                        {/* Tabla de Destinatarios Configurados */}
                        {loadingList ? (
                            <div className="text-center py-8 text-xs text-slate-400 flex items-center justify-center gap-2">
                                <RefreshCw className="h-4 w-4 animate-spin text-red-600" />
                                <span>Cargando destinatarios...</span>
                            </div>
                        ) : recipientsList.length === 0 ? (
                            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <Mail className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-xs font-bold text-slate-600">No hay destinatarios configurados todavía</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">Haz clic en "+ Agregar Destinatario" para programar envíos de reportes por correo.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                                            <th className="p-3">Destinatario</th>
                                            <th className="p-3">Correo Electrónico</th>
                                            <th className="p-3">Líneas Incluidas</th>
                                            <th className="p-3 text-center">Estado</th>
                                            <th className="p-3 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {recipientsList.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="p-3 font-bold text-slate-800">
                                                    {item.recipient_name || 'Destinatario'}
                                                </td>
                                                <td className="p-3 font-semibold text-slate-700">
                                                    {item.recipient_email}
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {(!item.phone_lines || item.phone_lines === 'all') ? (
                                                            <span className="bg-red-50 text-red-700 font-bold text-[10px] px-2 py-0.5 rounded-full border border-red-200">
                                                                Todas (4)
                                                            </span>
                                                        ) : (
                                                            item.phone_lines.split(',').map(lineId => {
                                                                const found = AVAILABLE_LINES.find(l => l.id === lineId.trim());
                                                                return (
                                                                    <span key={lineId} className="bg-slate-100 text-slate-700 font-bold text-[10px] px-2 py-0.5 rounded-full border border-slate-200">
                                                                        {found ? found.name : lineId}
                                                                    </span>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                        item.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                        {item.active ? '✓ Activo' : 'Inactivo'}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => handleSendTestEmail({
                                                                ...item,
                                                                call_type: '2',
                                                                frequency: 'semanal'
                                                            })}
                                                            disabled={sendingEmailId === item.id}
                                                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                                                            title="Probar envío por correo"
                                                        >
                                                            <Send className="h-3.5 w-3.5" />
                                                        </button>

                                                        <button
                                                            onClick={() => handleEditItem(item)}
                                                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                                                            title="Editar destinatario"
                                                        >
                                                            <Edit2 className="h-3.5 w-3.5" />
                                                        </button>

                                                        <button
                                                            onClick={async () => {
                                                                if (window.confirm(`¿Seguro de eliminar a ${item.recipient_email}?`)) {
                                                                    try {
                                                                        await api.delete(`/config/email-report/${item.id}`);
                                                                        loadRecipients();
                                                                    } catch (err) {
                                                                        alert('Error eliminando: ' + err.message);
                                                                    }
                                                                }
                                                            }}
                                                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                                            title="Eliminar destinatario"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer del Modal */}
                <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 font-medium">
                        <span>💡 Cada destinatario recibirá su reporte de llamadas entrantes automáticamente.</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 font-bold text-slate-700 rounded-xl transition-all shadow-sm"
                    >
                        Cerrar Ventana
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ChartConfigModal;
