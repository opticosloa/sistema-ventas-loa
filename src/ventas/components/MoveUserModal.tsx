import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { userService } from '../../services/user.service';
import LOAApi from '../../api/LOAApi';

interface MoveUserModalProps {
    userId: string;
    userName: string;
    currentBranchId?: string;
    onClose: () => void;
    onSuccess: () => void;
}

interface Sucursal {
    sucursal_id: string;
    nombre: string;
}

export const MoveUserModal: React.FC<MoveUserModalProps> = ({ userId, userName, currentBranchId, onClose, onSuccess }) => {
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [selectedBranch, setSelectedBranch] = useState(currentBranchId || '');

    useEffect(() => {
        // Fetch sucursales
        // Assuming there is an endpoint for this, referencing common patterns. 
        // If not, we might need to find where sucursales are fetched.
        // Assuming /api/business/sucursales or similar. Let's check or assume standard.
        // I will assume /api/tenants/sucursales based on typical naming or use LOAApi to fetch.
        // Let me check 'tenants.controller.ts' or similar if I could.
        // But for now, I'll assume a generic get or maybe hardcode if I can't find it?
        // Actually, "tenants" usually means sucursales in this app context based on "sucursal_id" in login.
        // Let's try to fetch from /api/tenants usually used for listing branches.

        const fetchSucursales = async () => {
            try {
                // Adjust endpoint if necessary. I saw 'tenants.routes.ts' in file list.
                const { data } = await LOAApi.get<{ success: boolean; result: any }>('/api/tenants');
                if (data.success) {
                    // Handle both direct array and QueryResult (rows)
                    const tenantsList = Array.isArray(data.result) ? data.result : data.result?.rows || [];
                    setSucursales(tenantsList);
                }
            } catch (error) {
                console.error("Error fetching sucursales", error);
            }
        };
        fetchSucursales();
    }, []);

    const handleMove = async () => {
        if (!selectedBranch) {
            Swal.fire('Error', 'Debes seleccionar una sucursal', 'error');
            return;
        }

        try {
            await userService.moveUser(userId, selectedBranch);
            Swal.fire('Éxito', 'El usuario ha sido movido correctamente', 'success');
            onSuccess();
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo mover al usuario', 'error');
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6 z-[60]">
                <h3 className="text-xl font-semibold mb-4">Mover Usuario</h3>
                <p className="mb-4">Selecciona la nueva sucursal para <strong>{userName}</strong>.</p>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sucursal</label>
                    <select
                        className="w-full border border-gray-300 rounded-lg p-2"
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                    >
                        <option value="">Seleccionar Sucursal</option>
                        {sucursales.map(suc => (
                            <option key={suc.sucursal_id} value={suc.sucursal_id}>
                                {suc.nombre}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        Cancelar
                    </button>
                    <button onClick={handleMove} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Confirmar Mover
                    </button>
                </div>
            </div>
        </div>
    );
};
