import React from 'react';
import type { FormValues } from '../../types/ventasFormTypes';

interface OpticSectionProps {
    title: string;
    prefix: 'lejos' | 'cerca';
    formState: FormValues;
    formErrors: Record<string, string>;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    stockStatus: { OD: any; OI: any };
    availableCrystals: any[];
}

export const OpticSection: React.FC<OpticSectionProps> = ({
    title,
    prefix,
    formState,
    formErrors,
    onInputChange,
    stockStatus,
    availableCrystals = []
}) => {

    const getVal = (field: string) => formState[`${prefix}_${field}` as keyof FormValues];

    const getInputClass = (field: string, centerText: boolean = false) => {
        const fieldName = `${prefix}_${field}`;
        const hasError = !!formErrors[fieldName];
        // Estilo unificado: Fondo claro, texto oscuro, bordes redondeados suaves
        const baseClass = "w-full bg-slate-100 text-slate-900 rounded-md py-1.5 px-3 border-none focus:ring-2 focus:ring-cyan-500 transition-all";
        const alignClass = centerText ? "text-center" : "";
        const errorClass = hasError ? "ring-2 ring-red-500" : "";

        return `${baseClass} ${alignClass} ${errorClass}`.trim();
    };

    const hasStockOD = !!stockStatus.OD;
    const hasStockOI = !!stockStatus.OI;

    return (
        <div className="backdrop-blur-sm p-5 rounded-xl border border-white mb-6">
            <h3 className="text-xl text-cyan-400 font-bold mb-4 flex items-center">
                {title}
                {hasStockOD && hasStockOI && (
                    <span className="text-xs bg-green-500/20 text-green-400 ml-3 px-2 py-1 rounded-full border border-green-500/30">
                        ✓ Stock Disponible
                    </span>
                )}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* OJO DERECHO */}
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <h4 className="text-cyan-100/80 text-sm font-semibold mb-3 uppercase tracking-wider text-center">Ojo Derecho (OD)</h4>
                    <div className="grid grid-cols-3 gap-3">
                        {['Esf', 'Cil', 'Eje'].map((label) => (
                            <div key={label}>
                                <label className="text-xs text-white/70 mb-1 block">{label}</label>
                                <input
                                    type="text" // Cambiado de number a text
                                    inputMode="decimal" // Fuerza el teclado numérico con decimales en móvil
                                    pattern="[0-9.,-]*"
                                    name={`${prefix}_OD_${label}`}
                                    value={getVal(`OD_${label}`) || ''}
                                    onChange={onInputChange}
                                    className={getInputClass(`OD_${label}`, true)}
                                />
                            </div>
                        ))}
                    </div>
                    {prefix === 'lejos' && (
                        <div className="mt-3">
                            <label className="text-xs text-white/70 mb-1 block">Add</label>
                            <input
                                type="text" // Cambiado de number a text
                                inputMode="decimal" // Fuerza el teclado numérico con decimales en móvil
                                pattern="[0-9.,-]*"
                                name={`${prefix}_OD_Add`}
                                value={getVal('OD_Add') || ''}
                                onChange={onInputChange}
                                className={getInputClass('OD_Add', true)}
                            />
                        </div>
                    )}
                </div>

                {/* OJO IZQUIERDO */}
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <h4 className="text-cyan-100/80 text-sm font-semibold mb-3 uppercase tracking-wider text-center">Ojo Izquierdo (OI)</h4>
                    <div className="grid grid-cols-3 gap-3">
                        {['Esf', 'Cil', 'Eje'].map((label) => (
                            <div key={label}>
                                <label className="text-xs text-white/70 mb-1 block">{label}</label>
                                <input
                                    type="text" // Cambiado de number a text
                                    inputMode="decimal" // Fuerza el teclado numérico con decimales en móvil
                                    pattern="[0-9.,-]*"
                                    name={`${prefix}_OI_${label}`}
                                    value={getVal(`OI_${label}`) || ''}
                                    onChange={onInputChange}
                                    className={getInputClass(`OI_${label}`, true)}
                                />
                            </div>
                        ))}
                    </div>
                    {prefix === 'lejos' && (
                        <div className="mt-3">
                            <label className="text-xs text-white/70 mb-1 block">Add</label>
                            <input
                                type="text" // Cambiado de number a text
                                inputMode="decimal" // Fuerza el teclado numérico con decimales en móvil
                                pattern="[0-9.,-]*"
                                name={`${prefix}_OI_Add`}
                                value={getVal('OI_Add') || ''}
                                onChange={onInputChange}
                                className={getInputClass('OI_Add', true)}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* SELECTORES DE TIPO Y COLOR */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div>
                    <label className="block text-sm text-white font-medium mb-1">Tipo de Cristal</label>
                    <select
                        name={`${prefix}_Tipo`}
                        value={getVal('Tipo') || ''}
                        onChange={onInputChange}
                        className={getInputClass('Tipo')}
                    >
                        <option value="">Seleccione...</option>
                        {availableCrystals.map((cristal) => (
                            <option key={cristal.producto_id || cristal.id} value={cristal.nombre}>
                                {cristal.nombre} - ${cristal.precio_venta}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm text-white font-medium mb-1">Color / Tratamiento</label>
                    <select
                        name={`${prefix}_Color`}
                        value={getVal('Color') || ''}
                        onChange={onInputChange}
                        className={getInputClass('Color')}
                    >
                        <option value="">Ninguno / Blanco</option>
                        <option value="Fotocromatico">Fotocromático</option>
                        <option value="Antireflex">Antireflex</option>
                        <option value="Blue Cut">Blue Cut</option>
                        <option value="Teñido">Teñido</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm text-white font-medium mb-1">DNP</label>
                    <input
                        type="text"
                        inputMode="decimal"
                        name={`${prefix}_DNP`}
                        value={getVal('DNP') || ''}
                        onChange={onInputChange}
                        className={getInputClass('DNP')}
                        placeholder="Distancia interpupilar"
                    />
                </div>
            </div>
        </div>
    );
};