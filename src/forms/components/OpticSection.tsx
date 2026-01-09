import React from 'react';
import type { FormValues } from '../../types/ventasFormTypes';

interface StockInfo {
    stock: number;
    ubicacion: string;
    precio_venta: number;
}

interface OpticSectionProps {
    title: string;
    prefix: 'lejos' | 'cerca';
    formState: FormValues;
    formErrors: Record<string, string>;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    stockStatus?: { OD: StockInfo | null, OI: StockInfo | null };
}

const GLASS_TYPES = [
    "Fotocromático",
    "Orgánico Blanco",
    "Filtro Azul Antireflex",
];

export const OpticSection: React.FC<OpticSectionProps> = ({
    title,
    prefix,
    formState,
    formErrors,
    onInputChange,
    stockStatus,
}) => {
    const getKey = (suffix: string) => `${prefix}_${suffix}` as keyof FormValues;

    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onInputChange(e);

        // Auto-set Color to "Maxima" if "Filtro Azul Antireflex" is selected
        if (e.target.value === "Filtro Azul Antireflex") {
            const colorEvent = {
                target: {
                    name: getKey('Color'),
                    value: "Maxima"
                }
            } as React.ChangeEvent<HTMLInputElement>;
            onInputChange(colorEvent);
        }
    };

    return (
        <section className="bg-opacity-10 border border-blanco rounded-xl p-4">
            <h3 className="text-blanco font-medium mb-3">{title}</h3>

            <div className={`grid grid-cols-2 gap-3 ${prefix === 'lejos' ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
                <div>
                    <input
                        name={getKey('OD_Esf')}
                        value={formState[getKey('OD_Esf')] as string}
                        placeholder="OD Esfera"
                        className={`input ${formErrors[getKey('OD_Esf')] ? 'border-red-500' : ''}`}
                        onChange={onInputChange}
                    />
                    {formErrors[getKey('OD_Esf')] && (
                        <span className="text-red-500 text-xs">{formErrors[getKey('OD_Esf')]}</span>
                    )}
                </div>
                <div>
                    <input
                        name={getKey('OD_Cil')}
                        value={formState[getKey('OD_Cil')] as string}
                        placeholder="OD Cilindro"
                        className={`input ${formErrors[getKey('OD_Cil')] ? 'border-red-500' : ''}`}
                        onChange={onInputChange}
                    />
                    {formErrors[getKey('OD_Cil')] && (
                        <span className="text-red-500 text-xs">{formErrors[getKey('OD_Cil')]}</span>
                    )}
                </div>
                <div>
                    <input
                        name={getKey('OD_Eje')}
                        value={formState[getKey('OD_Eje')] as string}
                        placeholder="OD Eje"
                        className={`input ${formErrors[getKey('OD_Eje')] ? 'border-red-500' : ''}`}
                        onChange={onInputChange}
                    />
                    {formErrors[getKey('OD_Eje')] && (
                        <span className="text-red-500 text-xs">{formErrors[getKey('OD_Eje')]}</span>
                    )}
                </div>
                {prefix === 'lejos' && (
                    <input
                        name={getKey('OD_Add')}
                        value={formState[getKey('OD_Add')] as string}
                        placeholder="OD Adición"
                        className="input"
                        onChange={onInputChange}
                    />
                )}

                <div>
                    <input
                        name={getKey('OI_Esf')}
                        value={formState[getKey('OI_Esf')] as string}
                        placeholder="OI Esfera"
                        className={`input ${formErrors[getKey('OI_Esf')] ? 'border-red-500' : ''}`}
                        onChange={onInputChange}
                    />
                    {formErrors[getKey('OI_Esf')] && (
                        <span className="text-red-500 text-xs">{formErrors[getKey('OI_Esf')]}</span>
                    )}
                </div>
                <div>
                    <input
                        name={getKey('OI_Cil')}
                        value={formState[getKey('OI_Cil')] as string}
                        placeholder="OI Cilindro"
                        className={`input ${formErrors[getKey('OI_Cil')] ? 'border-red-500' : ''}`}
                        onChange={onInputChange}
                    />
                    {formErrors[getKey('OI_Cil')] && (
                        <span className="text-red-500 text-xs">{formErrors[getKey('OI_Cil')]}</span>
                    )}
                </div>
                <div>
                    <input
                        name={getKey('OI_Eje')}
                        value={formState[getKey('OI_Eje')] as string}
                        placeholder="OI Eje"
                        className={`input ${formErrors[getKey('OI_Eje')] ? 'border-red-500' : ''}`}
                        onChange={onInputChange}
                    />
                    {formErrors[getKey('OI_Eje')] && (
                        <span className="text-red-500 text-xs">{formErrors[getKey('OI_Eje')]}</span>
                    )}
                </div>
                {prefix === 'lejos' && (
                    <input
                        name={getKey('OI_Add')}
                        value={formState[getKey('OI_Add')] as string}
                        placeholder="OI Adición"
                        className="input"
                        onChange={onInputChange}
                    />
                )}

            </div>

            {/* Stock Indicators Row */}
            <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="text-xs">
                    // Reemplazar la sección de visualización de stock
                    {stockStatus?.OD ? (
                        <div className="bg-green-100 border border-green-300 p-2 rounded text-xs mt-1">
                            <div className="font-bold text-green-800 flex items-center gap-1">
                                <span>✅ EN STOCK ({stockStatus.OD.stock})</span>
                            </div>
                            <div className="text-blue-800 font-mono text-sm font-bold mt-1">
                                📍 {stockStatus.OD.ubicacion} {/* ESTO ES LO QUE EL VENDEDOR BUSCA */}
                            </div>
                            <div className="text-gray-600 mt-1">
                                ${stockStatus.OD.precio_venta}
                            </div>
                        </div>
                    ) : (
                        (formState[getKey('OD_Esf')] && formState[getKey('OD_Cil')]) && (
                            <div className="bg-yellow-50 border border-yellow-200 p-2 rounded text-xs mt-1 text-yellow-700">
                                ⚠️ Sin Stock (Laboratorio)
                            </div>
                        )
                    )}
                </div>
                <div className="text-xs">
                    {stockStatus?.OI ? (
                        <div className="bg-green-100 border border-green-300 p-2 rounded text-xs mt-1">
                            <div className="font-bold text-green-800 flex items-center gap-1">
                                <span>✅ EN STOCK ({stockStatus.OI.stock})</span>
                            </div>
                            <div className="text-blue-800 font-mono text-sm font-bold mt-1">
                                📍 {stockStatus.OI.ubicacion} {/* ESTO ES LO QUE EL VENDEDOR BUSCA */}
                            </div>
                            <div className="text-gray-600 mt-1">
                                ${stockStatus.OI.precio_venta}
                            </div>
                        </div>
                    ) : (
                        (formState[getKey('OI_Esf')] && formState[getKey('OI_Cil')]) && (
                            <span className="text-yellow-500">⚠️ Sin Stock - Pedir a fábrica</span>
                        )
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <input
                    name={getKey('DNP')}
                    value={formState[getKey('DNP')] as string}
                    placeholder="DNP"
                    className="input"
                    onChange={onInputChange}
                />

                <select
                    name={getKey('Tipo')}
                    value={formState[getKey('Tipo')] as string}
                    onChange={handleTypeChange}
                    className="input text-gray-700"
                >
                    <option value="">Seleccionar Tipo</option>
                    {GLASS_TYPES.map((type) => (
                        <option key={type} value={type}>
                            {type}
                        </option>
                    ))}
                </select>

                <input
                    name={getKey('Color')}
                    value={formState[getKey('Color')] as string}
                    placeholder="Color"
                    className="input"
                    onChange={onInputChange}
                />
            </div>
        </section>
    );
};
