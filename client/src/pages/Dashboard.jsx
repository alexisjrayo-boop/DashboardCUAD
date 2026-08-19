import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
// extensionsMap removed - will use fetched data or internal state
import StatCard from '../components/Dashboard/StatCard';
import DashboardFilters from '../components/Dashboard/DashboardFilters';
import DashboardCharts from '../components/Dashboard/DashboardCharts';
import ExtensionStatsTable from '../components/Dashboard/ExtensionStatsTable';
import ChartConfigModal from '../components/Dashboard/ChartConfigModal';
import { useDashboard } from '../context/DashboardContext';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, LogOut, Settings, Award, FileText, Loader2, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import gasmeLogo from '../assets/gasme.PNG';
import { parseCalldate } from '../utils/dateUtils';
import UserManagementModal from '../components/Dashboard/UserManagementModal';
import { exportChartsToPDF } from '../utils/exportUtils';

// Default dashboard configuration
const DEFAULT_CONFIG = {
    stats: [
        { id: 'total', label: 'Total Llamadas', visible: true },
        { id: 'answered', label: 'Contestadas', visible: true },
        { id: 'noAnswer', label: 'No Contestadas', visible: true },
        { id: 'busy', label: 'Ocupado', visible: true },
        { id: 'failed', label: 'Fallido', visible: true },
        { id: 'topExtension', label: 'Extensión Más Concurrida', visible: true }
    ],
    charts: [
        { id: 'disposition', label: 'Estado de Llamadas', order: 0, size: 'small', visible: true },
        { id: 'hourly', label: 'Detalle por Hora (Puntos y Líneas)', order: 1, size: 'large', visible: true },
        { id: 'top-callers', label: 'Números que Más Llaman', order: 2, size: 'medium', visible: true },
        { id: 'weekly-calls', label: 'Llamadas por Día de la Semana', order: 3, size: 'medium', visible: true },
        { id: 'weekly-heatmap', label: 'Intensidad Semanal (Día vs Hora)', order: 4, size: 'large', visible: true },
        { id: 'extension-stats', label: 'Análisis por Extensión Destino', order: 6, size: 'large', visible: true },
        { id: 'area-code', label: 'Llamadas por Código de Área', order: 8, size: 'medium', visible: true },
        { id: 'treemap', label: 'Top Callers (Mapa Treemap)', order: 9, size: 'medium', visible: true },
        { id: 'daily-line', label: 'Tendencia Diaria por Línea', order: 10, size: 'large', visible: true }
    ]
};

import { Helmet } from 'react-helmet-async';

