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

    // Iniciar sesión por Correo Electrónico (o username)
    const login = async (emailOrUsername, password) => {
        try {
            const response = await api.post('/auth/login', { 
                email: emailOrUsername,
                username: emailOrUsername,
                password 
            });
            const { token, user: userData } = response.data;

            localStorage.setItem('token', token);
            setUser(userData);
            return { success: true, user: userData };
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

    // Dar de alta / Invitar usuario (solo requiere nombre, email, rol, recibir reportes)
    const inviteUser = async ({ name, email, role = 'user', receive_reports = false }) => {
        try {
            const response = await api.post('/auth/register', { 
                name, 
                email, 
                role, 
                receive_reports 
            });
            return { success: true, message: response.data?.message };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Error al invitar al usuario'
            };
        }
    };

    // Solicitar restablecimiento de contraseña
    const forgotPassword = async (email) => {
        try {
            const response = await api.post('/auth/forgot-password', { email });
            return { success: true, message: response.data?.message };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Error al solicitar el restablecimiento'
            };
        }
    };

    // Crear / Guardar nueva contraseña con Token y auto-login
    const setPassword = async (token, password) => {
        try {
            const response = await api.post('/auth/set-password', { token, password });
            const { token: sessionToken, user: userData, message } = response.data;

            if (sessionToken) {
                localStorage.setItem('token', sessionToken);
                setUser(userData);
            }
            return { success: true, message, user: userData };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Error al establecer la contraseña'
            };
        }
    };

    // Reenviar enlace de activación o restablecimiento (Admin)
    const resendResetLink = async (userId) => {
        try {
            const response = await api.post(`/auth/resend-reset/${userId}`);
            return { success: true, message: response.data?.message };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Error al reenviar el enlace'
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

            if (response.data.success && user && id === user.id) {
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
        register: inviteUser,
        inviteUser,
        forgotPassword,
        setPassword,
        resendResetLink,
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
