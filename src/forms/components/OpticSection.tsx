import React from 'react';
import type { FormValues } from '../../types/ventasFormTypes';

interface OpticSectionProps {
    title: string;
    prefix: 'lejos' | 'cerca';
    formState: FormValues;
    formErrors: Record<string, string>; // Ahora sí la vamos a usar
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

    // Helper para obtener valores del state
    const getVal = (field: string) => formState[`${prefix}_${field}` as keyof FormValues];

    // Helper para obtener clases CSS (USA formErrors AQUÍ)
    // Si existe un error en 'lejos_OD_Esf', devuelve la clase con borde rojo
    const getInputClass = (field: string, centerText: boolean = false) => {
        const fieldName = `${prefix}_${field}`;
        const hasError = !!formErrors[fieldName];
        const baseClass = "input w-full";
        const alignClass = centerText ? "text-center" : "";
        const errorClass = hasError ? "border-red-500 focus:ring-red-500 text-red-400" : "";

        return `${baseClass} ${alignClass} ${errorClass}`.trim();
    };

    // Determina si hay stock visualmente
    const hasStockOD = !!stockStatus.OD;
    const hasStockOI = !!stockStatus.OI;

    return (
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-600 mb-4">
            <h3 className="text-xl text-celeste font-semibold mb-3 border-b border-gray-600 pb-2">
                {title} {hasStockOD && hasStockOI && <span className="text-xs text-green-400 ml-2">✓ Stock Disponible</span>}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* OJO DERECHO */}
                <div className="bg-gray-900 p-3 rounded border border-gray-700">
                    <h4 className="text-white font-bold mb-2 text-center">Ojo Derecho (OD)</h4>
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="text-xs text-gray-400">Esfera</label>
                            <input
                                type="number" step="0.25"
                                name={`${prefix}_OD_Esf`}
                                value={getVal('OD_Esf') || ''}
                                onChange={onInputChange}
                                className={getInputClass('OD_Esf', true)}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400">Cilindro</label>
                            <input
                                type="number" step="0.25"
                                name={`${prefix}_OD_Cil`}
                                value={getVal('OD_Cil') || ''}
                                onChange={onInputChange}
                                className={getInputClass('OD_Cil', true)}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400">Eje</label>
                            <input
                                type="number"
                                name={`${prefix}_OD_Eje`}
                                value={getVal('OD_Eje') || ''}
                                onChange={onInputChange}
                                className={getInputClass('OD_Eje', true)}
                            />
                        </div>
                    </div>
                    {/* Campo Add solo para Lejos (opcional según tu lógica de negocio) */}
                    {prefix === 'lejos' && (
                        <div className="mt-2">
                            <label className="text-xs text-gray-400">Add</label>
                            <input
                                type="number" step="0.25"
                                name={`${prefix}_OD_Add`}
                                value={getVal('OD_Add') || ''}
                                onChange={onInputChange}
                                className={getInputClass('OD_Add', true)}
                            />
                        </div>
                    )}
                </div>

                {/* OJO IZQUIERDO */}
                <div className="bg-gray-900 p-3 rounded border border-gray-700">
                    <h4 className="text-white font-bold mb-2 text-center">Ojo Izquierdo (OI)</h4>
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="text-xs text-gray-400">Esfera</label>
                            <input
                                type="number" step="0.25"
                                name={`${prefix}_OI_Esf`}
                                value={getVal('OI_Esf') || ''}
                                onChange={onInputChange}
                                className={getInputClass('OI_Esf', true)}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400">Cilindro</label>
                            <input
                                type="number" step="0.25"
                                name={`${prefix}_OI_Cil`}
                                value={getVal('OI_Cil') || ''}
                                onChange={onInputChange}
                                className={getInputClass('OI_Cil', true)}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400">Eje</label>
                            <input
                                type="number"
                                name={`${prefix}_OI_Eje`}
                                value={getVal('OI_Eje') || ''}
                                onChange={onInputChange}
                                className={getInputClass('OI_Eje', true)}
                            />
                        </div>
                    </div>
                    {prefix === 'lejos' && (
                        <div className="mt-2">
                            <label className="text-xs text-gray-400">Add</label>
                            <input
                                type="number" step="0.25"
                                name={`${prefix}_OI_Add`}
                                value={getVal('OI_Add') || ''}
                                onChange={onInputChange}
                                className={getInputClass('OI_Add', true)}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* SELECTORES DE TIPO (DINÁMICO) Y COLOR */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Tipo de Cristal</label>
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
                    <label className="block text-sm text-gray-400 mb-1">Color / Tratamiento</label>
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
                    <label className="block text-sm text-gray-400 mb-1">DNP</label>
                    <input
                        type="text"
                        name={`${prefix}_DNP`}
                        value={getVal('DNP') || ''}
                        onChange={onInputChange}
                        className={getInputClass('DNP')}
                    />
                </div>
            </div>
        </div>
    );
};