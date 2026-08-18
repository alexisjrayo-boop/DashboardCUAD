import { useState, useEffect, useRef } from 'react';
import { X, UserPlus, Shield, User, Lock, Loader2, Camera, Mail, Trash2, Edit2, ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const UserManagementModal = ({ isOpen, onClose }) => {
    const [view, setView] = useState('list'); // 'list' or 'form'
    const [editMode, setEditMode] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [profilePicture, setProfilePicture] = useState('');
    const [role, setRole] = useState('user');

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const fileInputRef = useRef(null);
    const { register, getUsers, updateUser, deleteUser, user: currentUser } = useAuth();

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
        setUsername('');
        setEmail('');
        setPassword('');
        setProfilePicture('');
        setRole('user');
        setEditMode(false);
        setSelectedUser(null);
        setMessage({ type: '', text: '' });
    };

    const handleEdit = (userToEdit) => {
        setSelectedUser(userToEdit);
        setName(userToEdit.name || '');
        setUsername(userToEdit.username);
        setEmail(userToEdit.email || '');
        setPassword(''); // Don't show old password
        setProfilePicture(userToEdit.profile_picture || '');
        setRole(userToEdit.role || 'user');
        setEditMode(true);
        setView('form');
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
                username,
                password: password || undefined, // Only send if changed
                name,
                profile_picture: profilePicture,
                role,
                email
            });
        } else {
            result = await register(username, password, name, profilePicture, email);
        }

        if (result.success) {
            setMessage({
                type: 'success',
                text: editMode ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente'
            });
            setTimeout(() => {
                setView('list');
                resetForm();
            }, 1500);
        } else {
            setMessage({ type: 'error', text: result.error });
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-300 relative flex flex-col max-h-[90vh]">
                {/* Accent Top Bar */}
                <div className="h-1.5 bg-nissan-red shrink-0"></div>

                {/* Header */}
                <div className="px-8 pt-6 pb-5 flex justify-between items-center bg-gray-50/50 shrink-0 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                        {view === 'form' && (
                            <button
                                onClick={() => { setView('list'); resetForm(); }}
                                className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-nissan-red transition-all border border-transparent hover:border-gray-100 shadow-sm"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                        )}
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-nissan-red/10 rounded-xl text-nissan-red">
                                    {view === 'list' ? <Shield className="h-5 w-5" /> : (editMode ? <Edit2 className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />)}
                                </div>
                                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">
                                    {view === 'list' ? 'Gestionar Usuarios' : (editMode ? 'Editar Usuario' : 'Nuevo Usuario')}
                                </h2>
                            </div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 ml-10">
                                {view === 'list' ? 'Lista de analistas autorizados' : 'Complete los datos del perfil'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white hover:shadow-md rounded-xl text-gray-400 hover:text-gray-600 transition-all border border-transparent hover:border-gray-100"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                    {view === 'list' ? (
                        <div className="p-8 space-y-4">
                            <button
                                onClick={() => { setView('form'); setEditMode(false); }}
                                style={{ backgroundColor: '#C3002F' }}
                                className="w-full py-4 text-white rounded-xl shadow-lg hover:brightness-110 active:brightness-90 transition-all font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 group mb-4"
                            >
                                <UserPlus className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                Añadir Nuevo Usuario
                            </button>

                            <div className="grid grid-cols-1 gap-3">
                                {loading && users.length === 0 ? (
                                    <div className="flex justify-center p-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-nissan-red" />
                                    </div>
                                ) : users.map(u => (
                                    <div key={u.id} className="group flex items-center justify-between p-4 bg-gray-50/50 hover:bg-white border border-gray-100 rounded-xl transition-all hover:shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm flex-shrink-0">
                                                {u.profile_picture ? (
                                                    <img src={u.profile_picture} alt={u.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center bg-gray-50 text-gray-400 font-black text-lg">
                                                        {(u.name || u.username)[0].toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">{u.name || u.username}</h3>
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{u.username}</span>
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase ${u.role === 'admin' ? 'bg-nissan-red text-white' : 'bg-gray-200 text-gray-600'}`}>{u.role}</span>
                                                    </div>
                                                    {u.email && (
                                                        <span className="text-[10px] text-gray-500 font-medium">{u.email}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleEdit(u)}
                                                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-lg transition-all shadow-sm"
                                                title="Editar"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(u.id)}
                                                className="p-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 hover:shadow-lg transition-all shadow-sm"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            {message.text && (
                                <div className={`p-4 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all animate-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                                    }`}>
                                    {message.type === 'success' ? <Check className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                                    {message.text}
                                </div>
                            )}

                            {/* Profile Picture Upload */}
                            <div className="flex justify-center mb-6">
                                <div className="relative group/avatar">
                                    <div className="h-28 w-28 rounded-2xl border-2 border-gray-100 bg-gray-50 overflow-hidden shadow-lg shadow-gray-200 group-hover/avatar:border-nissan-red/20 transition-all">
                                        {profilePicture ? (
                                            <img src={profilePicture} alt="Preview" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-gray-300">
                                                <User className="h-14 w-14" />
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute -bottom-1 -right-1 p-2 bg-nissan-red text-white rounded-lg shadow-lg hover:scale-110 active:scale-95 transition-all border-2 border-white"
                                    >
                                        <Camera className="h-4 w-4" />
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="image/png, image/jpeg"
                                        className="hidden"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-focus-within:text-nissan-red transition-colors" />
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Juan Pérez"
                                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-nissan-red/5 focus:border-nissan-red/30 transition-all text-sm font-semibold text-gray-700"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ID Usuario</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-focus-within:text-nissan-red transition-colors" />
                                        <input
                                            type="text"
                                            required
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="jperez"
                                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-nissan-red/5 focus:border-nissan-red/30 transition-all text-sm font-semibold text-gray-700"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-focus-within:text-nissan-red transition-colors" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="jperez@grupogasme.com"
                                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-nissan-red/5 focus:border-nissan-red/30 transition-all text-sm font-semibold text-gray-700"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Rol de Acceso</label>
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-nissan-red/5 focus:border-nissan-red/30 transition-all text-sm font-black uppercase text-gray-600 cursor-pointer"
                                    >
                                        <option value="user">Usuario (Estándar)</option>
                                        <option value="admin">Administrador (Total)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                        {editMode ? 'Nueva Contraseña (Opcional)' : 'Contraseña Inicial'}
                                    </label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-focus-within:text-nissan-red transition-colors" />
                                        <input
                                            type="password"
                                            required={!editMode}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-nissan-red/5 focus:border-nissan-red/30 transition-all text-sm font-semibold text-gray-700"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => { setView('list'); resetForm(); }}
                                    className="flex-1 px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-xl transition-all text-xs font-black uppercase tracking-[0.2em] active:scale-[0.98] border border-gray-200/50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{ backgroundColor: '#C3002F' }}
                                    className="flex-[2] px-8 py-4 text-white rounded-xl transition-all text-xs font-black uppercase tracking-[0.2em] shadow-lg hover:brightness-110 active:brightness-90 flex items-center justify-center gap-3"
                                >
                                    {loading ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <>
                                            {editMode ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                                            {editMode ? 'Actualizar Usuario' : 'Confirmar Creación'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Footer Info */}
                <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 text-center shrink-0">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">
                        &copy; {new Date().getFullYear()} &bull; GASME CUAD
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UserManagementModal;
