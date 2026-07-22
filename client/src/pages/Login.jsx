import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Loader2, ShieldCheck } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import gasmeLogo from '../assets/gasme.PNG';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(username, password);
        if (result.success) {
            navigate('/');
        } else {
            setError(result.error);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden font-sans">
            <Helmet>
                <title>Iniciar Sesión - GASME CUAD</title>
                <meta name="description" content="Acceda al Dashboard de Control de Llamadas." />
            </Helmet>

            {/* Subtle Light Decor */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-nissan-red/5 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full"></div>

            <div className="w-full max-w-md z-10 p-4">
                <div className="bg-white border border-gray-100 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-10 overflow-hidden relative">
                    {/* Brand Stripe */}
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-nissan-red"></div>

                    <div className="text-center mb-10">
                        <div className="inline-flex p-4 rounded-3xl bg-gray-50 mb-6 border border-gray-100 shadow-sm">
                            <img src={gasmeLogo} alt="GASME Logo" className="h-16 w-auto" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase mb-2">
                            GASME <span className="text-nissan-red">CUAD</span>
                        </h1>
                        <p className="text-gray-500 text-xs font-bold tracking-widest uppercase opacity-80">
                            Dashboard de análisis de llamadas
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl mb-6 text-sm flex items-center gap-3 animate-shake">
                            <ShieldCheck className="h-5 w-5 flex-shrink-0" />
                            <span className="font-medium">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Usuario</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-300 group-focus-within:text-nissan-red h-5 w-5 transition-colors" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-nissan-red focus:bg-white focus:ring-4 focus:ring-nissan-red/5 transition-all text-sm font-semibold"
                                    placeholder="ID de usuario"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Contraseña</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-300 group-focus-within:text-nissan-red h-5 w-5 transition-colors" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-nissan-red focus:bg-white focus:ring-4 focus:ring-nissan-red/5 transition-all text-sm font-semibold"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#C3002F] hover:bg-[#A00027] text-white font-bold py-4 rounded-xl transition-all uppercase tracking-[0.2em] text-sm flex items-center justify-center disabled:opacity-50 shadow-lg shadow-red-900/10 active:scale-[0.98] mt-4"
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                'Iniciar Sesión'
                            )}
                        </button>
                    </form>

                    <div className="mt-12 pt-6 border-t border-gray-50 text-center">
                        <p className="text-gray-400 text-[10px] uppercase font-bold tracking-[0.15em]">
                            DEPARTAMENTO DE SISTEMAS &copy; {new Date().getFullYear()}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
