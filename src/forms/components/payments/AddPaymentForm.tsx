import React, { useState, useMemo, useEffect } from 'react';
import { CoverageSummary } from './CoverageSummary';
import type { MetodoPago } from '../../../types/Pago';
import type { ObraSocial } from '../../../types/ObraSocial';

interface AddPaymentFormProps {
    selectedMethod: MetodoPago | '';
    setSelectedMethod: (m: MetodoPago | '') => void;
    amountInput: string;
    setAmountInput: (val: string) => void;
    handleAddPayment: () => void;
    currentTotal: number;
    // Props for Obra Social
    obrasSociales?: ObraSocial[];
    selectedObraSocialId?: string | '';
    setSelectedObraSocialId?: (id: string | '') => void;
    nroOrden?: string;
    setNroOrden?: (val: string) => void;
    onCoverInsurance?: () => void;
    hasSocialWorkPayment?: boolean;
    coverageDetails?: { totalCoverage: number; itemsDetail: { name: string; amount: number; reason: string }[] };
}

const metodos: { id: MetodoPago; label: string; icon: string }[] = [
    { id: 'EFECTIVO', label: 'Efectivo', icon: '💵' },
    { id: 'TRANSFERENCIA', label: 'Transferencia', icon: '🏦' },
    { id: 'MP', label: 'Mercado Pago', icon: '📱' },
    { id: 'OBRA_SOCIAL', label: 'Obra Social', icon: '🚑' },
];

