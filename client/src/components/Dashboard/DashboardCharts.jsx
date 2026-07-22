import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../../context/DashboardContext';
import { Line, Doughnut, Bar, Chart } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
} from 'chart.js';
import { SankeyController, Flow } from 'chartjs-chart-sankey';
import { TreemapController, TreemapElement } from 'chartjs-chart-treemap';
import HeatmapMatrix from '../Common/HeatmapMatrix';
import ExtensionStatsTable from './ExtensionStatsTable';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler,
    SankeyController,
    Flow,
    TreemapController,
    TreemapElement
);

const DashboardCharts = ({ stats, chartsData, hourlyData, dailyData, dailyLineData, weeklyHeatmapData, destExtensionHeatmapData, topCallersData, weeklyCallsData, dstStatsData, destinationStatsData, extensionStats, concurrencyChartData, areaCodeChartData, sankeyChartData, treemapData, chartConfig = [] }) => {

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const { data, filters, extensionsMap } = useDashboard(); // still need 'data' for drill-downs and 'filters' for logic
    const navigate = useNavigate();

    // Filter hourly data for mobile (8:00 to 20:00)
    const filteredHourlyData = useMemo(() => {
        if (!hourlyData || !isMobile) return hourlyData;
        const startIndex = 8;
        const endIndex = 20;
        return {
            ...hourlyData,
            labels: hourlyData.labels.slice(startIndex, endIndex + 1),
            datasets: hourlyData.datasets.map(ds => ({
                ...ds,
                data: ds.data.slice(startIndex, endIndex + 1)
            }))
        };
    }, [hourlyData, isMobile]);

    // Helper to check if a chart is visible
    const isVisible = (chartId) => {
        const chart = chartConfig.find(c => c.id === chartId);
        return chart ? chart.visible : true; // Default to visible if not in config
    };

    // --- CLICK HANDLERS (Navigation to Details) ---

    // 1. Disposition Drill-down
    const handleDispositionClick = useCallback((event, elements) => {
        if (!elements || elements.length === 0) return;
        const index = elements[0].index;
        const label = dispositionChartData.labels[index];
        const dispositionMap = {
            'Contestadas': 'ANSWERED',
            'No Contestadas': 'NO ANSWER',
            'Ocupado': 'BUSY',
            'Fallido': 'FAILED'
        };
        const targetDisposition = dispositionMap[label];

        if (targetDisposition) {
            const filtered = data.filter(r => r.disposition === targetDisposition);
            navigate('/details', { state: { title: `Llamadas - ${label}`, data: filtered } });
        }
    }, [data, navigate]);

    // New Treemap Click Handler
    const handleTreemapClick = useCallback((event, elements) => {
        if (!elements || elements.length === 0 || !treemapData) return;
        const index = elements[0].index;
        const item = treemapData[index];
        if (item && item.name) {
            const filtered = data.filter(r => r.src === item.name || r.source === item.name);
            navigate('/details', { state: { title: `Llamadas de ${item.name}`, data: filtered } });
        }
    }, [data, treemapData, navigate]);

    const handleTreemapDestClick = useCallback((event, elements) => {
        if (!elements || elements.length === 0 || !chartsData?.treemapDest) return;
        const index = elements[0].index;
        const item = chartsData.treemapDest[index];
        if (item && item.name) {
            const filtered = data.filter(r => r.dst === item.name || r.destination === item.name);
            navigate('/details', { state: { title: `Llamadas a ${item.name}`, data: filtered } });
        }
    }, [data, chartsData, navigate]);

    const handleSrcExtOutgoingClick = useCallback((event, elements) => {
        if (!elements || elements.length === 0 || !chartsData?.srcExtOutgoing) return;
        const index = elements[0].index;
        const label = chartsData.srcExtOutgoing.labels[index];
        const ext = label.split(' - ')[0];

        if (ext) {
            const filtered = data.filter(r => r.src === ext);
            navigate('/details', { state: { title: `Llamadas Salientes de ${label}`, data: filtered } });
        }
    }, [data, chartsData, navigate]);

    // 2. Daily Trend Drill-down
    const handleDailyClick = useCallback((event, elements) => {
        if (!elements || elements.length === 0) return;
        const index = elements[0].index;
        const dateStr = dailyData.labels[index]; // YYYY-MM-DD

        if (dateStr) {
            const filtered = data.filter(r => {
                return r.calldate && r.calldate.startsWith(dateStr);
            });
            navigate('/details', { state: { title: `Llamadas del ${dateStr}`, data: filtered } });
        }
    }, [data, dailyData, navigate]);

    // 3. Top Callers Drill-down
    const handleTopCallersClick = useCallback((event, elements) => {
        if (!elements || elements.length === 0) return;
        const index = elements[0].index;
        const sourceNumber = topCallersData.labels[index];

        if (sourceNumber) {
            const filtered = data.filter(r => r.src === sourceNumber || r.source === sourceNumber);
            navigate('/details', { state: { title: `Llamadas de ${sourceNumber}`, data: filtered } });
        }
    }, [data, topCallersData, navigate]);

    // 4. Hourly Chart Drill-down
    const handleHourlyClick = useCallback((event, elements) => {
        if (!elements || elements.length === 0) return;
        const index = elements[0].index;
        const label = filteredHourlyData.labels[index];

        if (label) {
            const hour = parseInt(label.split(':')[0], 10);
            const filtered = data.filter(r => {
                if (!r.calldate) return false;
                // Use substring to allow detail view to match graph bucket exactly
                // Matches logic in dashboardProcessing.js
                // Format YYYY-MM-DD HH:mm:ss OR YYYY-MM-DDTHH:mm:ss.sssZ
                const isISO = r.calldate.includes('T');
                const h = parseInt(isISO ? r.calldate.substring(11, 13) : r.calldate.substring(11, 13), 10);
                return h === hour;
            });
            navigate('/details', { state: { title: `Llamadas a las ${label}`, data: filtered } });
        }
    }, [data, filteredHourlyData, navigate]);

    // 5. Weekly Calls Drill-down (Bar)
    const handleWeeklyClick = useCallback((event, elements) => {
        if (!elements || elements.length === 0) return;
        const index = elements[0].index;
        const dayLabel = weeklyCallsData.labels[index];
        const daysMap = { 'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6 };
        const targetDayIndex = daysMap[dayLabel];

        if (targetDayIndex !== undefined) {
            const filtered = data.filter(r => {
                if (!r.calldate) return false;
                // Must strip Z to ensure "local" day matches chart "local" day logic
                const dateStr = r.calldate.replace('T', ' ').replace('Z', '');
                const d = new Date(dateStr).getDay();
                return d === targetDayIndex;
            });
            navigate('/details', { state: { title: `Llamadas - ${dayLabel}`, data: filtered } });
        }
    }, [data, weeklyCallsData, navigate]);

    const handleConcurrencyClick = useCallback((event, elements) => {
        if (!elements || elements.length === 0) return;
        const index = elements[0].index;
        const label = concurrencyChartData.labels[index];
        if (label) {
            const parts = label.split(',');
            if (parts.length === 2) {
                const timePart = parts[1].trim();
                const filtered = data.filter(r => {
                    const d = new Date(r.calldate);
                    const dLabel = d.getDate();
                    const dHour = d.getHours();
                    const labelDay = parseInt(label.split(' ')[0], 10);
                    const labelHour = parseInt(timePart.split(':')[0], 10);
                    return dLabel === labelDay && dHour === labelHour;
                });
                navigate('/details', { state: { title: `Pico de Llamadas - ${label}`, data: filtered } });
            }
        }
    }, [data, concurrencyChartData, navigate]);

    const handleDailyLineClick = useCallback((event, elements) => {
        if (!elements || elements.length === 0 || !dailyLineData) return;
        const index = elements[0].index;
        const datasetIndex = elements[0].datasetIndex;
        const dateStr = dailyLineData.labels[index];
        const branchLabel = dailyLineData.datasets[datasetIndex].label;

        if (dateStr && branchLabel) {
            const filtered = data.filter(r => {
                const isCorrectDate = r.calldate && r.calldate.startsWith(dateStr);
                if (!isCorrectDate) return false;

                // Determine branch of THIS row using same logic as dashboardProcessing.js
                let rowBranch = null;
                const srcName = extensionsMap[r.src];
                const destName = extensionsMap[r.destination];

                if (srcName) {
                    if (srcName.startsWith('TX')) rowBranch = 'Tuxtepec';
                    else if (srcName.startsWith('SC')) rowBranch = 'Salina Cruz';
                    else if (srcName.startsWith('JT')) rowBranch = 'Juchitán';
                    else if (srcName.startsWith('CB')) rowBranch = 'CUAD';
                }

                if (!rowBranch && destName) {
                    if (destName.startsWith('TX')) rowBranch = 'Tuxtepec';
                    else if (destName.startsWith('SC')) rowBranch = 'Salina Cruz';
                    else if (destName.startsWith('JT')) rowBranch = 'Juchitán';
                    else if (destName.startsWith('CB')) rowBranch = 'CUAD';
                }

                const TX_TRUNKS = ['2878759701', '2878750303'];
                if (!rowBranch) {
                    if (TX_TRUNKS.includes(r.src) || TX_TRUNKS.includes(r.destination)) {
                        rowBranch = 'Tuxtepec';
                    }
                }

                return rowBranch === branchLabel;
            });
            navigate('/details', { state: { title: `Llamadas ${branchLabel} - ${dateStr}`, data: filtered } });
        }
    }, [data, dailyLineData, extensionsMap, navigate]);

    const handleAreaCodeClick = useCallback((event, elements) => {
        if (!elements || elements.length === 0) return;
        const index = elements[0].index;
        const code = areaCodeChartData.labels[index];
        if (code) {
            const filtered = data.filter(r => {
                const src = r.src || '';
                if (src.startsWith(code)) return true;
                if (src.startsWith('52') && src.substring(2).startsWith(code)) return true;
                return false;
            });
            navigate('/details', { state: { title: `Llamadas Lada ${code}`, data: filtered } });
        }
    }, [data, areaCodeChartData, navigate]);

    const isOutgoing = filters.calltype === '3';

    const handleHeatmapClick = useCallback((dayLabel, hourLabel, value) => {
        if (value === 0) return;
        const daysMap = { 'Dom': 0, 'Lun': 1, 'Mar': 2, 'Mié': 3, 'Jue': 4, 'Vie': 5, 'Sáb': 6 };
        const targetDayIndex = daysMap[dayLabel];
        const targetHour = parseInt(hourLabel.split(':')[0], 10);

        if (targetDayIndex !== undefined && !isNaN(targetHour)) {
            const filtered = data.filter(r => {
                if (!r.calldate) return false;

                // Match dashboardProcessing.js Logic EXACTLY:
                // 1. Hour via substring (ignores timezone shift)
                const isISO = r.calldate.includes('T');
                const localHour = parseInt(isISO ? r.calldate.substring(11, 13) : r.calldate.substring(11, 13), 10);

                // 2. Day via "stripped" Date object (ignores timezone shift)
                const dateStr = r.calldate.replace('T', ' ').replace('Z', '');
                const localDay = new Date(dateStr).getDay();

                return localDay === targetDayIndex && localHour === targetHour;
            });
            navigate('/details', { state: { title: `Intensidad - ${dayLabel} ${hourLabel}`, data: filtered } });
        }
    }, [data, navigate]);

    const dispositionChartData = {
        labels: ['Contestadas', 'No Contestadas', 'Ocupado', 'Fallido'],
        datasets: [
            {
                data: [stats.answered, stats.noAnswer, stats.busy, stats.failed],
                backgroundColor: [
                    'rgba(34, 197, 94, 0.8)', // Green
                    'rgba(239, 68, 68, 0.8)', // Red
                    'rgba(249, 115, 22, 0.8)', // Orange
                    'rgba(107, 114, 128, 0.8)', // Gray
                ],
                borderColor: '#ffffff',
                borderWidth: 2,
            },
        ],
    };

    const treemapChartData = {
        datasets: [{
            label: isOutgoing ? 'Top Destinos (Mapa)' : 'Top Callers (Mapa de Volumen)',
            tree: isOutgoing ? (chartsData?.treemapDest || []) : (treemapData || []),
            key: 'value',
            groups: ['name'],
            backgroundColor: (ctx) => {
                const val = ctx.raw ? ctx.raw.v : 0;
                return val > 50 ? 'rgba(195, 0, 47, 0.9)' : 'rgba(195, 0, 47, 0.6)';
            },
            labels: { display: true, color: '#fff', font: { size: 11, weight: 'bold' } }
        }]
    };

    const chartDefaults = {
        color: '#374151', // gray-700
        font: {
            family: 'Inter, system-ui, sans-serif',
            size: 11,
            weight: '600'
        }
    };

    const lineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'top',
                labels: { ...chartDefaults }
            },
            tooltip: {
                backgroundColor: 'rgba(17, 24, 39, 0.95)', // gray-900
                padding: 12,
                cornerRadius: 8,
                titleFont: { size: 13, weight: 'bold' },
                bodyFont: { size: 12 },
                boxPadding: 6
            },
        },
        scales: {
            x: {
                grid: { display: true, color: '#f3f4f6' },
                ticks: { ...chartDefaults, maxRotation: 0 }
            },
            y: {
                beginAtZero: true,
                border: { dash: [4, 4], display: false },
                grid: { color: '#f3f4f6' },
                ticks: { ...chartDefaults }
            }
        },
        elements: {
            line: { tension: 0.4, borderWidth: 3 },
            point: { radius: 4, hitRadius: 10, hoverRadius: 6, borderWidth: 2, backgroundColor: '#fff' }
        }
    };

    if (!chartsData) return null; // Guard against missing data

    return (
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">

            {/* Row 1: Status (2x1) & Hourly Detail (4x1) */}
            {isVisible('disposition') && stats && (
                <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-500 group">
                    <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-gray-700 border-b border-gray-50 pb-3 flex items-center gap-2">
                        <span className="w-2 h-6 bg-green-500 rounded-full"></span>
                        Estado de Llamadas
                    </h3>
                    <div className="h-64 flex justify-center">
                        <Doughnut
                            data={dispositionChartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                onClick: handleDispositionClick,
                                plugins: { legend: { position: 'right', labels: { font: { family: 'Inter', size: 11 } } } }
                            }}
                        />
                    </div>
                </div>
            )}

            <div className="lg:col-span-4 bg-white rounded-xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-500">
                <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-gray-700 border-b border-gray-50 pb-3 flex items-center gap-2">
                    <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
                    Detalle por Hora
                </h3>
                <div className="h-64">
                    <Line
                        data={filteredHourlyData}
                        options={{ ...lineOptions, onClick: handleHourlyClick }}
                    />
                </div>
            </div>

            {/* Row 2: Daily Trend (Full width) */}
            {isVisible('daily') && dailyData && (
                <div className="lg:col-span-6 bg-white rounded-xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-500">
                    <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-gray-700 border-b border-gray-50 pb-3 flex items-center gap-2">
                        <span className="w-2 h-6 bg-amber-500 rounded-full"></span>
                        Tendencia Diaria
                    </h3>
                    <div className="h-80">
                        <Line
                            data={dailyData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                onClick: handleDailyClick,
                                plugins: { legend: { display: false } },
                                elements: { line: { tension: 0.4, fill: true } }
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Row 3: Top Callers & Weekly (3x1 each = 50% width) */}
            <div className="lg:col-span-3 bg-white rounded-xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-500">
                <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-gray-700 border-b border-gray-50 pb-3 flex items-center gap-2">
                    <span className="w-2 h-6 bg-purple-500 rounded-full"></span>
                    {isOutgoing ? 'Top Destinos Externos' : 'Top Callers (Mapa de Volumen)'}
                </h3>
                <div className="h-72">
                    <Chart
                        type="treemap"
                        data={treemapChartData}
                        options={{
                            plugins: { legend: { display: false } },
                            maintainAspectRatio: false,
                            onClick: isOutgoing ? handleTreemapDestClick : handleTreemapClick
                        }}
                    />
                </div>
            </div>

            {isVisible('weekly-calls') && weeklyCallsData && (
                <div className="lg:col-span-3 bg-white rounded-xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-500">
                    <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-gray-700 border-b border-gray-50 pb-3 flex items-center gap-2">
                        <span className="w-2 h-6 bg-teal-500 rounded-full"></span>
                        Distribución Semanal
                    </h3>
                    <div className="h-72">
                        <Bar data={weeklyCallsData} options={{ maintainAspectRatio: false, onClick: handleWeeklyClick, plugins: { legend: { display: false } } }} />
                    </div>
                </div>
            )}

            {/* Row 4: Concurrency (6x1 = Full width) */}
            {isVisible('concurrency') && concurrencyChartData && (
                <div className="lg:col-span-6 bg-white rounded-xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-500">
                    <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-gray-700 border-b border-gray-50 pb-3 flex items-center gap-2">
                        <span className="w-2 h-6 bg-orange-500 rounded-full"></span>
                        Picos de Simultaneidad
                    </h3>
                    <div className="h-80">
                        <Line data={concurrencyChartData} options={{ maintainAspectRatio: false, onClick: handleConcurrencyClick, plugins: { legend: { display: false } } }} />
                    </div>
                </div>
            )}

            {/* Row 5: Heatmap & Area Codes (3x1 each = 50% width) */}
            {isVisible('weekly-heatmap') && weeklyHeatmapData && (
                <div className="lg:col-span-3">
                    <HeatmapMatrix
                        title="Mapa de Intensidad"
                        className="h-full"
                        data={weeklyHeatmapData}
                        xLabels={Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`)}
                        onCellClick={handleHeatmapClick}
                    />
                </div>
            )}

            {isVisible('area-code') && (areaCodeChartData || (isOutgoing && chartsData?.srcExtOutgoing)) && (
                <div className="lg:col-span-3 bg-white rounded-xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-500 h-full flex flex-col">
                    <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-gray-700 border-b border-gray-50 pb-3 flex items-center gap-2">
                        <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                        {isOutgoing ? 'Extensiones más Activas' : 'Llamadas por Código de Área'}
                    </h3>
                    <div className="flex-1 min-h-[300px]">
                        <Bar
                            data={isOutgoing ? chartsData.srcExtOutgoing : areaCodeChartData}
                            options={{
                                maintainAspectRatio: false,
                                onClick: isOutgoing ? handleSrcExtOutgoingClick : handleAreaCodeClick,
                                plugins: { legend: { display: false } }
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Row 6: Extension Stats (6x1 = Full width) */}
            <div className="lg:col-span-6">
                {isVisible('extension-stats') && extensionStats && (
                    <ExtensionStatsTable data={extensionStats} />
                )}
            </div>

            {/* Row 7: Daily Trend by Line (Full width) */}
            {isVisible('daily-line') && dailyLineData && (
                <div className="lg:col-span-6 bg-white rounded-xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-500">
                    <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-gray-700 border-b border-gray-50 pb-3 flex items-center gap-2">
                        <span className="w-2 h-6 bg-pink-500 rounded-full"></span>
                        Tendencia Diaria por Línea
                    </h3>
                    <div className="h-80">
                        <Line
                            data={dailyLineData}
                            options={{ ...lineOptions, onClick: handleDailyLineClick }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardCharts;
