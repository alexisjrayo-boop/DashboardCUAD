import { useState, useCallback } from 'react';

const getInitialDates = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    // Explicitly set times to ensure consistency
    const start = new Date(firstDay);
    start.setHours(0, 0, 0, 0);

    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    return { start, end };
};

const formatDateTime = (d) => {
    const pad = (n) => n < 10 ? '0' + n : n;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const { start, end } = getInitialDates();

const INITIAL_FILTERS = {
    startDate: formatDateTime(start),
    endDate: formatDateTime(end),
    destination: [],
    line: '',
    locationDestination: '',
    disposition: '',
    source: '', // New filter for caller number
    calltype: '2' // Default Incoming
};

export const useDashboardFilters = () => {
    const [filters, setFilters] = useState(INITIAL_FILTERS);

    const updateFilters = useCallback((newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);

    const clearFilters = useCallback(() => {
        const { start, end } = getInitialDates();
        setFilters({
            ...INITIAL_FILTERS,
            startDate: formatDateTime(start),
            endDate: formatDateTime(end)
        });
    }, []);

    return { filters, updateFilters, clearFilters };
};
