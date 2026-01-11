import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calculator, Wallet, CreditCard, AlertCircle } from 'lucide-react';
import LOAApi from '../../api/LOAApi';
import { useNavigate } from 'react-router-dom';
import { useNumericInput } from '../../hooks/useNumericInput';

interface CashierStats {
    total_efectivo: number;
    total_mp: number;
    total_debito: number;
    total_credito: number;
    // otros campos opcionales que envíe el SP
}

interface CashierClosePayload {
    efectivo_real: number;
    mp_real: number;
    debito_real: number;
    credito_real: number;
    diferencia_total: number;
    observaciones: string;
}

export const CierreCajaPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [stats, setStats] = useState<CashierStats | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    // Form State
    const [inputs, setInputs] = useState({
        efectivo: '',
        mp: '',
        debito: '',
        credito: '',
        observaciones: ''
    });

    // Fetch Stats
    const { data: statsData, isLoading, isError } = useQuery({
        queryKey: ['cashierStats'],
        queryFn: async () => {
            const { data } = await LOAApi.get('/api/cashier/stats');
            return data.result;
        }
    });

    useEffect(() => {
        if (statsData) {
            setStats({
                total_efectivo: parseFloat(statsData.total_efectivo || 0),
                total_mp: parseFloat(statsData.total_mp || 0),
                total_debito: parseFloat(statsData.total_debito || 0),
                total_credito: parseFloat(statsData.total_credito || 0)
            });
        }
    }, [statsData]);

    // Mutation for Closing
    const closeMutation = useMutation({
        mutationFn: async (payload: CashierClosePayload) => {
            const { data } = await LOAApi.post('/api/cashier/close', payload);
            return data;
        },
        onSuccess: () => {
            alert("Caja cerrada correctamente.");
            queryClient.invalidateQueries({ queryKey: ['cashierStats'] });
            navigate('/'); // Redirigir al home o dashboard
        },
        onError: (error: any) => {
            console.error(error);
            alert("Error al cerrar caja: " + (error.response?.data?.message || "Error desconocido"));
        }
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setInputs(prev => ({ ...prev, [name]: value }));
    };

    const { handleNumericChange } = useNumericInput(handleInputChange);

    // Cálculos
    const getVal = (val: string) => parseFloat(val) || 0;

    const realEfectivo = getVal(inputs.efectivo);
    const realMp = getVal(inputs.mp);
    const realDebito = getVal(inputs.debito);
    const realCredito = getVal(inputs.credito);

    const diffEfectivo = realEfectivo - (stats?.total_efectivo || 0);
    const diffMp = realMp - (stats?.total_mp || 0);
    const diffDebito = realDebito - (stats?.total_debito || 0);
    const diffCredito = realCredito - (stats?.total_credito || 0);

    const totalDiferencia = diffEfectivo + diffMp + diffDebito + diffCredito;

    const handleCloseBox = () => {
        const payload: CashierClosePayload = {
            efectivo_real: realEfectivo,
            mp_real: realMp,
            debito_real: realDebito,
            credito_real: realCredito,
            diferencia_total: totalDiferencia,
            observaciones: inputs.observaciones
        };
        closeMutation.mutate(payload);
        setIsConfirmModalOpen(false);
    };

    if (isLoading) return <div className="text-white p-8">Cargando estadísticas...</div>;
    if (isError) return <div className="text-red-400 p-8">Error al cargar estadísticas.</div>;

    const formatCurrency = (val: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);

    return (
        <div className="min-h-screen w-full bg-gradient-to-r from-[#006684] to-[#2db1c3] p-6 fade-in">
            <div className="max-w-6xl mx-auto space-y-6">

                <header className="flex items-center gap-3 text-white mb-8">
                    <Calculator size={32} />
                    <h1 className="text-3xl font-bold">Cierre de Caja Diario</h1>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Resumen del Sistema */}
                    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 shadow-xl">
                        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                            <Wallet size={20} />
                            Resumen del Sistema
                        </h2>

                        <div className="space-y-4">
                            <StatRow label="Efectivo" value={formatCurrency(stats?.total_efectivo || 0)} />
                            <StatRow label="MercadoPago" value={formatCurrency(stats?.total_mp || 0)} />
                            <StatRow label="Débito" value={formatCurrency(stats?.total_debito || 0)} />
                            <StatRow label="Crédito" value={formatCurrency(stats?.total_credito || 0)} />

                            <div className="pt-4 border-t border-white/20 mt-4">
                                <div className="flex justify-between items-center text-xl font-bold text-white">
                                    <span>Total Sistema</span>
                                    <span>{formatCurrency(
                                        (stats?.total_efectivo || 0) +
                                        (stats?.total_mp || 0) +
                                        (stats?.total_debito || 0) +
                                        (stats?.total_credito || 0)
                                    )}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Formulario de Arqueo */}
                    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 shadow-xl">
                        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                            <CreditCard size={20} />
                            Arqueo (Montos Reales)
                        </h2>

                        <div className="space-y-4">
                            <InputRow label="Efectivo en Caja" name="efectivo" value={inputs.efectivo} onChange={handleNumericChange} diff={diffEfectivo} />
                            <InputRow label="Total MercadoPago" name="mp" value={inputs.mp} onChange={handleNumericChange} diff={diffMp} />
                            <InputRow label="Total Débito" name="debito" value={inputs.debito} onChange={handleNumericChange} diff={diffDebito} />
                            <InputRow label="Total Crédito" name="credito" value={inputs.credito} onChange={handleNumericChange} diff={diffCredito} />

                            <div className="pt-4 border-t border-white/20 mt-4">
                                <div className="flex justify-between items-center text-lg font-bold text-white mb-2">
                                    <span>Diferencia Total</span>
                                    <span className={totalDiferencia < 0 ? 'text-red-300' : 'text-green-300'}>
                                        {formatCurrency(totalDiferencia)}
                                    </span>
                                </div>
                            </div>

                            {/* Observaciones */}
                            <div className="mt-4">
                                <label className="block text-sm text-white/80 mb-1">Observaciones</label>
                                <textarea
                                    name="observaciones"
                                    value={inputs.observaciones}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="w-full bg-slate-50 text-slate-900 rounded-lg p-3 outline-none focus:ring-2 focus:ring-cyan-300"
                                    placeholder="Justificar diferencias..."
                                />
                            </div>

                            <button
                                onClick={() => setIsConfirmModalOpen(true)}
                                disabled={closeMutation.isPending}
                                className="w-full mt-6 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2"
                            >
                                {closeMutation.isPending ? 'Procesando...' : 'Finalizar Cierre de Caja'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Confirmación */}
            {isConfirmModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 text-amber-500 mb-4">
                            <AlertCircle size={32} />
                            <h3 className="text-xl font-bold text-slate-800">¿Confirmar Cierre?</h3>
                        </div>
                        <p className="text-slate-600 mb-6">
                            Estás a punto de cerrar la caja.
                            {totalDiferencia !== 0 && (
                                <span className="block mt-2 font-bold text-red-500">
                                    ¡Hay una diferencia de {formatCurrency(totalDiferencia)}!
                                </span>
                            )}
                            <br />Esta acción no se puede deshacer.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsConfirmModalOpen(false)}
                                className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCloseBox}
                                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-bold shadow-md"
                            >
                                Confirmar Cierre
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Componentes auxiliares
const StatRow = ({ label, value }: { label: string, value: string }) => (
    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/10">
        <span className="text-white/80 font-medium">{label}</span>
        <span className="text-white font-bold text-lg">{value}</span>
    </div>
);

const InputRow = ({ label, name, value, onChange, diff }: { label: string, name: string, value: string, onChange: (e: any) => void, diff: number }) => {
    const formatDiff = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(diff);
    return (
        <div className="relative group">
            <div className="flex justify-between mb-1">
                <label className="text-sm text-white/90">{label}</label>
                {diff !== 0 && (
                    <span className={`text-xs font-bold ${diff < 0 ? 'text-red-300' : 'text-green-300'}`}>
                        Dif: {formatDiff}
                    </span>
                )}
            </div>
            <input
                type="text"
                inputMode="decimal"
                name={name}
                value={value}
                onChange={onChange}
                className="w-full bg-slate-50 text-slate-900 font-semibold p-3 rounded-lg outline-none focus:ring-2 focus:ring-cyan-300 transition-all shadow-inner"
                placeholder="0.00"
            />
        </div>
    );
};
