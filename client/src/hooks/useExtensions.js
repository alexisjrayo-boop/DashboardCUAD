import { useState, useEffect } from 'react';
import api from '../services/api';

export const useExtensions = () => {
    const [extensionsMap, setExtensionsMap] = useState({});

    useEffect(() => {
        const fetchExtensions = async () => {
            try {
                const response = await api.get('/config/extensions');
                if (response.data.success) {
                    setExtensionsMap(response.data.data);
                }
            } catch (error) {
                console.error("Failed to load extensions config:", error);
            }
        };
        fetchExtensions();
    }, []);

    return extensionsMap;
};
