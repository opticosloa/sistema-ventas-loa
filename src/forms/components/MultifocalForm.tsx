import React, { useState, useEffect } from 'react';

import { Search, X } from 'lucide-react';
import type { FormValues } from '../../types/ventasFormTypes';
import { searchMultifocales, type Multifocal } from '../../services/multifocales.api';

interface MultifocalFormProps {
    formState: FormValues;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onSelect?: (item: Multifocal, price: number) => void;
    dolarRate: number;
}

export const MultifocalForm: React.FC<MultifocalFormProps> = ({
    formState,
    onInputChange,
    onSelect,
    dolarRate
}) => {
    const { multifocalTipo, DI_Lejos, DI_Cerca, Altura, Observacion } = formState;
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<Multifocal[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState<Multifocal | null>(null);

    // Sync local search term with form state if needed, or just let user type for search
    // We want the input to drive the search.

    useEffect(() => {
        if (multifocalTipo && !selectedItem) {
            setSearchTerm(multifocalTipo);
        }
    }, [multifocalTipo]);

    const handleSearch = async (term: string) => {
        setSearchTerm(term);
        if (term.length < 2) {
            setResults([]);
            setShowResults(false);
            return;
        }

        setLoading(true);
        try {
            const data = await searchMultifocales(term);
            setResults(data);
            setShowResults(true);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (item: Multifocal) => {
        setSelectedItem(item);
        setSearchTerm(`${item.marca} ${item.modelo} ${item.material} ${item.tratamiento || ''}`.trim());
        setShowResults(false);

        // Update Form State field via simulated event or direct prop if allowed? 
        // usage in parent: onChange={onInputChange}
        // We need to trigger onInputChange for 'multifocalTipo'

        const syntheticEvent = {
            target: {
                name: 'multifocalTipo',
                value: `${item.marca} ${item.modelo} ${item.material} ${item.tratamiento || ''}`.trim()
            }
        } as React.ChangeEvent<HTMLInputElement>;

        onInputChange(syntheticEvent);

        if (onSelect) {
            const finalPrice = Math.round(Number(item.precio) * dolarRate);
            onSelect(item, finalPrice);
        }
    };

    const clearSelection = () => {
        setSelectedItem(null);
        setSearchTerm('');

        const syntheticEvent = {
            target: {
                name: 'multifocalTipo',
                value: ''
            }
        } as React.ChangeEvent<HTMLInputElement>;
        onInputChange(syntheticEvent);

        // Notify parent of removal (price 0)
        if (onSelect) {
            // @ts-ignore - Passing dummy empty object or null logic if parent handles it
            onSelect({ multifocal_id: '', precio: 0 } as Multifocal, 0);
        }
    };

    return (
        <section className="bg-opacity-10 border border-blanco rounded-xl p-4 mt-4 relative">
            <h3 className="text-blanco font-medium mb-3 flex items-center gap-2">
                <span>Multifocal</span>
                <span className="text-xs text-slate-400 font-normal">(Busque por Marca, Modelo o Material)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative sm:col-span-3">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Buscar catálogo multifocal..."
                            className="w-full bg-crema text-slate-500 rounded-lg p-2.5 pr-10 border border-slate-600 focus:ring-2 focus:ring-cyan-500 outline-none"
                        />
                        {loading && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-500 animate-spin">
                                <Search size={16} />
                            </div>
                        )}
                        {!loading && selectedItem && (
                            <button type="button" onClick={clearSelection} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-300">
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Dropdown Results */}
                    {showResults && results.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-azul border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                            {results.map(item => (
                                <button
                                    key={item.multifocal_id}
                                    type="button"
                                    onClick={() => handleSelect(item)}
                                    className="w-full text-left p-3 hover:bg-azul/10 border-b border-slate-800 last:border-0 transition-colors flex justify-between items-center group"
                                >
                                    <div>
                                        <div className="font-bold text-white group-hover:text-cyan-400">{item.marca} - {item.modelo}</div>
                                        <div className="text-sm text-slate-400">{item.material} {item.tratamiento}</div>
                                    </div>
                                    <div className="text-green-400 font-mono font-bold">
                                        ${(Number(item.precio) * dolarRate).toLocaleString('es-AR')}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="sm:col-span-3 grid grid-cols-3 gap-3">
                    <span className="text-xs text-slate-500 col-span-3 uppercase tracking-wider font-semibold mt-2">Medidas</span>
                    <input
                        name="DI_Lejos"
                        value={DI_Lejos}
                        onChange={onInputChange}
                        placeholder="D.I Lejos"
                        className="w-full bg-slate-100 text-slate-900 rounded-md py-1.5 px-3 border-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <input
                        name="DI_Cerca"
                        value={DI_Cerca}
                        onChange={onInputChange}
                        placeholder="D.I Cerca"
                        className="w-full bg-slate-100 text-slate-900 rounded-md py-1.5 px-3 border-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <input
                        name="Altura"
                        value={Altura}
                        onChange={onInputChange}
                        placeholder="Altura"
                        className="w-full bg-slate-100 text-slate-900 rounded-md py-1.5 px-3 border-none focus:ring-2 focus:ring-cyan-500"
                    />
                </div>

                <textarea
                    name="Observacion"
                    value={Observacion}
                    onChange={onInputChange}
                    placeholder="Observaciones de Laboratorio"
                    className="w-full bg-slate-100/10 text-white rounded-lg p-2.5 border border-white/20 focus:ring-2 focus:ring-cyan-500 outline-none sm:col-span-3 h-20 resize-none mt-2"
                />
            </div>
        </section>
    );
};
