import React, { useMemo, useState, useEffect } from 'react';
import { RefreshCw, Filter, Calendar, MapPin, Phone, X, LayoutGrid, ChevronDown, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Users } from 'lucide-react';
import MultiSelect from '../Common/MultiSelect';
import FilterPill from '../Common/FilterPill';
import Tooltip from '../Common/Tooltip';
import DateRangePicker from '../Common/DateRangePicker';
import api from '../../services/api';

const DashboardFilters = ({
    filters,
    onFilterChange,
    onDestChange,
    onDateRangeChange,
    onSearch,
    loading,
    resultsCount = 0,
    onClearFilters,
    onRemoveFilter
}) => {
    const [extensionsMap, setExtensionsMap] = useState({});
    const [activeTab, setActiveTab] = useState('incoming');

    // Sync activeTab with filters.calltype on mount or external change
    useEffect(() => {
        if (!filters.calltype || filters.calltype === '2') setActiveTab('incoming');
        else if (filters.calltype === '3') setActiveTab('outgoing');
        else if (filters.calltype === '1') setActiveTab('internal');
    }, [filters.calltype]);

    // Fetch extensions on mount
    useEffect(() => {
        const fetchExtensions = async () => {
            try {
                const response = await api.get('/config/extensions');
                if (response.data && response.data.success && response.data.data) {
                    setExtensionsMap(response.data.data);
                } else {
                    setExtensionsMap({});
                }
            } catch (error) {
                console.error('Error loading extensions:', error);
                setExtensionsMap({});
            }
        };
        fetchExtensions();
    }, []);

    // Prepare options for MultiSelect
    const extensionOptions = useMemo(() => {
        const options = Object.entries(extensionsMap).map(([code, name]) => ({
            value: code,
            label: `${code} - ${name}`
        }));
        return [{ value: 'NO_EXTENSION', label: 'SIN EXTENSIÓN' }, ...options];
    }, [extensionsMap]);

    // Derived lists based on line/location selection
    const destOptions = useMemo(() => {
        const lineMap = {
            '2878750303': 'TX',
            '9717120739': 'JT',
            '9716884348': 'SC',
            'CUAD': 'CB'
        };

        const selectedLocation = filters.line ? lineMap[filters.line] : null;

        return extensionOptions.filter(opt => {
            // Always keep NO_EXTENSION
            if (opt.value === 'NO_EXTENSION') return true;

            // Always keep CB extensions (assume CB starts with 'CB')
            if (opt.label.includes('CB')) return true;

            // If no line selected, show everything
            if (!selectedLocation) return true;

            // If line selected, show only matching location
            if (opt.label.includes(selectedLocation)) return true;

            return false;
        });
    }, [extensionOptions, filters.line]);

    const [activePreset, setActivePreset] = useState(null);

    // Wrapper for custom date changes to clear active preset
    const handleCustomDateChange = (start, end) => {
        setActivePreset(null);
        if (onDateRangeChange) onDateRangeChange(start, end);
    };

    // Date preset handlers
    const setDatePreset = (preset) => {
        if (loading) return;
        setActivePreset(preset); // Set active

        const today = new Date();
        const formatDateTime = (d) => {
            const pad = (n) => n < 10 ? '0' + n : n;
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };

        const setTime = (d, h, m, s) => {
            const newD = new Date(d);
            newD.setHours(h, m, s, 0);
            return newD;
        };

        let startDate, endDate;

        switch (preset) {
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                startDate = formatDateTime(setTime(yesterday, 0, 0, 0));
                endDate = formatDateTime(setTime(yesterday, 23, 59, 59));
                break;
            case 'week':
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                startDate = formatDateTime(setTime(weekStart, 0, 0, 0));
                endDate = formatDateTime(setTime(today, 23, 59, 59));
                break;
            case 'month':
                startDate = formatDateTime(setTime(new Date(today.getFullYear(), today.getMonth(), 1), 0, 0, 0));
                endDate = formatDateTime(setTime(today, 23, 59, 59));
                break;
            case 'lastMonth':
                const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                startDate = formatDateTime(setTime(lastMonth, 0, 0, 0));
                endDate = formatDateTime(setTime(lastMonthEnd, 23, 59, 59));
                break;
            default:
                return;
        }

        if (onDateRangeChange) {
            onDateRangeChange(startDate, endDate);
        }
    };


    // Tab Handler
    const handleTabChange = (tab) => {
        if (loading) return; // Block tab switch if loading
        setActiveTab(tab);
        let typeValue = '';
        if (tab === 'incoming') typeValue = '2';
        else if (tab === 'outgoing') typeValue = '3';
        else if (tab === 'internal') typeValue = '1';

        onFilterChange({ target: { name: 'calltype', value: typeValue } });

        if (onRemoveFilter) {
            onRemoveFilter('line');
            onRemoveFilter('locationDestination');
            onRemoveFilter('destination');
            // Keeping disposition if user wants it, but clearing others
            onRemoveFilter('disposition');
        }
    };

    // Keyboard handler for tabs
    const handleTabKeyDown = (e, tabId) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleTabChange(tabId);
        }
    };

    // Format date range for display
    const formatDateRange = () => {
        if (!filters.startDate && !filters.endDate) return 'Sin fecha especificada';
        const start = filters.startDate ? new Date(filters.startDate).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '';
        const end = filters.endDate ? new Date(filters.endDate).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '';
        if (start && end) return `${start} - ${end}`;
        return start || end;
    };

    // Get active filters for display
    const getActiveFilters = () => {
        const active = [];
        // Date
        if (filters.startDate || filters.endDate) {
            active.push({
                id: 'dateRange', icon: Calendar, label: 'Fecha', value: formatDateRange(),
                onRemove: () => { if (!loading) { onRemoveFilter('startDate'); onRemoveFilter('endDate'); } }
            });
        }
        // Line
        if (filters.line) {
            const lineNames = { '2878750303': 'Tuxtepec', '9717120739': 'Juchitán', '9716884348': 'Salina Cruz', 'CUAD': 'No Registrada' };
            active.push({
                id: 'line', icon: Phone, label: 'Línea', value: lineNames[filters.line] || filters.line,
                onRemove: () => !loading && onRemoveFilter('line')
            });
        }
        // Location
        if (filters.locationDestination) {
            const locationNames = { 'TX': 'Tuxtepec', 'SC': 'Salina Cruz', 'JT': 'Juchitán', 'CB': 'CUAD' };
            active.push({
                id: 'locationDestination', icon: MapPin, label: 'Ubicación', value: locationNames[filters.locationDestination] || filters.locationDestination,
                onRemove: () => !loading && onRemoveFilter('locationDestination')
            });
        }
        // Extensions
        if (filters.destination && filters.destination.length > 0) {
            const count = filters.destination.length;
            active.push({
                id: 'destination', icon: Users, label: 'Extensiones', value: count === 1 ? filters.destination[0] : `${count} seleccionadas`,
                onRemove: () => !loading && onRemoveFilter('destination')
            });
        }
        // Disposition
        if (filters.disposition) {
            const dispNames = { 'ANSWERED': 'Contestadas', 'NO ANSWER': 'No Contestadas', 'BUSY': 'Ocupado', 'FAILED': 'Fallido' };
            active.push({
                id: 'disposition', icon: Filter, label: 'Estado', value: dispNames[filters.disposition] || filters.disposition,
                onRemove: () => !loading && onRemoveFilter('disposition')
            });
        }
        // Source (Caller Number)
        if (filters.source) {
            active.push({
                id: 'source', icon: Phone, label: 'Fuente', value: filters.source,
                onRemove: () => !loading && onRemoveFilter('source')
            });
        }
        return active;
    };

    const activeFilters = getActiveFilters();
    const hasActiveFilters = activeFilters.length > 0;

    // Tabs Configuration
    const tabs = [
        { id: 'incoming', label: 'ENTRANTES', icon: ArrowDownLeft, color: 'text-green-600' },
        { id: 'outgoing', label: 'SALIENTES', icon: ArrowUpRight, color: 'text-blue-600' },
        { id: 'internal', label: 'INTERNAS', icon: ArrowRightLeft, color: 'text-orange-600' },
    ];

    return (
        <div className="bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-xl border border-gray-100 font-sans transition-all duration-300">
            {/* 1. Header & Tabs */}
            <div className={`border-b border-gray-100 ${loading ? 'opacity-80' : ''}`}>
                <div className="px-6 py-4">
                    <div className="flex justify-between items-center mb-0">
                        <div className="flex items-center gap-3">
                            <div className="bg-nissan-red/10 p-1.5 rounded-lg">
                                <Filter className="h-5 w-5 text-nissan-red" />
                            </div>
                            <div className="flex items-baseline gap-3">
                                <h2 className="text-lg font-bold uppercase text-gray-900 tracking-tight">Filtros</h2>
                                <p className="text-[10px] text-gray-500 font-semibold tracking-wide uppercase opacity-70">Refina el análisis</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex items-center gap-6 overflow-x-auto no-scrollbar px-6 mb-[-1px]" role="tablist" aria-label="Tipos de llamadas">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                id={`tab-${tab.id}`}
                                role="tab"
                                aria-selected={isActive}
                                aria-controls={`panel-${tab.id}`}
                                onClick={() => handleTabChange(tab.id)}
                                onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
                                disabled={loading}
                                className={`
                                        group flex items-center gap-2 pb-2 border-b-2 transition-all duration-200 min-w-max px-1
                                        ${isActive
                                        ? 'border-nissan-red text-nissan-red'
                                        : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'}
                                        ${loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                                    `}
                            >
                                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-nissan-red' : 'text-gray-500 group-hover:text-gray-700'}`} aria-hidden="true" />
                                <span className={`text-[10px] font-bold tracking-wider ${isActive ? '' : ''}`}>
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 2. Main Filter Area */}
            <div
                className={`p-4 bg-gray-50/30 transition-opacity duration-200 overflow-visible relative z-30 ${loading ? 'opacity-60 pointer-events-none grayscale' : ''}`}
                role="tabpanel"
                id={`panel-${activeTab}`}
                aria-labelledby={`tab-${activeTab}`}
            >

                {/* Date Selection Row (Always Visible) */}
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 mb-4 relative z-30">
                    <div className="flex flex-col lg:flex-row items-center justify-start gap-4">
                        {/* Label Group - Minimalist */}
                        <div className="min-w-fit px-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Rango Temporal</span>
                        </div>

                        {/* Controls Group - Expanded */}
                        <div className="flex flex-col md:flex-row items-stretch gap-3 w-full flex-1">
                            {/* Visual Calendar Picker - Takes available space */}
                            <div className="flex-1 w-full">
                                <DateRangePicker
                                    startDate={filters.startDate}
                                    endDate={filters.endDate}
                                    onDateChange={handleCustomDateChange}
                                    disabled={loading}
                                />
                            </div>

                            {/* Presets - Fixed width or auto */}
                            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg w-full md:w-auto justify-center md:justify-start ring-1 ring-gray-100">
                                {['yesterday', 'week', 'month', 'lastMonth'].map(preset => (
                                    <button
                                        key={preset}
                                        onClick={() => setDatePreset(preset)}
                                        disabled={loading}
                                        className={`
                                            flex-1 md:flex-none px-3 py-1.5 text-[10px] font-bold rounded-md transition-all uppercase tracking-wide whitespace-nowrap
                                            ${activePreset === preset
                                                ? 'bg-[#C3002F] text-white shadow shadow-red-200'
                                                : 'text-gray-600 hover:bg-white hover:text-[#C3002F] hover:shadow-sm'
                                            }
                                            disabled:opacity-50 disabled:cursor-not-allowed
                                        `}
                                    >
                                        {{
                                            'yesterday': 'Ayer',
                                            'week': 'Semana',
                                            'month': 'Mes',
                                            'lastMonth': 'Mes Ant.'
                                        }[preset]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Specific Filters Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 relative z-10">

                    {/* Column 1: Line OR Location */}
                    <div className="space-y-1.5 lg:col-span-2">
                        {(activeTab === 'incoming' || activeTab === 'outgoing') ? (
                            <>
                                <label
                                    htmlFor="filter-line"
                                    className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"
                                >
                                    <Phone className="h-2.5 w-2.5" aria-hidden="true" /> {activeTab === 'outgoing' ? 'Línea Origen' : 'Línea Receptora'}
                                </label>
                                <div className="relative group/select">
                                    <select
                                        id="filter-line"
                                        name="line"
                                        value={filters.line || ''}
                                        onChange={onFilterChange}
                                        disabled={loading}
                                        className="w-full h-9 appearance-none bg-white border border-gray-100 rounded-lg px-3 py-1 text-xs font-bold text-gray-900 focus:border-nissan-red/30 focus:ring-4 focus:ring-nissan-red/5 outline-none transition-all cursor-pointer disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed shadow-sm"
                                    >
                                        <option value="">Todas las Líneas</option>
                                        <option value="2878750303">Tuxtepec (287)</option>
                                        <option value="9717120739">Juchitán (971-712)</option>
                                        <option value="9716884348">Salina Cruz (971-688)</option>
                                        <option value="CUAD" className="font-bold">CB - CUAD</option>
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-3.5 w-3.5 text-gray-300 group-hover/select:text-nissan-red transition-colors" aria-hidden="true" />
                                </div>
                            </>
                        ) : activeTab === 'internal' ? (
                            <>
                                <label
                                    htmlFor="filter-location"
                                    className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"
                                >
                                    <MapPin className="h-2.5 w-2.5" aria-hidden="true" /> Ubicación
                                </label>
                                <div className="relative group/select">
                                    <select
                                        id="filter-location"
                                        name="locationDestination"
                                        value={filters.locationDestination || ''}
                                        onChange={onFilterChange}
                                        disabled={loading}
                                        className="w-full h-9 appearance-none bg-white border border-gray-100 rounded-lg px-3 py-1 text-xs font-bold text-gray-900 focus:border-nissan-red/30 focus:ring-4 focus:ring-nissan-red/5 outline-none transition-all cursor-pointer disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed shadow-sm"
                                    >
                                        <option value="">Todas</option>
                                        <option value="TX">Tuxtepec</option>
                                        <option value="SC">Salina Cruz</option>
                                        <option value="JT">Juchitán</option>
                                        <option value="CB">CUAD</option>
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-3.5 w-3.5 text-gray-300 group-hover/select:text-nissan-red transition-colors" aria-hidden="true" />
                                </div>
                            </>
                        ) : null}
                    </div>

                    {/* Column 2: Extensions */}
                    <div className="space-y-1.5 lg:col-span-2">
                        <label
                            id="label-extensions"
                            className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"
                        >
                            <Users className="h-2.5 w-2.5" aria-hidden="true" /> Extensiones
                        </label>
                        <div className="h-9">
                            <MultiSelect
                                options={destOptions}
                                selected={filters.destination}
                                onChange={onDestChange}
                                placeholder={filters.destination.length > 0 ? `${filters.destination.length} sel.` : "Cualquier extensión..."}
                                disabled={loading}
                                ariaLabelledBy="label-extensions"
                            />
                        </div>
                    </div>

                    {/* Column 3: Disposition */}
                    <div className="space-y-1.5 lg:col-span-2">
                        <label
                            htmlFor="filter-disposition"
                            className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"
                        >
                            <Filter className="h-2.5 w-2.5" aria-hidden="true" /> Estado
                        </label>
                        <div className="relative group/select">
                            <select
                                id="filter-disposition"
                                name="disposition"
                                value={filters.disposition}
                                onChange={onFilterChange}
                                disabled={loading}
                                className="w-full h-9 appearance-none bg-white border border-gray-100 rounded-lg px-3 py-1 text-xs font-bold text-gray-900 focus:border-nissan-red/30 focus:ring-4 focus:ring-nissan-red/5 outline-none transition-all cursor-pointer disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed shadow-sm"
                            >
                                <option value="">Todos los Estados</option>
                                <option value="ANSWERED">Contestadas</option>
                                <option value="NO ANSWER">No Contestadas</option>
                                <option value="BUSY">Ocupado</option>
                                <option value="FAILED">Fallido</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-3.5 w-3.5 text-gray-300 group-hover/select:text-nissan-red transition-colors" aria-hidden="true" />
                        </div>
                    </div>

                </div>
            </div >

            {/* 3. Footer / Active Filters / Actions */}
            < div className="bg-white px-6 py-3 border-t border-gray-50 shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.02)]" >
                <div className="flex flex-col lg:flex-row justify-between items-center gap-4">

                    {/* Active Filters List */}
                    <div className="flex-1 w-full">
                        {hasActiveFilters ? (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-2">Filtros:</span>
                                {activeFilters.map((filter) => (
                                    <FilterPill
                                        key={filter.id}
                                        icon={filter.icon}
                                        label={filter.label}
                                        value={filter.value}
                                        onRemove={filter.onRemove}
                                    />
                                ))}
                                <button
                                    onClick={onClearFilters}
                                    disabled={loading}
                                    className="text-[10px] text-nissan-red hover:underline font-bold uppercase tracking-wider ml-3 disabled:text-gray-300 transition-colors"
                                >
                                    Limpiar
                                </button>
                            </div>
                        ) : (
                            <div className="text-xs text-gray-600 font-semibold italic">
                                No se han aplicado filtros adicionales.
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-4 w-full lg:w-auto">
                        {resultsCount > 0 && (
                            <div className="text-right hidden xl:block min-w-max">
                                <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wider leading-none mb-1">Resultados</p>
                                <p className="text-base font-bold text-gray-900 leading-none tracking-tight">{resultsCount.toLocaleString()}</p>
                            </div>
                        )}
                        {/* <div className="relative group/sync">
                            <button
                                disabled={loading}
                                className="group relative overflow-hidden bg-white text-gray-700 border border-gray-200 px-6 py-2.5 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2 font-bold tracking-wider uppercase text-xs disabled:opacity-50"
                            >
                                <ArrowDownLeft className="h-3.5 w-3.5 rotate-180" aria-hidden="true" />
                                Sincronizar
                                <ChevronDown className="h-3 w-3 ml-1 text-gray-400" />
                            </button>

                            <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden hidden group-hover/sync:block z-50 animate-in fade-in slide-in-from-bottom-2">
                                <div className="p-1">
                                    <button
                                        onClick={() => {
                                            if (confirm('¿Sincronizar datos recientes? Esto buscará registros faltantes desde la última fecha registrada.')) {
                                                api.post('/admin/trigger-fetch', {}).then(() => alert('Sincronización iniciada en segundo plano.')).catch(e => alert('Error: ' + e.message));
                                            }
                                        }}
                                        className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-50 hover:text-nissan-red rounded-lg transition-colors flex items-center gap-2"
                                    >
                                        <RefreshCw className="h-3 w-3" />
                                        Auto (Incremental)
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm('¿Forzar resincronización de 2026? Esto revisará todo el año actual.')) {
                                                api.post('/admin/trigger-fetch', { year: 2026 }).then(() => alert('Sincronización 2026 iniciada.')).catch(e => alert('Error: ' + e.message));
                                            }
                                        }}
                                        className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-50 hover:text-nissan-red rounded-lg transition-colors flex items-center gap-2"
                                    >
                                        <Calendar className="h-3 w-3" />
                                        Todo 2026
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm('¿Sincronizar año pasado (2025)? Esto puede tardar bastante tiempo.')) {
                                                api.post('/admin/trigger-fetch', { year: 2025 }).then(() => alert('Sincronización 2025 iniciada.')).catch(e => alert('Error: ' + e.message));
                                            }
                                        }}
                                        className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-50 hover:text-nissan-red rounded-lg transition-colors flex items-center gap-2"
                                    >
                                        <Calendar className="h-3 w-3" />
                                        Año Pasado (2025)
                                    </button>
                                </div>
                            </div>
                        </div> */}

                        <button
                            onClick={onSearch}
                            disabled={loading}
                            aria-busy={loading}
                            aria-label={loading ? 'Actualizando datos...' : 'Actualizar reporte'}
                            className="group relative overflow-hidden bg-[#C3002F] text-white px-8 py-2.5 rounded-lg shadow shadow-red-100 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 w-full lg:w-48 font-bold tracking-wider uppercase text-xs disabled:opacity-50 disabled:translate-y-0"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} aria-hidden="true" />
                            {loading ? 'Procesando...' : 'Actualizar'}
                            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-black/10 transition-all duration-300 group-hover:h-1 opacity-0 group-hover:opacity-100"></div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardFilters;
