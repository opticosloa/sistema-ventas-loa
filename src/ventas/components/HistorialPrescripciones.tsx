import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import LOAApi from '../../api/LOAApi';

export const HistorialPrescripciones: React.FC = () => {
    const { cliente_id } = useParams<{ cliente_id: string }>();
    const navigate = useNavigate();

    // Fetch client details
    const { data: cliente, isLoading: isLoadingCliente } = useQuery({
        queryKey: ['client', cliente_id],
        queryFn: async () => {
            const { data } = await LOAApi.get<{ result: any }>(`/api/clients`);
            const rows = data.result?.rows || data.result;
            return rows.find((c: any) => c.cliente_id.toString() === cliente_id);
        },
        enabled: !!cliente_id
    });

    // Fetch prescriptions
    const { data: prescripciones = [], isLoading: isLoadingPrescripciones } = useQuery({
        queryKey: ['prescriptions', cliente_id],
        queryFn: async () => {
            if (!cliente_id) return [];
            const { data } = await LOAApi.get<{ success: boolean; result: any }>(`/api/prescriptions/client/${cliente_id}`);
            return data.result?.rows || data.result || [];
        },
        enabled: !!cliente_id
    });

    if (isLoadingCliente || isLoadingPrescripciones) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500">Cargando historial...</p>
                </div>
            </div>
        );
    }

    if (!cliente) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-bold text-red-600">Cliente no encontrado</h2>
                <button onClick={() => navigate(-1)} className="mt-4 btn-primary">Volver</button>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1">
                        ← Volver
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">Historial de Prescripciones</h1>
                    <p className="text-gray-600 mt-1">
                        Cliente: <span className="font-semibold">{cliente.nombre}</span> | DNI: {cliente.dni}
                    </p>
                </div>
                <div>
                    <button
                        className="btn-primary"
                        onClick={() => navigate('/empleado/nueva-venta', { state: { client: cliente } })}
                    >
                        + Nuevo Pedido
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                {prescripciones.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">
                        No hay prescripciones registradas para este cliente.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalles (Lejos/Cerca)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observaciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {prescripciones.map((p: any) => (
                                    <tr key={p.prescripcion_id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {new Date(p.fecha).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {p.doctor_apellido ? `Dr. ${p.doctor_apellido}` : 'S/D'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 max-w-xs">
                                                <div className="font-semibold text-xs text-gray-500 uppercase">Lejos</div>
                                                <div className="font-semibold text-xs text-gray-500 uppercase">Cerca</div>
                                                <div className="font-mono bg-gray-50 px-1 rounded truncate">{p.lejos || '-'}</div>
                                                <div className="font-mono bg-gray-50 px-1 rounded truncate">{p.cerca || '-'}</div>
                                            </div>
                                            {(p.cilindro_lejos || p.cilindro_cerca) && (
                                                <div className="mt-1 text-xs text-gray-500">
                                                    Cil: {p.cilindro_lejos || '-'} / {p.cilindro_cerca || '-'}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                            {p.observaciones || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
