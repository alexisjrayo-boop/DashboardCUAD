import React, { createContext, useContext, useMemo } from 'react';
import { useExtensions } from '../hooks/useExtensions';
import { useDashboardFilters } from '../hooks/useDashboardFilters';
import { useDashboardData } from '../hooks/useDashboardData';
import { calculateGeneralStats, processChartData } from '../utils/dashboardProcessing';

const DashboardContext = createContext();

export const useDashboard = () => useContext(DashboardContext);

export const DashboardProvider = ({ children }) => {
    // 1. Extensions Config
    const extensionsMap = useExtensions();

    // 2. Filter State
    const { filters, updateFilters, clearFilters } = useDashboardFilters();

    // 3. Data Fetching
    const { loading, data: rawData, fetchData, hasLoadedOnce } = useDashboardData(filters);

    // 4. Filter data by branches for global consistency
    const data = useMemo(() => {
        if (!rawData || rawData.length === 0) return [];
        if (Object.keys(extensionsMap).length === 0) return rawData; // Wait for mapping

        return rawData.filter(r => {
            let branch = null;
            const srcName = extensionsMap[r.src];
            const destName = extensionsMap[r.destination];

            // 1. Check by extension name (Prefix TX, SC, JT, CB)
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

            // 2. Check for specific trunk lines (Tuxtepec)
            const TX_TRUNKS = ['2878759701', '2878750303'];
            if (!branch) {
                if (TX_TRUNKS.includes(r.src) || TX_TRUNKS.includes(r.destination)) {
                    branch = 'Tuxtepec';
                }
            }

            return branch !== null;
        });
    }, [rawData, extensionsMap]);

    // 5. Derived Statistics & Charts (Memoized for Performance)
    // Only recalculate when data or extensions mapping changes.
    const stats = useMemo(() => {
        return calculateGeneralStats(data, extensionsMap);
    }, [data, extensionsMap]);

    const chartsData = useMemo(() => {
        return processChartData(data, extensionsMap);
    }, [data, extensionsMap]);

    // Context Value
    const value = {
        loading,
        data,
        rawData, // Keep raw if ever needed
        stats,
        filters,
        chartsData,
        extensionsMap,
        hasLoadedOnce,
        updateFilters,
        clearFilters,
        fetchData,
        processData: () => { } // Deprecated: Logic is now reactive to 'data' changes
    };

    return (
        <DashboardContext.Provider value={value}>
            {children}
        </DashboardContext.Provider>
    );
};
