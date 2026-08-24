import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, ShieldCheck, KeyRound, X, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import gasmeLogo from '../assets/gasme.PNG';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Modal Olvidé mi Contraseña
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotMessage, setForgotMessage] = useState({ type: '', text: '' });
    const [isClosingForgot, setIsClosingForgot] = useState(false);

    const { login, forgotPassword } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(email, password);
        if (result.success) {
            navigate('/');
        } else {
            setError(result.error);
        }
        setLoading(false);
    };

    const handleOpenForgot = () => {
        setForgotEmail(email); // Prellenar con lo que ya haya escrito
        setForgotMessage({ type: '', text: '' });
        setShowForgotModal(true);
    };

    const handleCloseForgot = () => {
        if (isClosingForgot) return;
        setIsClosingForgot(true);
        setTimeout(() => {
            setIsClosingForgot(false);
            setShowForgotModal(false);
        }, 270);
    };

    const handleSendForgot = async (e) => {
        e.preventDefault();
        setForgotMessage({ type: '', text: '' });

        if (!forgotEmail || !forgotEmail.includes('@')) {
            setForgotMessage({ type: 'error', text: 'Ingresa un correo electrónico válido' });
            return;
        }

        setForgotLoading(true);
        const result = await forgotPassword(forgotEmail);
        setForgotLoading(false);

        if (result.success) {
            setForgotMessage({
                type: 'success',
                text: 'Se ha enviado el enlace de restablecimiento. Revisa tu bandeja de entrada o spam.'
            });
            setTimeout(() => {
                handleCloseForgot();
            }, 3000);
        } else {
            setForgotMessage({
                type: 'error',
                text: result.error || 'Error al enviar el correo'
            });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden font-sans p-4">
            <Helmet>
                <title>Iniciar Sesión - GASME CUAD</title>
                <meta name="description" content="Acceda al Dashboard de Control de Llamadas de Grupo GASME." />
            </Helmet>

            {/* Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#C3002F]/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-md z-10">
                <div className="bg-white border border-gray-100 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.06)] p-8 sm:p-10 overflow-hidden relative">
                    {/* Top Accent Stripe */}
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
                            Control y Análisis de Llamadas
                        </p>
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-700 p-3.5 rounded-xl mb-6 text-xs font-semibold flex items-start gap-2.5 animate-shake">
                            <ShieldCheck className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">
                                Correo Electrónico
                            </label>
                            <div className="relative group">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#C3002F] h-4 w-4 transition-colors" />
                                <input
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C3002F] focus:bg-white focus:ring-4 focus:ring-[#C3002F]/10 transition-all text-xs font-semibold"
                                    placeholder="ejemplo@grupogasme.com"
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between ml-1">
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                    Contraseña
                                </label>
                                <button
                                    type="button"
                                    onClick={handleOpenForgot}
                                    className="text-[11px] font-bold text-[#C3002F] hover:text-[#8E0022] transition-colors cursor-pointer"
                                >
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#C3002F] h-4 w-4 transition-colors" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-10 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C3002F] focus:bg-white focus:ring-4 focus:ring-[#C3002F]/10 transition-all text-xs font-semibold"
                                    placeholder="••••••••"
                                    required
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

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#C3002F] hover:bg-[#A00027] active:bg-[#850020] text-white font-bold py-3.5 rounded-xl transition-all uppercase tracking-wider text-xs flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-red-900/10 active:scale-[0.98] cursor-pointer mt-6"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Verificando...
                                </>
                            ) : (
                                'Iniciar Sesión'
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {/* Modal: Olvidé mi Contraseña */}
            {showForgotModal && (
                <div
                    className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm ${
                        isClosingForgot ? 'animate-backdrop-out' : 'animate-backdrop'
                    }`}
                    onClick={handleCloseForgot}
                >
                    <div
                        className={`bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 p-6 ${
                            isClosingForgot ? 'animate-shrink-to-button' : 'animate-expand-from-button'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-red-50 text-[#C3002F] rounded-xl">
                                    <KeyRound className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 uppercase">Restablecer Contraseña</h3>
                                    <p className="text-[10px] text-gray-400 font-medium">Recuperación de acceso por correo</p>
                                </div>
                            </div>
                            <button
                                onClick={handleCloseForgot}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <p className="text-xs text-gray-600 mt-4 leading-relaxed">
                            ¿Estás seguro de que deseas restablecer tu contraseña? Te enviaremos un enlace seguro a tu correo para que definas una nueva.
                        </p>

                        {forgotMessage.text && (
                            <div
                                className={`mt-3 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                                    forgotMessage.type === 'success'
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                                        : 'bg-red-50 text-red-700 border border-red-100'
                                }`}
                            >
                                {forgotMessage.type === 'success' ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                ) : (
                                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                                )}
                                <span>{forgotMessage.text}</span>
                            </div>
                        )}

                        <form onSubmit={handleSendForgot} className="mt-4 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    Confirmar Correo Electrónico
                                </label>
                                <input
                                    type="email"
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    placeholder="tu-correo@grupogasme.com"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs text-gray-900 focus:outline-none focus:border-[#C3002F] focus:bg-white transition-all font-medium"
                                    required
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={handleCloseForgot}
                                    className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={forgotLoading}
                                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#C3002F] hover:bg-[#A00027] text-white text-xs font-bold transition-all shadow-md shadow-red-900/10 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    {forgotLoading ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        'Enviar Correo'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;
