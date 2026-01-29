import React from 'react';
import { useBranch } from '../../context/BranchContext';
import { useAppSelector } from '../../hooks/useAppDispatch';
import { MapPin, ChevronDown } from 'lucide-react';
import LOAApi from '../../api/LOAApi';

export const BranchSwitcher = () => {
    const { currentBranch, branches, setCurrentBranch, isLoading } = useBranch();
    const { role, uid } = useAppSelector((state: any) => state.auth);
    const [isOpen, setIsOpen] = React.useState(false);

    if (isLoading) return <div className="text-white text-xs">Cargando ubicación...</div>;

    if (!currentBranch) return null; // Should ideally always have one if logged in

    const handleSelect = async (branchId: string) => {
        const branch = branches.find(b => b.sucursal_id === branchId);
        if (branch) {
            try {
                // Persist change
                // Endpoint: /api/sucursales/user-branch (mapped from TenantsController.changeUserBranch)
                // Body: { usuario_id, nueva_sucursal_id }
                if (uid) {
                    await LOAApi.post('/api/tenants/user-branch', {
                        usuario_id: uid,
                        nueva_sucursal_id: branchId
                    });
                }
            } catch (e) {
                console.error("Failed to persist branch change", e);
            }

            setCurrentBranch(branch);
            setIsOpen(false);
            window.location.reload();
        }
    };

    // EMPLEADO / ADMIN / TALLER: Static View
    if (role !== 'SUPERADMIN') {
        return (
            <div className="flex items-center gap-2 text-white bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                <MapPin size={14} className="text-yellow-400" />
                <span className="text-sm font-medium">{currentBranch.nombre}</span>
            </div>
        );
    }

    // SUPERADMIN: Dropdown
    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-white bg-white/10 hover:bg-white/20 transition-colors px-3 py-1.5 rounded-full border border-white/20"
            >
                <MapPin size={14} className="text-cyan-400" />
                <span className="text-sm font-medium">{currentBranch.nombre}</span>
                <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl overflow-hidden z-50 animate-fade-in-down border border-slate-100 text-slate-800">
                        <div className="py-1">
                            {branches.map(branch => (
                                <button
                                    key={branch.sucursal_id}
                                    onClick={() => handleSelect(branch.sucursal_id!)}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 ${currentBranch.sucursal_id === branch.sucursal_id ? 'bg-cyan-50 text-cyan-700 font-semibold' : ''}`}
                                >
                                    {currentBranch.sucursal_id === branch.sucursal_id && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                                    )}
                                    {branch.nombre}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
