import { useState, useCallback, useEffect } from 'react';
import api from '../services/api';

export const useDashboardData = (filters) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

    const fetchData = useCallback(async (forcedFilters = null) => {
        setLoading(true);
        const currentFilters = forcedFilters || filters;

        try {
            const params = new URLSearchParams({ limit: 80000 });

            if (currentFilters.startDate) params.append('startDate', currentFilters.startDate);
            if (currentFilters.endDate) params.append('endDate', currentFilters.endDate);

            if (currentFilters.destination && currentFilters.destination.length > 0) {
                if (currentFilters.calltype === '3') params.append('source', currentFilters.destination.join(','));
                else params.append('destination', currentFilters.destination.join(','));
            }

            if (currentFilters.line) {
                let lineValue = currentFilters.line;
                if (lineValue === 'CUAD') {
                    lineValue = '301,375,378,379,380,381';
                }

                // FIX: If CUAD and Ext 301 are selected, skip line filter to avoid over-filtering
                const has301 = currentFilters.destination && currentFilters.destination.includes('301');
                const skipLineFilter = (currentFilters.line === 'CUAD' && has301);

                if (!skipLineFilter) {
                    if (currentFilters.calltype === '3') params.append('source', lineValue);
                    else params.append('dst', lineValue);
                }
            }

            if (currentFilters.locationDestination && currentFilters.calltype !== '2' && currentFilters.calltype !== '3') {
                params.append('locationDestination', currentFilters.locationDestination);
            }

            if (currentFilters.disposition) params.append('disposition', currentFilters.disposition);
            if (currentFilters.source) params.append('source', currentFilters.source); // Support for Top Callers drill-down
            if (currentFilters.calltype) params.append('calltype', currentFilters.calltype);

            const response = await api.get(`/db/cdrs?${params.toString()}`);
            if (response.data.success) {
                setData(response.data.data);
                setHasLoadedOnce(true);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
        setLoading(false);
    }, [filters]);

    // Auto-fetch ONLY when tab (calltype) changes. 
    // Other filter changes require manual trigger (Search button).
    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.calltype]);

    return { loading, data, fetchData, hasLoadedOnce };
};