const Dashboard = () => {

    const { logout, user } = useAuth();
    const navigate = useNavigate();

    // Consume Context
    const {
        loading, data, stats, filters, chartsData, extensionsMap,
        updateFilters, clearFilters, fetchData, hasLoadedOnce
    } = useDashboard();

    // Safety guard for initial load
    const charts = chartsData || {};

    const {
        hourly: hourlyData,
        daily: dailyData,
        topCallers: topCallersData,
        weeklyCalls: weeklyCallsData,
        dstStats: dstStatsData,
        destinationStats: destinationStatsData,
        concurrency: concurrencyChartData,
        areaCode: areaCodeChartData,
        sankey: sankeyChartData,
        weeklyHeatmap: weeklyHeatmapData,
        destExtensionHeatmap: destExtensionHeatmapData,
        extensionStats,
        treemap: treemapData,
        dailyLine: dailyLineData
    } = charts;


    // Dashboard configuration state
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [dashboardConfig, setDashboardConfig] = useState(DEFAULT_CONFIG);



    // Load dashboard configuration from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('dashboardConfig');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Merge stats array smartly to include new defaults
                const mergedStats = DEFAULT_CONFIG.stats.map(defStat => {
                    const savedStat = parsed.stats?.find(s => s.id === defStat.id);
                    return savedStat ? { ...defStat, ...savedStat } : defStat;
                });

                setDashboardConfig(prev => ({
                    ...DEFAULT_CONFIG,
                    ...parsed,
                    stats: mergedStats
                }));
            } catch (error) {
                console.error('Error loading dashboard config:', error);
            }
        }
    }, []);

    // Save dashboard configuration
    const handleSaveConfig = (newConfig) => {
        setDashboardConfig(newConfig);
        localStorage.setItem('dashboardConfig', JSON.stringify(newConfig));
    };

    // Initial Fetch (Only if not loaded once, or we might rely on the context to do it)
    useEffect(() => {
        // If we have extensions but no data loaded yet, fetch.
        // Or if we want to ensure fresh data on mount if it's stale (left for future logic)
        // For now, if hasLoadedOnce is false, we fetch.
        if (Object.keys(extensionsMap).length > 0 && !hasLoadedOnce) {
            fetchData();
        }
    }, [extensionsMap, hasLoadedOnce, fetchData]);

    const handleFilterChange = (e) => {
        // Handle both standard inputs and custom multiselect events (which return value directly or object)
        if (e.target) {
            updateFilters({ [e.target.name]: e.target.value });
        }
    };

    // Custom handlers for multiselect
    const handleDestChange = (val) => updateFilters({ destination: val });

    // Handler for date range changes (both dates at once)
    const handleDateRangeChange = (startDate, endDate) => {
        updateFilters({ startDate, endDate });
    };

    const handleSearch = () => {
        fetchData();
    };

    // Clear all filters
    const handleClearFilters = () => {
        clearFilters();
    };

    // Remove individual filter
    // Remove individual filter
    const handleRemoveFilter = (filterName) => {
        if (filterName === 'startDate' || filterName === 'endDate') {
            // Need default dates ref here or just use context logic?
            // Context clearFilters resets ALL. We need updateFilters.
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            const formatDateTime = (d) => {
                const pad = (n) => n < 10 ? '0' + n : n;
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            };

            updateFilters({
                startDate: formatDateTime(new Date(firstDay.setHours(0, 0, 0, 0))),
                endDate: formatDateTime(new Date(today.setHours(23, 59, 59, 999)))
            });
        } else if (filterName === 'destination') {
            updateFilters({ destination: [] });
        } else {
            updateFilters({ [filterName]: '' });
        }
    };

    // Navigate to Details View
    const handleStatClick = (statId, title) => {
        let filteredData = [];
        // Filter logic based on statId
        switch (statId) {
            case 'total':
                filteredData = data;
                break;
            case 'answered':
                filteredData = data.filter(r => r.disposition === 'ANSWERED');
                break;
            case 'noAnswer':
                filteredData = data.filter(r => r.disposition === 'NO ANSWER');
                break;
            case 'busy':
                filteredData = data.filter(r => r.disposition === 'BUSY');
                break;
            case 'failed':
                filteredData = data.filter(r => r.disposition === 'FAILED');
                break;
            default:
                filteredData = data;
        }

        navigate('/details', {
            state: {
                title: title,
                data: filteredData
            }
        });
    };

    return (
        <div className="min-h-screen bg-gray-100 text-gray-900 font-sans page-transition">
            <Helmet>
                <title>Dashboard Analítico - CUAD</title>
                <meta name="description" content={`Viendo estadísticas de ${stats.total?.toLocaleString() || 0} llamadas.`} />
            </Helmet>
            {/* Navbar */}
            <nav className="bg-[#C3002F] px-6 py-2 flex justify-between items-center shadow-lg sticky top-0 z-50 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <div className="p-1.5 bg-white rounded-xl shadow-sm">
                        <img src={gasmeLogo} alt="GASME Logo" className="h-7 w-auto" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tighter uppercase leading-none text-white flex items-center gap-2">
                            GASME <span className="text-white">CUAD</span>
                        </h1>
                        <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest mt-0.5">Inteligencia Operativa • Mono Visualizers</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex flex-col items-end mr-1">
                        <span className="text-[11px] font-black text-white uppercase tracking-tight leading-none">
                            {user?.name}
                        </span>
                        <span className="text-[8px] font-bold text-white/60 uppercase tracking-widest mt-1">
                            {user?.role === 'admin' ? 'Administrador' : 'Usuario'}
                        </span>
                    </div>

                    <div className="h-9 w-9 rounded-xl border border-white/20 overflow-hidden bg-white/10 flex-shrink-0 shadow-inner group-hover:border-white/40 transition-colors">
                        {user?.profile_picture ? (
                            <img src={user.profile_picture} alt="Profile" className="h-full w-full object-cover" />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center bg-white/10 text-white font-black text-sm">
                                {(user?.name || user?.username || '?')[0].toUpperCase()}
                            </div>
                        )}
                    </div>

                    {user?.role === 'admin' && (
                        <button
                            onClick={() => setShowUserModal(true)}
                            className="p-2 bg-transparent hover:bg-black/20 text-white rounded-lg border border-white/20 transition-all group"
                            title="Gestionar Usuarios"
                        >
                            <UserPlus className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        </button>
                    )}

                    <button
                        onClick={() => setShowConfigModal(true)}
                        className="p-2 bg-transparent hover:bg-black/20 text-white rounded-lg border border-white/20 transition-all group"
                        title="Configurar Dashboard"
                    >
                        <Settings className="h-5 w-5 group-hover:rotate-90 transition-transform duration-500" />
                    </button>

                    <button
                        onClick={logout}
                        className="p-2 bg-transparent hover:bg-black/20 text-white rounded-lg border border-white/20 transition-all group"
                        title="Cerrar Sesión"
                    >
                        <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            </nav>

            <main className="p-6 max-w-[1600px] mx-auto space-y-6">

                {/* Filters Component */}
                <DashboardFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onDestChange={handleDestChange}
                    onDateRangeChange={handleDateRangeChange}
                    onSearch={handleSearch}
                    loading={loading}
                    resultsCount={data.length}
                    onClearFilters={handleClearFilters}
                    onRemoveFilter={handleRemoveFilter}
                />

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 md:gap-6">
                    {dashboardConfig.stats.find(s => s.id === 'total')?.visible && (
                        <StatCard
                            title="TOTAL LLAMADAS"
                            value={stats.total}
                            icon={Phone}
                            color="nissan"
                            onClick={() => handleStatClick('total', 'Total Llamadas')}
                        />
                    )}
                    {dashboardConfig.stats.find(s => s.id === 'answered')?.visible && (
                        <StatCard
                            title="CONTESTADAS"
                            value={stats.answered}
                            icon={PhoneIncoming}
                            color="green"
                            onClick={() => handleStatClick('answered', 'Llamadas Contestadas')}
                            percentage={stats.total > 0 ? ((stats.answered / stats.total) * 100).toFixed(1) : 0}
                        />
                    )}
                    {dashboardConfig.stats.find(s => s.id === 'noAnswer')?.visible && (
                        <StatCard
                            title="NO CONTESTADAS"
                            value={stats.noAnswer}
                            icon={PhoneMissed}
                            color="red"
                            onClick={() => handleStatClick('noAnswer', 'Llamadas No Contestadas')}
                            percentage={stats.total > 0 ? ((stats.noAnswer / stats.total) * 100).toFixed(1) : 0}
                        />
                    )}
                    {dashboardConfig.stats.find(s => s.id === 'busy')?.visible && (
                        <StatCard
                            title="OCUPADO"
                            value={stats.busy}
                            icon={PhoneOutgoing}
                            color="orange"
                            onClick={() => handleStatClick('busy', 'Llamadas Ocupadas')}
                            percentage={stats.total > 0 ? ((stats.busy / stats.total) * 100).toFixed(1) : 0}
                        />
                    )}
                    {dashboardConfig.stats.find(s => s.id === 'failed')?.visible && (
                        <StatCard
                            title="FALLIDO"
                            value={stats.failed}
                            icon={PhoneOutgoing}
                            color="gray"
                            onClick={() => handleStatClick('failed', 'Llamadas Fallidas')}
                            percentage={stats.total > 0 ? ((stats.failed / stats.total) * 100).toFixed(1) : 0}
                        />
                    )}
                    {dashboardConfig.stats.find(s => s.id === 'topExtension')?.visible && (
                        <StatCard
                            title="EXT. MÁS CONCURRIDA"
                            value={stats.topExtension}
                            subtext={stats.topExtensionCount > 0 ? `${stats.topExtensionCount} interacciones` : ''}
                            icon={Award}
                            color="purple"
                        />
                    )}

                </div>

                {/* Charts Component */}
                {/* Charts Component */}
                <DashboardCharts
                    stats={stats}
                    chartsData={chartsData}
                    hourlyData={hourlyData}
                    dailyData={dailyData}
                    weeklyHeatmapData={weeklyHeatmapData}
                    destExtensionHeatmapData={destExtensionHeatmapData}
                    topCallersData={topCallersData}
                    weeklyCallsData={weeklyCallsData}
                    dstStatsData={dstStatsData}
                    destinationStatsData={destinationStatsData}
                    extensionStats={extensionStats}
                    concurrencyChartData={concurrencyChartData}
                    areaCodeChartData={areaCodeChartData}
                    sankeyChartData={sankeyChartData}
                    treemapData={treemapData}
                    dailyLineData={dailyLineData}
                    chartConfig={dashboardConfig.charts}
                />

                {/* Configuration Modal */}
                <ChartConfigModal
                    isOpen={showConfigModal}
                    onClose={() => setShowConfigModal(false)}
                    config={dashboardConfig}
                    onSave={handleSaveConfig}
                />

                {/* User Management Modal */}
                <UserManagementModal
                    isOpen={showUserModal}
                    onClose={() => setShowUserModal(false)}
                />

            </main>
        </div>
    );
};

export default Dashboard;
