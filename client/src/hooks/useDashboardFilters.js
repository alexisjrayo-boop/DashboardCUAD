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

const getInitialFiltersFromUrl = () => {
    const { start, end } = getInitialDates();
    let initialStartDate = formatDateTime(start);
    let initialEndDate = formatDateTime(end);
    let initialCalltype = '2';
    let initialLine = '';
    let initialDestination = [];
    let initialDisposition = '';

    if (typeof window !== 'undefined' && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        if (params.get('startDate')) initialStartDate = params.get('startDate');
        if (params.get('endDate')) initialEndDate = params.get('endDate');
        if (params.get('calltype')) initialCalltype = params.get('calltype');
        if (params.get('line')) initialLine = params.get('line');
        if (params.get('disposition')) initialDisposition = params.get('disposition');
        if (params.get('destination')) {
            initialDestination = params.get('destination').split(',').map(s => s.trim()).filter(Boolean);
        }
    }

    return {
        startDate: initialStartDate,
        endDate: initialEndDate,
        destination: initialDestination,
        line: initialLine,
        locationDestination: '',
        disposition: initialDisposition,
        source: '',
        calltype: initialCalltype
    };
};

export const useDashboardFilters = () => {
    const [filters, setFilters] = useState(getInitialFiltersFromUrl);

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