export const AddPaymentForm: React.FC<AddPaymentFormProps> = ({
    selectedMethod,
    setSelectedMethod,
    amountInput,
    setAmountInput,
    handleAddPayment,
    currentTotal,
    obrasSociales = [],
    selectedObraSocialId = '',
    setSelectedObraSocialId,
    nroOrden = '',
    setNroOrden,
    // onCoverInsurance
    hasSocialWorkPayment = false,
    coverageDetails
}) => {
    const selectedOS = obrasSociales.find(os => os.obra_social_id === selectedObraSocialId);

    // Grouping Logic
    const groupedOS = useMemo(() => {
        const groups: Record<string, ObraSocial[]> = {};
        obrasSociales.forEach(os => {
            if (!groups[os.nombre]) groups[os.nombre] = [];
            groups[os.nombre].push(os);
        });
        return groups;
    }, [obrasSociales]);

    const entityNames = useMemo(() => Object.keys(groupedOS).sort(), [groupedOS]);

    // Local state for Entity selection
    const [selectedEntity, setSelectedEntity] = useState<string>('');

    // Sync Entity when ID changes (e.g. from parent or pre-selection)
    useEffect(() => {
        if (selectedObraSocialId && selectedOS) {
            setSelectedEntity(selectedOS.nombre);
        } else if (!selectedObraSocialId) {
            // Maybe reset? No, keep entity if user is browsing
        }
    }, [selectedObraSocialId, selectedOS]);

    // Handler for Entity Change
    const handleEntityChange = (entityName: string) => {
        setSelectedEntity(entityName);
        const plans = groupedOS[entityName] || [];

        // Auto-select if only 1 option
        if (plans.length === 1 && setSelectedObraSocialId) {
            setSelectedObraSocialId(String(plans[0].obra_social_id));
        } else if (setSelectedObraSocialId) {
            setSelectedObraSocialId(''); // Reset for user to choose plan
        }
    };

    return (
        <>
            <h3 className="text-lg font-medium mb-4">Agregar Método</h3>
            <div className="grid grid-cols-2 gap-2 mb-6">
                {metodos.map((m) => (
                    <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                            setSelectedMethod(m.id);
                            // Logic for resetting amount if needed is handled in parent or here?
                            // Parent handles the amountInput reset if needed, or we just set method.
                        }}
                        className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${selectedMethod === m.id
                            ? 'bg-celeste text-negro border-celeste scale-105 shadow-md'
                            : 'bg-transparent border-gray-600 hover:border-celeste hover:text-celeste'
                            } ${m.id === 'OBRA_SOCIAL' && hasSocialWorkPayment ? 'opacity-50 cursor-not-allowed bg-gray-800' : ''}`}
                        disabled={m.id === 'OBRA_SOCIAL' && hasSocialWorkPayment}
                    >
                        <span className="text-2xl">{m.icon}</span>
                        <span className="text-xs font-medium">{m.label}</span>
                    </button>
                ))}
            </div>

            {selectedMethod === 'OBRA_SOCIAL' && (
                <div className="mb-6 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                    <div className="mb-4">
                        <label className="block text-sm text-gray-300 mb-1">Entidad (Obra Social)</label>
                        <select
                            value={selectedEntity}
                            onChange={(e) => handleEntityChange(e.target.value)}
                            className="input w-full mb-3"
                        >
                            <option value="">Seleccione Entidad...</option>
                            {entityNames.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>

                        {/* Plan Selector (Only if Entity selected and has multiple plans or needs selection) */}
                        {selectedEntity && (groupedOS[selectedEntity]?.length > 1 || (groupedOS[selectedEntity]?.length === 1 && groupedOS[selectedEntity][0].plan)) && (
                            <div className="mt-2">
                                <label className="block text-sm text-gray-300 mb-1">Plan</label>
                                <select
                                    value={selectedObraSocialId || ''}
                                    onChange={(e) => setSelectedObraSocialId && setSelectedObraSocialId(e.target.value)}
                                    className="input w-full"
                                >
                                    <option value="">Seleccione Plan...</option>
                                    {groupedOS[selectedEntity].map(os => (
                                        <option key={os.obra_social_id} value={os.obra_social_id}>
                                            {os.plan ? os.plan : 'Único Plan'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* COVERAGE SUMMARY - TABLE (Task 4) */}
                    {selectedObraSocialId && coverageDetails && coverageDetails.totalCoverage > 0 && (
                        <CoverageSummary
                            details={coverageDetails.itemsDetail}
                            total={coverageDetails.totalCoverage}
                        />
                    )}

                    {selectedOS && (
                        <div className="mb-4 text-sm text-gray-300">
                            {selectedOS.instrucciones && (
                                <div className="mb-2 p-2 bg-blue-900/30 border border-blue-800 rounded">
                                    <strong>Instrucciones:</strong> {selectedOS.instrucciones}
                                </div>
                            )}
                            {selectedOS.sitio_web && (
                                <a
                                    href={selectedOS.sitio_web}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full text-center py-2 bg-gray-600 hover:bg-gray-500 rounded text-white font-medium mb-3"
                                >
                                    🔗 Verificar Orden
                                </a>
                            )}
                        </div>
                    )}

                    <div className="mb-4">
                        <label className="block text-sm text-gray-300 mb-1">Nro. de Orden / Autorización *</label>
                        <input
                            type="text"
                            value={nroOrden || ''}
                            onChange={(e) => setNroOrden && setNroOrden(e.target.value)}
                            className="input w-full"
                            placeholder="Ingrese código..."
                        />
                    </div>

                    {/* COMENTADO POR SOLICITUD DEL USUARIO: CALCULO AUTOMATICO PENDIENTE DE DATOS
                    {onCoverInsurance && (
                        <button
                            type="button"
                            onClick={onCoverInsurance}
                            disabled={!selectedObraSocialId || !nroOrden}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-2"
                        >
                            ✨ Cubrir Cristales y Marcos
                        </button>
                    )}

                    <p className="text-xs text-gray-400 text-center">
                        Calcula automáticamente el total de items ópticos.
                    </p>
                    */}
                </div>
            )}

            <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-1">Monto</label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                        type="number"
                        value={amountInput || ''}
                        onChange={(e) => setAmountInput(e.target.value)}
                        className={`input pl-8 w-full text-lg font-bold `}
                        placeholder="0.00"
                    />
                </div>
            </div>

            <button
                type="button"
                onClick={handleAddPayment}
                disabled={
                    !selectedMethod ||
                    parseFloat(amountInput) <= 0 ||
                    currentTotal <= 0 ||
                    (selectedMethod === 'OBRA_SOCIAL' && !nroOrden?.trim())
                }
                className={`btn-secondary w-full mb-auto ${currentTotal <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                Agregar Pago
            </button>

            <hr className="border-gray-700 my-6" />
        </>
    );
};
