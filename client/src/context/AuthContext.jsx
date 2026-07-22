import { createContext, useState, useEffect, useContext } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                // Verificar expiración
                if (decoded.exp * 1000 < Date.now()) {
                    localStorage.removeItem('token');
                    setUser(null);
                } else {
                    setUser(decoded);
                }
            } catch (error) {
                localStorage.removeItem('token');
                setUser(null);
            }
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            const response = await api.post('/auth/login', { username, password });
            const { token, user } = response.data;

            localStorage.setItem('token', token);
            setUser(user); // O decodificar el token si user no viene completo
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Error al iniciar sesión'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    const register = async (username, password, name, profile_picture) => {
        try {
            await api.post('/auth/register', { username, password, name, profile_picture });
            // Opcional: Auto login después del registro
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Error al registrarse'
            };
        }
    };

    const getUsers = async () => {
        try {
            const response = await api.get('/auth/users');
            return response.data;
        } catch (error) {
            return { success: false, error: error.response?.data?.error || 'Error al obtener usuarios' };
        }
    };

    const updateUser = async (id, userData) => {
        try {
            const response = await api.put(`/auth/users/${id}`, userData);

            // Si el usuario actualizado es el usuario logueado, actualizar el estado local
            if (response.data.success && user && id === user.id) {
                // Obtenemos los datos actualizados del body para el estado local
                setUser(prev => ({
                    ...prev,
                    ...userData
                }));
            }

            return response.data;
        } catch (error) {
            return { success: false, error: error.response?.data?.error || 'Error al actualizar usuario' };
        }
    };

    const deleteUser = async (id) => {
        try {
            const response = await api.delete(`/auth/users/${id}`);
            return response.data;
        } catch (error) {
            return { success: false, error: error.response?.data?.error || 'Error al eliminar usuario' };
        }
    };

    const value = {
        user,
        loading,
        login,
        logout,
        register,
        getUsers,
        updateUser,
        deleteUser,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
