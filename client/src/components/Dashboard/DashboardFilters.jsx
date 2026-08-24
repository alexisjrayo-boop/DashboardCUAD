import React, { useMemo, useState, useEffect } from 'react';
import { RefreshCw, Filter, Calendar, MapPin, Phone, X, LayoutGrid, ChevronDown, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Users } from 'lucide-react';
import MultiSelect from '../Common/MultiSelect';
import CustomSelect from '../Common/CustomSelect';
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

    const lineOptions = useMemo(() => [
        { value: '', label: 'Todas las Líneas' },
        { value: '2878750303', label: 'Tuxtepec (287)' },
        { value: '9717120739', label: 'Juchitán (971-712)' },
        { value: '9716884348', label: 'Salina Cruz (971-688)' },
        { value: 'CUAD', label: 'BDC' }
    ], []);

    const locationOptions = useMemo(() => [
        { value: '', label: 'Todas las Ubicaciones' },
        { value: 'TX', label: 'Tuxtepec' },
        { value: 'SC', label: 'Salina Cruz' },
        { value: 'JT', label: 'Juchitán' },
        { value: 'CB', label: 'BDC' }
    ], []);

    const dispositionOptions = useMemo(() => [
        { value: '', label: 'Todos los Estados' },
        { value: 'ANSWERED', label: 'Contestadas' },
        { value: 'NO ANSWER', label: 'No Contestadas' },
        { value: 'BUSY', label: 'Ocupado' },
        { value: 'FAILED', label: 'Fallido' }
    ], []);

    const [activePreset, setActivePreset] = useState('month');

    // Sync activePreset when filters change or are cleared
    useEffect(() => {
        if (!filters.startDate && !filters.endDate) {
            setActivePreset('month');
            return;
        }
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const pad = (n) => n < 10 ? '0' + n : n;
        const monthStartPrefix = `${firstDay.getFullYear()}-${pad(firstDay.getMonth() + 1)}-01`;
        if (filters.startDate && filters.startDate.startsWith(monthStartPrefix) && !activePreset) {
            setActivePreset('month');
        }
    }, [filters.startDate, filters.endDate, activePreset]);

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
            case 'today':
                startDate = formatDateTime(setTime(today, 0, 0, 0));
                endDate = formatDateTime(setTime(today, 23, 59, 59));
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
        { id: 'incoming', label: 'ENTRANTES', icon: ArrowDownLeft, color: 'text-emerald-600' },
        { id: 'outgoing', label: 'SALIENTES', icon: ArrowUpRight, color: 'text-blue-600' },
        { id: 'internal', label: 'INTERNAS', icon: ArrowRightLeft, color: 'text-amber-600' },
    ];

    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_10px_25px_rgba(0,0,0,0.03)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.06)] transition-all duration-300 overflow-visible relative z-30 font-sans">
            {/* 1. Header & Tabs */}
            <div className={`border-b border-gray-100 pb-4 mb-4 ${loading ? 'opacity-80' : ''}`}>
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-6 bg-[#C3002F] rounded-full"></span>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">Filtros</h2>
                        <span className="text-[10px] text-gray-400 font-semibold tracking-wide uppercase ml-2 opacity-70">Refina el análisis</span>
                    </div>
                </div>

                {/* Tabs Navigation (Sliding Segment Control) */}
                <div className="p-1 bg-gray-100 rounded-full border border-gray-200/70" role="tablist" aria-label="Tipos de llamadas">
                    <div className="relative grid grid-cols-3 w-full">
                        {/* Sliding Pill Indicator */}
                        <div
                            className="absolute top-0 bottom-0 rounded-full bg-white shadow-sm border border-gray-200/80 transition-transform duration-300 ease-out pointer-events-none"
                            style={{
                                width: '33.333333%',
                                transform: `translateX(${activeTab === 'incoming' ? '0%' : activeTab === 'outgoing' ? '100%' : '200%'})`
                            }}
                        />

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
                                        relative z-10 flex items-center justify-center gap-2 py-2 px-4 text-xs font-bold transition-colors duration-200 rounded-full select-none cursor-pointer
                                        ${isActive
                                            ? 'text-gray-900'
                                            : 'text-gray-500 hover:text-gray-900'
                                        }
                                        ${loading ? 'cursor-not-allowed opacity-50' : ''}
                                    `}
                                >
                                    <Icon className={`h-3.5 w-3.5 transition-colors duration-200 ${isActive ? 'text-[#C3002F]' : 'text-gray-400'}`} aria-hidden="true" />
                                    <span className="tracking-wider">
                                        {tab.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 2. Main Filter Area */}
            <div
                className={`p-4 bg-gray-50/50 rounded-xl border border-gray-100 transition-opacity duration-200 overflow-visible relative z-20 ${loading ? 'opacity-60 pointer-events-none grayscale' : ''}`}
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
                        <div className="flex flex-col md:flex-row items-center gap-3 w-full flex-1">
                            {/* Visual Calendar Picker */}
                            <div className="flex-1 w-full">
                                <DateRangePicker
                                    startDate={filters.startDate}
                                    endDate={filters.endDate}
                                    onDateChange={handleCustomDateChange}
                                    disabled={loading}
                                />
                            </div>

                            {/* Presets - Sliding Segment Bar with Fixed Width and Centered Alignment */}
                            <div className="p-1 bg-gray-100 rounded-full border border-gray-200/70 w-full md:w-[320px] shrink-0 select-none flex items-center">
                                <div className="relative grid grid-cols-4 w-full items-center">
                                    {/* Sliding Red Pill Indicator */}
                                    {activePreset && (
                                        <div
                                            className="absolute top-0 bottom-0 rounded-full bg-[#C3002F] shadow-sm transition-transform duration-300 ease-out pointer-events-none"
                                            style={{
                                                width: '25%',
                                                transform: `translateX(${
                                                    activePreset === 'today' ? '0%' :
                                                    activePreset === 'week' ? '100%' :
                                                    activePreset === 'month' ? '200%' :
                                                    '300%'
                                                })`
                                            }}
                                        />
                                    )}

                                    {[
                                        { id: 'today', label: 'Hoy' },
                                        { id: 'week', label: 'Semana' },
                                        { id: 'month', label: 'Mes' },
                                        { id: 'lastMonth', label: 'Mes Ant.' }
                                    ].map(preset => {
                                        const isActive = activePreset === preset.id;
                                        return (
                                            <button
                                                key={preset.id}
                                                onClick={() => setDatePreset(preset.id)}
                                                disabled={loading}
                                                className={`
                                                    relative z-10 py-1.5 flex items-center justify-center text-[10px] font-bold text-center uppercase tracking-wide transition-colors duration-200 rounded-full cursor-pointer whitespace-nowrap
                                                    ${isActive
                                                        ? 'text-white'
                                                        : 'text-gray-600 hover:text-gray-900'
                                                    }
                                                    disabled:opacity-50 disabled:cursor-not-allowed
                                                `}
                                            >
                                                {preset.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Specific Filters Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 relative z-20">

                    {/* Column 1: Line OR Location */}
                    <div className="space-y-1.5 lg:col-span-2 relative z-30">
                        {(activeTab === 'incoming' || activeTab === 'outgoing') ? (
                            <>
                                <label
                                    id="label-line"
                                    className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"
                                >
                                    <Phone className="h-2.5 w-2.5" aria-hidden="true" /> {activeTab === 'outgoing' ? 'Línea Origen' : 'Línea Receptora'}
                                </label>
                                <div className="h-9 relative z-30">
                                    <CustomSelect
                                        name="line"
                                        options={lineOptions}
                                        value={filters.line || ''}
                                        onChange={onFilterChange}
                                        placeholder="Todas las Líneas"
                                        disabled={loading}
                                        ariaLabelledBy="label-line"
                                    />
                                </div>
                            </>
                        ) : activeTab === 'internal' ? (
                            <>
                                <label
                                    id="label-location"
                                    className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"
                                >
                                    <MapPin className="h-2.5 w-2.5" aria-hidden="true" /> Ubicación
                                </label>
                                <div className="h-9 relative z-30">
                                    <CustomSelect
                                        name="locationDestination"
                                        options={locationOptions}
                                        value={filters.locationDestination || ''}
                                        onChange={onFilterChange}
                                        placeholder="Todas las Ubicaciones"
                                        disabled={loading}
                                        ariaLabelledBy="label-location"
                                    />
                                </div>
                            </>
                        ) : null}
                    </div>

                    {/* Column 2: Extensions */}
                    <div className="space-y-1.5 lg:col-span-2 relative z-30">
                        <label
                            id="label-extensions"
                            className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"
                        >
                            <Users className="h-2.5 w-2.5" aria-hidden="true" /> Extensiones
                        </label>
                        <div className="h-9 relative z-30">
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
                    <div className="space-y-1.5 lg:col-span-2 relative z-30">
                        <label
                            id="label-disposition"
                            className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"
                        >
                            <Filter className="h-2.5 w-2.5" aria-hidden="true" /> Estado
                        </label>
                        <div className="h-9 relative z-30">
                            <CustomSelect
                                name="disposition"
                                options={dispositionOptions}
                                value={filters.disposition || ''}
                                onChange={onFilterChange}
                                placeholder="Todos los Estados"
                                disabled={loading}
                                ariaLabelledBy="label-disposition"
                            />
                        </div>
                    </div>

                </div>
            </div>

            {/* 3. Footer / Active Filters / Actions */}
            <div className="bg-white px-6 py-3 border-t border-gray-50 shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.02)] relative z-10">
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
                                    onClick={() => {
                                        setActivePreset('month');
                                        if (onClearFilters) onClearFilters();
                                    }}
                                    disabled={loading}
                                    className="text-[10px] text-[#C3002F] hover:underline font-bold uppercase tracking-wider ml-3 disabled:text-gray-300 transition-colors cursor-pointer"
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
