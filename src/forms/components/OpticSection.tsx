import React from 'react';
import type { FormValues } from '../../types/ventasFormTypes';
import { useNumericInput } from '../../hooks/useNumericInput';

interface OpticSectionProps {
    title: string;
    prefix: 'lejos' | 'cerca';
    formState: FormValues;
    formErrors: Record<string, string>;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    stockStatus: { OD: any; OI: any };
    materials?: any[];
    treatments?: any[];
}

export const OpticSection: React.FC<OpticSectionProps> = ({
    title,
    prefix,
    formState,
    formErrors,
    onInputChange,
    stockStatus,
    materials = [],
    treatments = []
}) => {

    const getVal = (field: string) => formState[`${prefix}_${field}` as keyof FormValues];

    //  Hook para normalizar inputs numéricos
    const { handleNumericChange } = useNumericInput(onInputChange);

    const getInputClass = (field: string, centerText: boolean = false) => {
        const fieldName = `${prefix}_${field}`;
        const hasError = !!formErrors[fieldName];
        const baseClass = "w-full bg-slate-100 text-slate-900 rounded-md py-1.5 px-3 border-none focus:ring-2 focus:ring-cyan-500 transition-all";
        const alignClass = centerText ? "text-center" : "";
        const errorClass = hasError ? "ring-2 ring-red-500" : "";

        return `${baseClass} ${alignClass} ${errorClass}`.trim();
    };

    return (
        <div className="backdrop-blur-sm p-5 rounded-xl border border-white mb-6">
            <h3 className="text-3xl text-cyan-400 font-bold mb-4 flex justify-center items-center">
                {title}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* OJO DERECHO */}
                <div className={`p-4 rounded-lg border transition-colors ${stockStatus.OD ? (stockStatus.OD.stock > 0 ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5') : 'border-white'}`}>
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-cyan-100/80 text-sm font-semibold uppercase tracking-wider">Ojo Derecho (OD)</h4>
                        {stockStatus.OD && (
                            <span className={`text-xs px-2 py-0.5 rounded border ${stockStatus.OD.stock > 0 ? 'text-green-400 border-green-500/30 bg-green-500/20' : 'text-red-400 border-red-500/30 bg-red-500/20'}`}>
                                {stockStatus.OD.stock > 0 ? `Stock: ${stockStatus.OD.stock}` : 'Sin Stock'}
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {['Esf', 'Cil', 'Eje'].map((label) => {
                            // Logic for Axis (Eje)
                            let isDisabled = false;
                            if (label === 'Eje') {
                                const cilValue = getVal('OD_Cil');
                                isDisabled = !cilValue || parseFloat(cilValue) === 0;
                            }

                            return (
                                <div key={label}>
                                    <label className="text-xs text-white/70 mb-1 block">
                                        {label} {label === 'Esf' && <span className="text-red-500">*</span>}
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        pattern="[0-9.,\-]*"
                                        name={`${prefix}_OD_${label}`}
                                        value={getVal(`OD_${label}`) || ''}
                                        onChange={onInputChange}
                                        disabled={isDisabled}
                                        className={`${getInputClass(`OD_${label}`)} ${isDisabled ? 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-500' : ''}`}
                                        tabIndex={isDisabled ? -1 : undefined}
                                    />
                                </div>
                            );
                        })}
                    </div>
                    {prefix === 'lejos' && (
                        <div className="mt-3">
                            <label className="text-xs text-white/70 mb-1 block">Add</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                pattern="[0-9.,\-]*"
                                name={`${prefix}_OD_Add`}
                                value={getVal('OD_Add') || ''}
                                onChange={handleNumericChange}
                                className={getInputClass('OD_Add', true)}
                            />
                        </div>
                    )}
                </div>

                {/* OJO IZQUIERDO */}
                <div className={`p-4 rounded-lg border transition-colors ${stockStatus.OI ? (stockStatus.OI.stock > 0 ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5') : 'border-white'}`}>
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-cyan-100/80 text-sm font-semibold uppercase tracking-wider">Ojo Izquierdo (OI)</h4>
                        {stockStatus.OI && (
                            <span className={`text-xs px-2 py-0.5 rounded border ${stockStatus.OI.stock > 0 ? 'text-green-400 border-green-500/30 bg-green-500/20' : 'text-red-400 border-red-500/30 bg-red-500/20'}`}>
                                {stockStatus.OI.stock > 0 ? `Stock: ${stockStatus.OI.stock}` : 'Sin Stock'}
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {['Esf', 'Cil', 'Eje'].map((label) => {
                            // Logic for Axis (Eje)
                            let isDisabled = false;
                            if (label === 'Eje') {
                                const cilValue = getVal('OI_Cil');
                                isDisabled = !cilValue || parseFloat(cilValue) === 0;
                            }

                            return (
                                <div key={label}>
                                    <label className="text-xs text-white/70 mb-1 block">{label}</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        pattern="[0-9.,\-]*"
                                        name={`${prefix}_OI_${label}`}
                                        value={getVal(`OI_${label}`) || ''}
                                        onChange={onInputChange}
                                        disabled={isDisabled}
                                        className={`${getInputClass(`OI_${label}`, true)} ${isDisabled ? 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-500' : ''}`}
                                        tabIndex={isDisabled ? -1 : undefined}
                                    />
                                </div>
                            );
                        })}
                    </div>
                    {prefix === 'lejos' && (
                        <div className="mt-3">
                            <label className="text-xs text-white/70 mb-1 block">Add</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                pattern="[0-9.,\-]*"
                                name={`${prefix}_OI_Add`}
                                value={getVal('OI_Add') || ''}
                                onChange={handleNumericChange}
                                className={getInputClass('OI_Add', true)}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* BUSCADOR DE CRISTAL (MANUAL / SELECT) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div>
                    <label className="block text-sm text-white font-medium mb-1">
                        Tipo de Cristal (Material) <span className="text-red-500">*</span>
                    </label>
                    <select
                        name={`${prefix}_Tipo`}
                        value={getVal('Tipo') || ''}
                        onChange={onInputChange}
                        className={getInputClass('Tipo')}
                    >
                        <option value="">-- Seleccionar Material --</option>
                        {materials.map((m: any) => (
                            <option key={m.material_id || m.id} value={m.nombre}>
                                {m.nombre}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm text-white font-medium mb-1">Tratamiento</label>
                    <select
                        name={`${prefix}_Color`}
                        value={getVal('Color') || ''}
                        onChange={onInputChange}
                        className={getInputClass('Color')}
                    >
                        <option value="">-- Ninguno / Seleccionar --</option>
                        {treatments.map((t: any) => (
                            <option key={t.tratamiento_id || t.id} value={t.nombre}>
                                {t.nombre}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm text-white font-medium mb-1">DNP</label>
                    <input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9.,\-]*"
                        name={`${prefix}_DNP`}
                        value={getVal('DNP') || ''}
                        onChange={handleNumericChange}
                        className={getInputClass('DNP')}
                        placeholder="Distancia interpupilar"
                    />
                </div>
            </div>
        </div>
    );
};