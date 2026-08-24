import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../context/AuthContext';
import gasmeLogo from '../assets/gasme.PNG';

const SetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const { setPassword } = useAuth();

    const [password, setPasswordState] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setError('No se proporcionó un token de activación válido. Por favor solicita un nuevo enlace.');
        }
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!token) {
            setError('El enlace no contiene un token válido.');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden. Por favor verifícalas.');
            return;
        }

        setLoading(true);
        const result = await setPassword(token, password);

        if (result.success) {
            setSuccessMessage('¡Contraseña establecida con éxito! Iniciando sesión...');
            setTimeout(() => {
                navigate('/', { replace: true });
            }, 1200);
        } else {
            setError(result.error);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden font-sans p-4">
            <Helmet>
                <title>Crear Contraseña - GASME CUAD</title>
                <meta name="description" content="Configura tu contraseña de acceso a GASME CUAD." />
            </Helmet>

            {/* Background Glow Accents */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#C3002F]/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-md z-10">
                <div className="bg-white border border-gray-100 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.06)] p-8 sm:p-10 overflow-hidden relative">
                    {/* Brand Top Stripe */}
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-[#C3002F]" />

                    {/* Logo & Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex p-3 rounded-full bg-white mb-4 border border-gray-100 shadow-md">
                            <img src={gasmeLogo} alt="GASME Logo" className="h-12 w-auto object-contain" />
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase mb-1">
                            GASME <span className="text-[#C3002F]">CUAD</span>
                        </h1>
                        <p className="text-gray-500 text-xs font-bold tracking-wider uppercase">
                            Configuración de Contraseña
                        </p>
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-700 p-3.5 rounded-xl mb-6 text-xs font-semibold flex items-start gap-2.5 animate-shake">
                            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Success Banner */}
                    {successMessage && (
                        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-3.5 rounded-xl mb-6 text-xs font-semibold flex items-center gap-2.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* New Password */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">
                                Nueva Contraseña
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#C3002F] h-4 w-4 transition-colors" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPasswordState(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-10 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C3002F] focus:bg-white focus:ring-4 focus:ring-[#C3002F]/10 transition-all text-xs font-semibold"
                                    placeholder="Mínimo 6 caracteres"
                                    required
                                    disabled={loading || !token}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">
                                Confirmar Contraseña
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#C3002F] h-4 w-4 transition-colors" />
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-10 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C3002F] focus:bg-white focus:ring-4 focus:ring-[#C3002F]/10 transition-all text-xs font-semibold"
                                    placeholder="Repite la contraseña"
                                    required
                                    disabled={loading || !token}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                >
                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || !token}
                            className="w-full bg-[#C3002F] hover:bg-[#A00027] active:bg-[#850020] text-white font-bold py-3.5 rounded-xl transition-all uppercase tracking-wider text-xs flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-red-900/10 active:scale-[0.98] cursor-pointer mt-6"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Guardando Contraseña...
                                </>
                            ) : (
                                <>
                                    Guardar e Iniciar Sesión
                                    <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer link to login */}
                    <div className="mt-8 text-center pt-5 border-t border-gray-100">
                        <Link
                            to="/login"
                            className="text-xs font-bold text-gray-500 hover:text-[#C3002F] transition-colors uppercase tracking-wider inline-flex items-center gap-1"
                        >
                            Volver al Inicio de Sesión
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SetPassword;
