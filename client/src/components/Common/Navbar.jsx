import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Settings, LogOut, ArrowLeft } from 'lucide-react';
import gasmeLogo from '../../assets/gasme.PNG';

const Navbar = ({
    user,
    logout,
    setShowUserModal,
    setShowConfigModal,
    showBackButton = false
}) => {
    const navigate = useNavigate();

    return (
        <header className="sticky top-0 z-50 bg-[#C3002F] text-white shadow-md shadow-black/10 transition-shadow">
            <div className="h-16 px-4 md:px-6 flex items-center justify-between max-w-full">
                {/* Left: Navigation Icon & Brand */}
                <div className="flex items-center gap-3 md:gap-4">
                    {showBackButton && (
                        <button
                            onClick={() => navigate(-1)}
                            className="h-10 w-10 flex items-center justify-center rounded-full text-white hover:bg-white/12 active:bg-white/24 transition-colors cursor-pointer"
                            title="Volver"
                            aria-label="Volver"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                    )}

                    {/* Brand Logo Emblem */}
                    <div className="h-9 w-9 rounded-full bg-white p-0.5 shadow-sm flex items-center justify-center shrink-0 select-none">
                        <img src={gasmeLogo} alt="GASME Logo" className="h-full w-full object-contain rounded-full" />
                    </div>

                    {/* App Title */}
                    <div className="flex items-center gap-2 select-none">
                        <span className="text-lg md:text-xl font-bold tracking-tight text-white">
                            GASME CUAD
                        </span>
                    </div>
                </div>

                {/* Right: User Info & Material Icon Buttons */}
                <div className="flex items-center gap-1 sm:gap-2">
                    {/* User Info (Desktop) */}
                    <div className="hidden sm:flex items-center gap-2 mr-2">
                        <span className="text-xs font-semibold text-white/95">
                            {user?.name || user?.username || 'Usuario'}
                        </span>
                        <span className="text-[11px] font-medium bg-black/15 text-white/90 px-2.5 py-0.5 rounded-full border border-white/20">
                            {user?.role === 'admin' ? 'Administrador' : 'Usuario'}
                        </span>
                    </div>

                    {/* Avatar */}
                    <div className="h-9 w-9 rounded-full bg-white/20 ring-2 ring-white/30 overflow-hidden flex items-center justify-center text-white font-bold text-sm shrink-0 mr-1 select-none">
                        {user?.profile_picture ? (
                            <img src={user.profile_picture} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                            <span>{(user?.name || user?.username || '?')[0].toUpperCase()}</span>
                        )}
                    </div>

                    {/* Material Icon Action Buttons */}
                    {user?.role === 'admin' && setShowUserModal && (
                        <button
                            onClick={() => setShowUserModal(true)}
                            className="h-10 w-10 flex items-center justify-center rounded-full text-white hover:bg-white/12 active:bg-white/24 transition-colors cursor-pointer"
                            title="Gestionar Usuarios"
                            aria-label="Gestionar Usuarios"
                        >
                            <UserPlus className="h-5 w-5" />
                        </button>
                    )}

                    {setShowConfigModal && (
                        <button
                            onClick={() => setShowConfigModal(true)}
                            className="h-10 w-10 flex items-center justify-center rounded-full text-white hover:bg-white/12 active:bg-white/24 transition-colors cursor-pointer"
                            title="Configuración"
                            aria-label="Configuración"
                        >
                            <Settings className="h-5 w-5" />
                        </button>
                    )}

                    <button
                        onClick={logout}
                        className="h-10 w-10 flex items-center justify-center rounded-full text-white hover:bg-white/12 active:bg-white/24 transition-colors cursor-pointer"
                        title="Cerrar Sesión"
                        aria-label="Cerrar Sesión"
                    >
                        <LogOut className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
