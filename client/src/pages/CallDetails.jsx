import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, LogOut, Settings, UserPlus } from 'lucide-react';
import { parseCalldate } from '../utils/dateUtils';
import UserManagementModal from '../components/Dashboard/UserManagementModal';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import gasmeLogo from '../assets/gasme.PNG';

import { Helmet } from 'react-helmet-async';

// Helper for translations
const translateDisposition = (disp) => {
    const map = {
        'ANSWERED': 'CONTESTADA',
        'NO ANSWER': 'NO CONTESTADA',
        'BUSY': 'OCUPADO',
        'FAILED': 'FALLIDO',
        'VOICEMAIL': 'BUZÓN'
    };
    return map[disp] || disp;
};

const translateApp = (app) => {
    const map = {
        'Dial': 'Llamada',
        'BackGround': 'IVR/Fondo',
        'Queue': 'Cola',
        'Hangup': 'Colgar',
        'Voicemail': 'Buzón',
        'AppDial': 'App'
    };
    return map[app] || app;
};

const CallDetails = () => {

    const location = useLocation();
    const navigate = useNavigate();

    // Data passed from Dashboard
    const { title, data } = location.state || { title: 'Registros', data: [] };
    const [searchTerm, setSearchTerm] = useState('');
    const [searchField, setSearchField] = useState('all'); // 'all', 'source', 'destination', 'disposition', 'id'
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [showUserModal, setShowUserModal] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, searchField, itemsPerPage]);

    const filteredData = useMemo(() => {
        let rows = data;

        // 1. Filtering
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            rows = rows.filter(row => {
                const dispositionEs = translateDisposition(row.disposition || '').toLowerCase();
                // Optional: match LastApp in Spanish too if desired, though not explicitly requested, good for consistency
                // const lastAppEs = translateApp(row.lastapp || '').toLowerCase();

                if (searchField === 'all') {
                    return (
                        (row.src && row.src.toLowerCase().includes(lower)) ||
                        (row.destination && row.destination.toLowerCase().includes(lower)) ||
                        (dispositionEs && dispositionEs.includes(lower)) || // Search in Translated Disposition
                        (row.source && row.source.toLowerCase().includes(lower)) ||
                        (row.id && String(row.id).toLowerCase().includes(lower)) ||
                        (row.cdr_id && String(row.cdr_id).toLowerCase().includes(lower))
                    );
                } else if (searchField === 'source') {
                    return (row.source && row.source.toLowerCase().includes(lower));
                } else if (searchField === 'src') {
                    return (row.src && row.src.toLowerCase().includes(lower));
                } else if (searchField === 'destination') {
                    return (row.destination && row.destination.toLowerCase().includes(lower));
                } else if (searchField === 'dst') {
                    return (row.dst && row.dst.toLowerCase().includes(lower));
                } else if (searchField === 'disposition') {
                    return (dispositionEs && dispositionEs.includes(lower)); // Search in Translated Disposition
                } else if (searchField === 'id') {
                    return (String(row.id || row.cdr_id).toLowerCase().includes(lower));
                }
                return true;
            });
        }

        // 2. Sorting
        if (sortConfig.key) {
            rows = [...rows].sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Handle null/undefined
                if (aValue === null || aValue === undefined) aValue = '';
                if (bValue === null || bValue === undefined) bValue = '';

                // Handle Date Column
                if (sortConfig.key === 'calldate') {
                    aValue = parseCalldate(aValue).getTime();
                    bValue = parseCalldate(bValue).getTime();
                }

                // Handle Numeric Columns
                if (sortConfig.key === 'billsec' || sortConfig.key === 'id') {
                    aValue = Number(aValue);
                    bValue = Number(bValue);
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return rows;
    }, [data, searchTerm, searchField, sortConfig]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredData.slice(start, start + itemsPerPage);
    }, [filteredData, currentPage, itemsPerPage]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <ArrowUpDown className="h-4 w-4 ml-1 text-gray-300" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp className="h-4 w-4 ml-1 text-nissan-red" />
            : <ArrowDown className="h-4 w-4 ml-1 text-nissan-red" />;
    };

    const { logout, user } = useAuth();

    const handleDownload = () => {
        const ws = XLSX.utils.json_to_sheet(filteredData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Registros");
        XLSX.writeFile(wb, `CallDetails_${title.replace(/\s+/g, '_')}.xlsx`);
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] font-sans text-gray-900 page-transition">
            <Helmet>
                <title>{title} - Detalles - GASME CUAD</title>
                <meta name="description" content={`Detalles de ${filteredData.length} registros para ${title}.`} />
            </Helmet>

            {/* Navbar */}
            <nav className="bg-[#C3002F] px-6 py-2 flex justify-between items-center sticky top-0 z-50 shadow-lg border-b border-white/10">
                <div className="flex items-center gap-4">
                    <div className="p-1.5 bg-white rounded-xl shadow-sm">
                        <img src={gasmeLogo} alt="GASME Logo" className="h-7 w-auto" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tighter uppercase leading-none text-white">
                            GASME <span className="text-white">CUAD</span>
                        </h1>
                        <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest mt-0.5">Control de Análisis</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex flex-col items-end mr-1">
                        <span className="text-[11px] font-black text-white uppercase tracking-tight leading-none">
                            {user?.name || user?.username}
                        </span>
                        <span className="text-[8px] font-bold text-white/60 uppercase tracking-widest mt-1">Sistemas</span>
                    </div>

                    <div className="h-9 w-9 rounded-xl border border-white/20 overflow-hidden bg-white/10 flex-shrink-0 shadow-inner group-hover:border-white/40 transition-colors">
                        {user?.profile_picture ? (
                            <img src={user.profile_picture} alt="Profile" className="h-full w-full object-cover" />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center bg-white/10 text-white font-black text-sm">
                                {(user?.name || user?.username || '?')[0].toUpperCase()}
                            </div>
                        )}
                    </div>
                    {user?.role === 'admin' && (
                        <button
                            onClick={() => setShowUserModal(true)}
                            className="p-2 bg-transparent hover:bg-black/20 text-white rounded-lg border border-white/20 transition-all group"
                            title="Gestionar Usuarios"
                        >
                            <UserPlus className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        </button>
                    )}

                    <button
                        onClick={logout}
                        className="p-2 bg-transparent hover:bg-black/20 text-white rounded-lg border border-white/20 transition-all group"
                        title="Cerrar Sesión"
                    >
                        <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            </nav>

            <main className="p-6 max-w-[1600px] mx-auto space-y-6">
                {/* Main Content Card - Identical to Heatmap Matrix */}
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-500 overflow-hidden">

                    {/* Header Section */}
                    <div className="border-b border-gray-50 pb-4 mb-6 flex flex-col xl:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4 w-full xl:w-auto">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2.5 bg-white border border-gray-200 hover:border-nissan-red text-gray-400 hover:text-nissan-red rounded-lg transition-all shadow-sm group"
                                title="Volver al Dashboard"
                            >
                                <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                            </button>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-6 bg-[#C3002F] rounded-full"></span>
                                    <h1 className="text-sm font-bold text-gray-700 uppercase tracking-wider">{title}</h1>
                                </div>
                                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mt-0.5 ml-4">{filteredData.length} registros filtrados</p>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
                            {/* Search Controls Backdrop */}
                            <div className="flex flex-col md:flex-row items-center gap-2 p-1 bg-gray-50 rounded-lg border border-gray-100 w-full">
                                <select
                                    value={searchField}
                                    onChange={(e) => setSearchField(e.target.value)}
                                    className="w-full md:w-auto min-w-[130px] px-3 py-2 bg-white border border-gray-200 rounded-md focus:ring-2 focus:ring-nissan-red/20 outline-none text-xs font-bold uppercase text-gray-600 cursor-pointer transition-all hover:border-gray-300"
                                >
                                    <option value="all">Todo</option>
                                    <option value="id">ID</option>
                                    <option value="source">Origen (CID)</option>
                                    <option value="src">Origen (Ext)</option>
                                    <option value="destination">Destino (Nombre)</option>
                                    <option value="dst">Destino (Ext)</option>
                                    <option value="disposition">Estado</option>
                                </select>

                                <div className="relative flex-1 min-w-[200px] w-full group">
                                    <input
                                        type="text"
                                        placeholder={searchField === 'all' ? "Buscar registros..." : `Filtrar por ${searchField}...`}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-md focus:ring-2 focus:ring-nissan-red/20 focus:border-nissan-red/30 outline-none text-xs font-semibold text-gray-700 placeholder-gray-400 transition-all"
                                    />
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 group-focus-within:text-nissan-red transition-colors" />
                                </div>
                            </div>

                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 px-5 py-2.5 bg-[#107C41] hover:bg-[#0E6C38] text-white rounded-lg transition-all text-xs font-bold uppercase tracking-wider shadow-sm active:scale-[0.98] w-full md:w-auto mt-2 md:mt-0"
                            >
                                <Download className="h-4 w-4" />
                                Exportar EXCEL
                            </button>
                        </div>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                        <table className="w-full border-collapse table-fixed min-w-[1400px]">
                            <colgroup>
                                <col className="w-[100px]" />
                                <col className="w-[120px]" />
                                <col className="w-[120px]" />
                                <col className="w-[140px]" />
                                <col className="w-[120px]" />
                                <col className="w-[120px]" />
                                <col className="w-[180px]" />
                                <col className="w-[120px]" />
                                <col className="w-[150px]" />
                                <col className="w-[120px]" />
                            </colgroup>
                            <thead>
                                <tr className="bg-gray-50/50">
                                    {[
                                        { id: 'id', label: 'ID' },
                                        { id: 'calldate', label: 'Fecha' },
                                        { id: 'calldate', label: 'Hora' },
                                        { id: 'source', label: 'Origen (CID)' },
                                        { id: 'src', label: 'Origen (Ext)' },
                                        { id: 'dst', label: 'Destino (Ext)' },
                                        { id: 'destination', label: 'Destino' },
                                        { id: 'lastapp', label: 'Acción' },
                                        { id: 'disposition', label: 'Estado' },
                                        { id: 'billsec', label: 'Duración' }
                                    ].map((col, i) => (
                                        <th
                                            key={`${col.id}-${i}`}
                                            className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 cursor-pointer hover:text-nissan-red transition-colors text-left border-b border-gray-100"
                                            onClick={() => requestSort(col.id)}
                                        >
                                            <div className="flex items-center gap-1.5 underline-offset-4 hover:underline">
                                                {col.label} {getSortIcon(col.id)}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {paginatedData.length > 0 ? (
                                    paginatedData.map((row, index) => (
                                        <tr key={index} className="hover:bg-gray-50/80 transition-all duration-200 group h-20">
                                            <td className="px-6 py-4 font-mono text-[10px] text-gray-400 font-bold truncate">#{row.id || row.cdr_id}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-[11px] font-bold text-gray-700">{parseCalldate(row.calldate).toLocaleDateString()}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-[10px] font-medium text-gray-400 uppercase tracking-tighter">{parseCalldate(row.calldate).toLocaleTimeString()}</div>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-semibold text-gray-500 truncate">{row.source}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-1 bg-gray-100 text-gray-900 rounded-lg text-xs font-black ring-1 ring-inset ring-gray-200">
                                                    {row.src}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-semibold text-gray-500 truncate">{row.dst}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs font-black text-nissan-red uppercase tracking-tight truncate" title={row.destination}>{row.destination}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[10px] font-black uppercase text-gray-600 bg-gray-100/50 px-2 py-1 rounded-md truncate block text-center italic">{translateApp(row.lastapp)}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center justify-center min-w-[110px] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl border shadow-sm transition-all ${row.disposition === 'ANSWERED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:shadow-emerald-100' :
                                                    row.disposition === 'NO ANSWER' ? 'bg-rose-50 text-rose-600 border-rose-100 group-hover:shadow-rose-100' :
                                                        'bg-amber-50 text-amber-600 border-amber-100 group-hover:shadow-amber-100'
                                                    }`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full mr-2 ${row.disposition === 'ANSWERED' ? 'bg-emerald-500' :
                                                        row.disposition === 'NO ANSWER' ? 'bg-rose-500' : 'bg-amber-500'
                                                        }`}></div>
                                                    {translateDisposition(row.disposition)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs font-black text-gray-900 font-mono italic">{row.billsec}<span className="text-[10px] font-bold text-gray-400 ml-0.5">s</span></div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="10" className="px-6 py-24 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <Search className="h-10 w-10 text-gray-100" />
                                                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No se encontraron registros en esta búsqueda</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className="p-6 bg-gray-50/80 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4 group">
                            <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-gray-200 shadow-sm transition-all hover:border-nissan-red/20">
                                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Mostrar</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                    className="bg-transparent text-xs font-black text-gray-900 outline-none cursor-pointer"
                                >
                                    {[10, 20, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] hidden sm:block">Registros por página</span>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="text-center">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Página </span>
                                <span className="text-sm font-black text-nissan-red px-2">{currentPage}</span>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">de {totalPages || 1}</span>
                            </div>

                            <div className="flex items-center gap-2 p-1.5 bg-white border border-gray-200 rounded-2xl shadow-sm">
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    className="p-2.5 rounded-xl hover:bg-gray-100 disabled:opacity-30 transition-all text-gray-500"
                                >
                                    <ChevronsLeft className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-2.5 rounded-xl hover:bg-gray-100 disabled:opacity-30 transition-all text-gray-500"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>

                                <div className="w-10 h-1 bg-gray-100 rounded-full mx-1">
                                    <div
                                        className="h-full bg-nissan-red rounded-full transition-all duration-500"
                                        style={{ width: `${(currentPage / (totalPages || 1)) * 100}%` }}
                                    ></div>
                                </div>

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="p-2.5 rounded-xl hover:bg-gray-100 disabled:opacity-30 transition-all text-gray-500"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="p-2.5 rounded-xl hover:bg-gray-100 disabled:opacity-30 transition-all text-gray-500"
                                >
                                    <ChevronsRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Visual Footer */}
                <div className="flex justify-center pb-8 opacity-40">
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-400">
                        Departamento de Sistemas &copy; {new Date().getFullYear()} &bull; GASME CUAD
                    </p>
                </div>
                {/* User Management Modal */}
                <UserManagementModal
                    isOpen={showUserModal}
                    onClose={() => setShowUserModal(false)}
                />
            </main>
        </div>
    );
};

export default CallDetails;
