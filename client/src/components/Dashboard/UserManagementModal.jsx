import { useState, useEffect, useRef } from 'react';
import { 
    X, UserPlus, Shield, User, Loader2, Camera, Mail, Trash2, Edit2, 
    ArrowLeft, Check, Send, CheckCircle2, AlertCircle, FileText 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const UserManagementModal = ({ isOpen, onClose }) => {
    const [view, setView] = useState('list'); // 'list' or 'form'
    const [editMode, setEditMode] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        if (isClosing) return;
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 270);
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                handleClose();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isClosing]);

    // Form fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('user');
    const [receiveReports, setReceiveReports] = useState(false);
    const [profilePicture, setProfilePicture] = useState('');

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [resendingId, setResendingId] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });

    const fileInputRef = useRef(null);
    const { inviteUser, getUsers, updateUser, deleteUser, resendResetLink, user: currentUser } = useAuth();

    useEffect(() => {
        if (isOpen && view === 'list') {
            loadUsers();
        }
    }, [isOpen, view]);

    const loadUsers = async () => {
        setLoading(true);
        const result = await getUsers();
        if (result.success) {
            setUsers(result.users);
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                setMessage({ type: 'error', text: 'La imagen es demasiado grande (máx 2MB)' });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePicture(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const resetForm = () => {
        setName('');
        setEmail('');
        setRole('user');
        setReceiveReports(false);
        setProfilePicture('');
        setEditMode(false);
        setSelectedUser(null);
        setMessage({ type: '', text: '' });
    };

    const handleEdit = (userToEdit) => {
        setSelectedUser(userToEdit);
        setName(userToEdit.name || '');
        setEmail(userToEdit.email || '');
        setRole(userToEdit.role || 'user');
        setReceiveReports(userToEdit.receive_reports === 1 || !!userToEdit.receive_reports);
        setProfilePicture(userToEdit.profile_picture || '');
        setEditMode(true);
        setView('form');
    };

    const handleResend = async (userItem) => {
        setResendingId(userItem.id);
        const result = await resendResetLink(userItem.id);
        setResendingId(null);

        if (result.success) {
            setMessage({
                type: 'success',
                text: `Se ha enviado el enlace al correo ${userItem.email}`
            });
            setTimeout(() => setMessage({ type: '', text: '' }), 4000);
        } else {
            setMessage({
                type: 'error',
                text: result.error || 'Error al reenviar el enlace'
            });
        }
    };

    const handleDelete = async (userId) => {
        if (userId === currentUser.id) {
            alert('No puedes eliminarte a ti mismo.');
            return;
        }
        if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
            setLoading(true);
            const result = await deleteUser(userId);
            if (result.success) {
                loadUsers();
            } else {
                alert(result.error);
            }
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        let result;
        if (editMode) {
            result = await updateUser(selectedUser.id, {
                name,
                email,
                role,
                receive_reports: receiveReports,
                profile_picture: profilePicture
            });
        } else {
            result = await inviteUser({
                name,
                email,
                role,
                receive_reports: receiveReports
            });
        }

        if (result.success) {
            setMessage({
                type: 'success',
                text: editMode ? 'Usuario actualizado exitosamente' : result.message || 'Usuario invitado exitosamente'
            });
            setTimeout(() => {
                setView('list');
                resetForm();
                loadUsers();
            }, 1800);
        } else {
            setMessage({ type: 'error', text: result.error });
        }
        setLoading(false);
    };

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm ${
                isClosing ? 'animate-backdrop-out' : 'animate-backdrop'
            }`}
            onClick={handleClose}
        >
            <div
                className={`bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-gray-100 relative flex flex-col max-h-[90vh] ${
                    isClosing ? 'animate-shrink-to-button' : 'animate-expand-from-button'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Top Accent Stripe */}
                <div className="h-1.5 bg-[#C3002F] shrink-0" />

                {/* Header */}
                <div className="px-6 py-4 flex justify-between items-center bg-gray-50/70 shrink-0 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        {view === 'form' && (
                            <button
                                onClick={() => { setView('list'); resetForm(); }}
                                className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-[#C3002F] transition-all border border-transparent hover:border-gray-200 shadow-sm cursor-pointer"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </button>
                        )}
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#C3002F]/10 rounded-xl text-[#C3002F]">
                                {view === 'list' ? <Shield className="h-5 w-5" /> : (editMode ? <Edit2 className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />)}
                            </div>
                            <div>
                                <h2 className="text-base font-black text-gray-900 uppercase tracking-tight">
                                    {view === 'list' ? 'Gestión de Usuarios' : (editMode ? 'Editar Usuario' : 'Nuevo Usuario')}
                                </h2>
                                {view !== 'list' && (
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        {editMode ? 'Modificar datos de usuario' : 'Alta por invitación de correo'}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1.5 hover:bg-white hover:shadow-md rounded-xl text-gray-400 hover:text-gray-600 transition-all border border-transparent hover:border-gray-200 cursor-pointer"
                        title="Cerrar ventana"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Message Alert in List View */}
                {view === 'list' && message.text && (
                    <div className={`mx-6 mt-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                        message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                    }`}>
                        {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> : <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />}
                        <span>{message.text}</span>
                    </div>
                )}

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                    {view === 'list' ? (
                        <div className="p-6 space-y-4">
                            <button
                                onClick={() => { setView('form'); setEditMode(false); }}
                                className="w-full py-3 bg-[#C3002F] hover:bg-[#A00027] text-white rounded-xl shadow-md hover:shadow-lg transition-all font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <UserPlus className="h-4 w-4" />
                                Dar de Alta Usuario
                            </button>

                            <div className="space-y-2.5">
                                {loading && users.length === 0 ? (
                                    <div className="flex justify-center p-8">
                                        <Loader2 className="h-7 w-7 animate-spin text-[#C3002F]" />
                                    </div>
                                ) : users.map(u => (
                                    <div
                                        key={u.id}
                                        className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-gray-50/50 hover:bg-white border border-gray-100 rounded-xl transition-all hover:shadow-sm gap-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm flex-shrink-0 flex items-center justify-center text-gray-500 font-bold text-sm">
                                                {u.profile_picture ? (
                                                    <img src={u.profile_picture} alt={u.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    (u.name || u.email || 'U')[0].toUpperCase()
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-xs font-bold text-gray-900 uppercase">{u.name || 'Sin Nombre'}</h3>
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                                                        u.role === 'admin' ? 'bg-[#C3002F] text-white' : 'bg-gray-200 text-gray-700'
                                                    }`}>
                                                        {u.role === 'admin' ? 'Admin' : 'Usuario'}
                                                    </span>
                                                    {u.receive_reports ? (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase bg-blue-100 text-blue-700">
                                                            Reportes
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[11px] text-gray-500 font-medium">{u.email || u.username}</span>
                                                    <span className={`text-[9px] font-semibold ${u.is_active ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                        • {u.is_active ? 'Activo' : 'Pendiente Activación'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                                            {/* Resend Setup / Reset Email Button */}
                                            {u.email && (
                                                <button
                                                    onClick={() => handleResend(u)}
                                                    disabled={resendingId === u.id}
                                                    className="p-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors border border-purple-100 cursor-pointer disabled:opacity-50"
                                                    title="Reenviar correo de activación / restablecimiento"
                                                >
                                                    {resendingId === u.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Send className="h-3.5 w-3.5" />
                                                    )}
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleEdit(u)}
                                                className="p-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100 cursor-pointer"
                                                title="Editar Usuario"
                                            >
                                                <Edit2 className="h-3.5 w-3.5" />
                                            </button>

                                            {u.id !== currentUser?.id && u.username !== 'admin' && (
                                                <button
                                                    onClick={() => handleDelete(u.id)}
                                                    className="p-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg transition-colors border border-rose-100 cursor-pointer"
                                                    title="Eliminar Usuario"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {message.text && (
                                <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                                    message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                                }`}>
                                    {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> : <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />}
                                    <span>{message.text}</span>
                                </div>
                            )}

                            {/* Informative Note for New User */}
                            {!editMode && (
                                <div className="bg-amber-50/80 border border-amber-200/60 p-3.5 rounded-xl text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
                                    <Mail className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                    <span>
                                        Al dar de alta al usuario, el sistema enviará un correo automático a la dirección especificada con un enlace seguro para que el usuario <strong>configure su contraseña e inicie sesión</strong>.
                                    </span>
                                </div>
                            )}

                            {/* Inputs Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">
                                        Nombre Completo
                                    </label>
                                    <div className="relative group">
                                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#C3002F]" />
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Ej. Juan Pérez"
                                            className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#C3002F] text-xs font-semibold text-gray-800 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">
                                        Correo Electrónico
                                    </label>
                                    <div className="relative group">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#C3002F]" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="jperez@grupogasme.com"
                                            className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#C3002F] text-xs font-semibold text-gray-800 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Role and Reports Toggle */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">
                                        Rol en el Sistema
                                    </label>
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#C3002F] text-xs font-bold text-gray-700 cursor-pointer"
                                    >
                                        <option value="user">Usuario (Consulta y Reportes)</option>
                                        <option value="admin">Administrador (Total)</option>
                                    </select>
                                </div>

                                <div className="flex flex-col justify-end">
                                    <label className="flex items-center gap-3 p-2.5 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100/70 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={receiveReports}
                                            onChange={(e) => setReceiveReports(e.target.checked)}
                                            className="h-4 w-4 text-[#C3002F] rounded border-gray-300 focus:ring-[#C3002F] cursor-pointer"
                                        />
                                        <span className="text-xs font-semibold text-gray-700 select-none">
                                            Recibir reportes automáticos por correo
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="pt-3 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setView('list'); resetForm(); }}
                                    className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-[2] py-2.5 px-4 bg-[#C3002F] hover:bg-[#A00027] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-red-900/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            {editMode ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                                            {editMode ? 'Guardar Cambios' : 'Enviar Invitación por Correo'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-center shrink-0">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                        &copy; {new Date().getFullYear()} &bull; Grupo GASME
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UserManagementModal;
