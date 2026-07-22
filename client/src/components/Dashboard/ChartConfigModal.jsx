import React, { useState, useEffect } from 'react';
import { X, ChevronUp, ChevronDown, Eye, EyeOff, Settings, RefreshCw, Database, Calendar } from 'lucide-react';
import api from '../../services/api';

const ChartConfigModal = ({ isOpen, onClose, config, onSave }) => {
    const [localConfig, setLocalConfig] = useState(config);

    // Sync localConfig when config prop changes or modal opens
    useEffect(() => {
        if (isOpen) {
            setLocalConfig(config);
        }
    }, [config, isOpen]);

    if (!isOpen) return null;

    const moveItem = (index, direction) => {
        const newCharts = [...localConfig.charts];
        const newIndex = direction === 'up' ? index - 1 : index + 1;

        if (newIndex < 0 || newIndex >= newCharts.length) return;

        [newCharts[index], newCharts[newIndex]] = [newCharts[newIndex], newCharts[index]];
        newCharts.forEach((chart, idx) => chart.order = idx);

        setLocalConfig({ ...localConfig, charts: newCharts });
    };

    const toggleVisibility = (id, section) => {
        if (section === 'stats') {
            setLocalConfig({
                ...localConfig,
                stats: localConfig.stats.map(stat =>
                    stat.id === id ? { ...stat, visible: !stat.visible } : stat
                )
            });
        } else {
            setLocalConfig({
                ...localConfig,
                charts: localConfig.charts.map(chart =>
                    chart.id === id ? { ...chart, visible: !chart.visible } : chart
                )
            });
        }
    };

    const changeSize = (id, newSize) => {
        setLocalConfig({
            ...localConfig,
            charts: localConfig.charts.map(chart =>
                chart.id === id ? { ...chart, size: newSize } : chart
            )
        });
    };

    const handleSave = () => {
        onSave(localConfig);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border-2 border-gray-200">
                {/* Header */}
                <div className="bg-nissan-red text-white px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        <h2 className="text-lg font-bold uppercase">Configuración del Dashboard</h2>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {/* Stat Cards Section */}
                    <div className="mb-6">
                        <h3 className="text-md font-bold text-gray-800 mb-3 pb-2 border-b">Tarjetas de Estadísticas</h3>
                        <div className="space-y-2">
                            {localConfig.stats.map((stat) => (
                                <div key={stat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100">
                                    <span className="font-medium text-gray-700">{stat.label}</span>
                                    <button
                                        onClick={() => toggleVisibility(stat.id, 'stats')}
                                        className={`p-2 rounded ${stat.visible ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-200'}`}
                                    >
                                        {stat.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div>
                        <h3 className="text-md font-bold text-gray-800 mb-3 pb-2 border-b">Gráficos</h3>
                        <div className="space-y-2">
                            {localConfig.charts.map((chart, index) => (
                                <div key={chart.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded hover:bg-gray-100">
                                    {/* Reorder buttons */}
                                    <div className="flex flex-col gap-1">
                                        <button
                                            onClick={() => moveItem(index, 'up')}
                                            disabled={index === 0}
                                            className="p-1 hover:bg-white rounded disabled:opacity-30"
                                        >
                                            <ChevronUp className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => moveItem(index, 'down')}
                                            disabled={index === localConfig.charts.length - 1}
                                            className="p-1 hover:bg-white rounded disabled:opacity-30"
                                        >
                                            <ChevronDown className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {/* Chart name */}
                                    <span className="flex-1 font-medium text-gray-700">{chart.label}</span>

                                    {/* Size selector - Grid */}
                                    <div className="flex gap-1 bg-gray-100 p-1 rounded">
                                        {/* 1x1 - Small */}
                                        <button
                                            onClick={() => changeSize(chart.id, 'small')}
                                            className={`w-6 h-6 border-2 rounded transition-all ${chart.size === 'small'
                                                ? 'border-nissan-red bg-red-100'
                                                : 'border-gray-300 bg-white hover:border-gray-400'
                                                }`}
                                            title="Pequeño (1x1)"
                                        >
                                            <div className="w-full h-full grid grid-cols-1 grid-rows-1 gap-0.5 p-0.5">
                                                <div className="bg-gray-400 rounded-sm"></div>
                                            </div>
                                        </button>

                                        {/* 2x1 - Medium */}
                                        <button
                                            onClick={() => changeSize(chart.id, 'medium')}
                                            className={`w-6 h-6 border-2 rounded transition-all ${chart.size === 'medium'
                                                ? 'border-nissan-red bg-red-100'
                                                : 'border-gray-300 bg-white hover:border-gray-400'
                                                }`}
                                            title="Mediano (2x1)"
                                        >
                                            <div className="w-full h-full grid grid-cols-2 grid-rows-1 gap-0.5 p-0.5">
                                                <div className="bg-gray-400 rounded-sm"></div>
                                                <div className="bg-gray-400 rounded-sm"></div>
                                            </div>
                                        </button>

                                        {/* 2x2 - Large */}
                                        <button
                                            onClick={() => changeSize(chart.id, 'large')}
                                            className={`w-6 h-6 border-2 rounded transition-all ${chart.size === 'large'
                                                ? 'border-nissan-red bg-red-100'
                                                : 'border-gray-300 bg-white hover:border-gray-400'
                                                }`}
                                            title="Grande (2x2)"
                                        >
                                            <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5 p-0.5">
                                                <div className="bg-gray-400 rounded-sm"></div>
                                                <div className="bg-gray-400 rounded-sm"></div>
                                                <div className="bg-gray-400 rounded-sm"></div>
                                                <div className="bg-gray-400 rounded-sm"></div>
                                            </div>
                                        </button>
                                    </div>

                                    {/* Visibility toggle */}
                                    <button
                                        onClick={() => toggleVisibility(chart.id, 'charts')}
                                        className={`p-2 rounded ${chart.visible ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-200'}`}
                                    >
                                        {chart.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Data Synchronization Section */}
                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <RefreshCw className="h-4 w-4 text-nissan-red" />
                            <h3 className="text-md font-bold text-gray-800 uppercase tracking-tight">Sincronización de Datos</h3>
                        </div>
                        <p className="text-xs text-gray-500 mb-4 bg-orange-50 p-3 rounded-lg border border-orange-100 italic">
                            Usa estas opciones para forzar la descarga de llamadas desde el servidor principal (Telmex/CUAD).
                            El proceso se ejecuta en segundo plano.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <button
                                onClick={() => {
                                    if (confirm('¿Sincronizar datos recientes? Esto buscará registros faltantes desde la última fecha registrada.')) {
                                        api.post('/admin/trigger-fetch', {})
                                            .then(() => alert('Sincronización iniciada correctamente.'))
                                            .catch(e => alert('Error: ' + e.message));
                                    }
                                }}
                                className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:border-nissan-red hover:shadow-md transition-all group"
                            >
                                <RefreshCw className="h-5 w-5 text-gray-400 group-hover:text-nissan-red group-hover:rotate-180 transition-transform duration-700" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700">Auto (Reciente)</span>
                            </button>

                            <button
                                onClick={() => {
                                    if (confirm('¿Sincronizar todo el año 2026? Esto puede tardar unos minutos.')) {
                                        api.post('/admin/trigger-fetch', { year: 2026 })
                                            .then(() => alert('Sincronización de 2026 iniciada.'))
                                            .catch(e => alert('Error: ' + e.message));
                                    }
                                }}
                                className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:border-nissan-red hover:shadow-md transition-all group"
                            >
                                <Calendar className="h-5 w-5 text-gray-400 group-hover:text-nissan-red transition-colors" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700">Todo 2026</span>
                            </button>

                            <button
                                onClick={() => {
                                    if (confirm('¿Sincronizar el año pasado (2025)? Este proceso es extenso.')) {
                                        api.post('/admin/trigger-fetch', { year: 2025 })
                                            .then(() => alert('Sincronización de 2025 iniciada.'))
                                            .catch(e => alert('Error: ' + e.message));
                                    }
                                }}
                                className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:border-nissan-red hover:shadow-md transition-all group"
                            >
                                <Database className="h-5 w-5 text-gray-400 group-hover:text-nissan-red transition-colors" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700">Año Pasado (2025)</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-100 hover:border-gray-400 rounded font-medium transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2.5 text-white rounded font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                        style={{ backgroundColor: '#C3002F' }}
                    >
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChartConfigModal;
