import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Save, DollarSign, Calendar, Stethoscope } from 'lucide-react';
import LOAApi from '../../api/LOAApi';
import { useNumericInput } from '../../hooks/useNumericInput';
import { CrystalSettingsSection } from './CrystalSettingsSection';

export const ConfiguracionPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [manualRate, setManualRate] = useState('');

    const { data: rateData, isLoading, isError } = useQuery({
        queryKey: ['dolarRate'],
        queryFn: async () => {
            const { data } = await LOAApi.get('/api/currency/rate');
            return data.result;
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (val?: string) => {
            const payload = val ? { manualRate: parseFloat(val) } : {};
            const { data } = await LOAApi.post('/api/currency/rate', payload);
            return data.result;
        },
        onSuccess: () => {
            Swal.fire("Éxito", "Cotización actualizada correctamente", "success");
            queryClient.invalidateQueries({ queryKey: ['dolarRate'] });
            setManualRate('');
        },
        onError: (err) => {
            console.error(err);
            Swal.fire("Error", "Error al actualizar cotización", "error");
        }
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setManualRate(e.target.value);
    };

    const { handleNumericChange } = useNumericInput(handleInputChange);

    const handleUpdateApi = () => {
        updateMutation.mutate(undefined);
    };

    const handleUpdateManual = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualRate) return;
        updateMutation.mutate(manualRate);
    };

    if (isLoading) return <div className="p-8 text-white">Cargando configuración...</div>;
    if (isError) return <div className="p-8 text-red-400">Error al cargar configuración.</div>;

    const rate = rateData?.rate || 0;
    const updatedAt = rateData?.updatedAt ? new Date(rateData.updatedAt).toLocaleString() : 'Nunca';

    return (
        <div className="min-h-screen bg-slate-900 p-6 fade-in">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <DollarSign /> Configuración de Divisas
                    </h1>
                    <p className="text-slate-400 mt-2">Gestiona la cotización del dólar para conversiones automáticas.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {/* Doctors Link */}
                    <a href="/admin/configuracion/doctores" className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800/80 transition-all group">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-cyan-500/10 rounded-lg group-hover:bg-cyan-500/20 transition-colors">
                                <Stethoscope className="text-cyan-400" size={24} />
                            </div>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Médicos</h3>
                        <p className="text-sm text-slate-400">Gestionar padrón de médicos, matrículas y especialidades.</p>
                    </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Tarjeta de Cotización Actual */}
                    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-white">Cotización Actual</h2>
                            <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-sm font-medium border border-green-500/20">
                                Dólar Blue
                            </span>
                        </div>

                        <div className="text-5xl font-bold text-white mb-2">
                            ${rate}
                        </div>

                        <div className="flex items-center gap-2 text-slate-400 text-sm mb-6">
                            <Calendar size={14} />
                            Actualizado: {updatedAt}
                        </div>

                        <button
                            onClick={handleUpdateApi}
                            disabled={updateMutation.isPending}
                            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg transition-colors flex justify-center items-center gap-2"
                        >
                            <RefreshCw size={20} className={updateMutation.isPending ? 'animate-spin' : ''} />
                            {updateMutation.isPending ? 'Actualizando...' : 'Actualizar desde API'}
                        </button>
                    </div>

                    {/* Tarjeta de Actualización Manual */}
                    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
                        <h2 className="text-xl font-semibold text-white mb-4">Actualizar Manualmente</h2>
                        <p className="text-slate-400 text-sm mb-6">
                            Si la API falla o deseas fijar un precio específico, puedes ingresarlo aquí.
                        </p>

                        <form onSubmit={handleUpdateManual}>
                            <div className="mb-4">
                                <label className="block text-sm text-slate-300 mb-1">Nuevo Valor ($)</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={manualRate}
                                    onChange={handleNumericChange}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                                    placeholder="Ej: 1200.50"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={!manualRate || updateMutation.isPending}
                                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                            >
                                <Save size={20} />
                                Guardar Nuevo Valor
                            </button>
                        </form>
                    </div>
                </div>

                <CrystalSettingsSection />
            </div>
        </div>
    );
};
