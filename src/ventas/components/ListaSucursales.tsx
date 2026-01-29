import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Store, Edit } from 'lucide-react';
import LOAApi from '../../api/LOAApi';
import { type Sucursal } from '../../types/Sucursal';
import { FormularioSucursal } from '../../forms/FormularioSucursal';

export const ListaSucursales: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Sucursal | null>(null);

    const { data: sucursales = [], refetch, isLoading } = useQuery({
        queryKey: ['sucursales'],
        queryFn: async () => {
            const { data } = await LOAApi.get<{ result: { rows: Sucursal[] } }>('/api/tenants');
            return data.result.rows || [];
        }
    });

    const handleNew = () => {
        setEditingBranch(null);
        setIsModalOpen(true);
    };

    const handleEdit = (sucursal: Sucursal) => {
        setEditingBranch(sucursal);
        setIsModalOpen(true);
    };

    const handleSuccess = () => {
        refetch();
    };

    return (
        <div className="min-h-screen bg-slate-900 p-6 fade-in">
            <div className="max-w-6xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Store className="text-cyan-400" size={32} />
                            Gestión de Sucursales
                        </h1>
                        <p className="text-slate-400 mt-2">Administra las sucursales y sus configuraciones de pago.</p>
                    </div>
                    <button
                        onClick={handleNew}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg"
                    >
                        <Plus size={20} />
                        Nueva Sucursal
                    </button>
                </header>

                {isLoading ? (
                    <div className="text-white text-center py-10">Cargando sucursales...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sucursales.map(sucursal => (
                            <div key={sucursal.sucursal_id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-lg hover:border-cyan-500/30 transition-all group">
                                <div className="h-2 w-full" style={{ backgroundColor: sucursal.color_identificativo || '#0891b2' }}></div>
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-xl font-bold text-white">{sucursal.nombre}</h3>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(sucursal)}
                                                className="p-2 bg-slate-700 text-cyan-400 rounded-lg hover:bg-slate-600 hover:text-cyan-300"
                                                title="Editar"
                                            >
                                                <Edit size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-slate-300 text-sm">
                                        <p><span className="text-slate-500 block text-xs">Dirección</span> {sucursal.direccion || 'No especificada'}</p>
                                        <p><span className="text-slate-500 block text-xs">Teléfono</span> {sucursal.telefono || 'No especificado'}</p>

                                        <div className="pt-3 border-t border-slate-700 mt-3">
                                            <span className="text-slate-500 block text-xs mb-1">Mercado Pago</span>
                                            {sucursal.mp_public_key ? (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs font-medium border border-green-800">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                                    Configurado
                                                </span>
                                            ) : (
                                                <span className="inline-block px-2 py-1 bg-slate-700 text-slate-400 rounded text-xs">
                                                    No configurado
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {isModalOpen && (
                    <FormularioSucursal
                        sucursal={editingBranch}
                        onClose={() => setIsModalOpen(false)}
                        onSuccess={handleSuccess}
                    />
                )}
            </div>
        </div>
    );
};
