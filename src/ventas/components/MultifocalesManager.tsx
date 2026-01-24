import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Loader2 } from 'lucide-react';
import { searchMultifocales, type Multifocal } from '../../services/multifocales.api';
import { MultifocalModal } from './MultifocalModal';

export const MultifocalesManager: React.FC = () => {
    const [items, setItems] = useState<Multifocal[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Multifocal | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await searchMultifocales(searchTerm);
            setItems(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            loadData();
        }, 500);
        return () => clearTimeout(timeout);
    }, [searchTerm]);

    const handleEdit = (item: Multifocal) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    const handleNew = () => {
        setSelectedItem(null);
        setIsModalOpen(true);
    };

    const handleSuccess = () => {
        loadData();
    };

    return (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl mt-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por marca, modelo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                </div>
                <button
                    onClick={handleNew}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg"
                >
                    <Plus size={20} /> Nuevo Multifocal
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-slate-400 border-b border-slate-700">
                            <th className="p-3">Marca / Modelo</th>
                            <th className="p-3">Características</th>
                            <th className="p-3">Rangos (Esfera / Cil)</th>
                            <th className="p-3 text-right">Precio</th>
                            <th className="p-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400">
                                    <div className="flex justify-center"><Loader2 className="animate-spin text-cyan-500" size={30} /></div>
                                </td>
                            </tr>
                        ) : items.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-500">No se encontraron resultados</td>
                            </tr>
                        ) : (
                            items.map(item => (
                                <tr key={item.multifocal_id} className="hover:bg-slate-700/30 transition-colors">
                                    <td className="p-3">
                                        <div className="font-bold text-white">{item.marca}</div>
                                        <div className="text-sm text-cyan-300">{item.modelo}</div>
                                    </td>
                                    <td className="p-3">
                                        <div className="text-slate-200">{item.material}</div>
                                        <div className="text-xs text-slate-400">{item.tratamiento}</div>
                                    </td>
                                    <td className="p-3 text-sm text-slate-300">
                                        <div>Esf: {item.rango_esfera}</div>
                                        <div>Cil: {item.rango_cilindro}</div>
                                    </td>
                                    <td className="p-3 text-right font-mono text-green-400 text-lg">
                                        ${item.precio.toLocaleString()}
                                    </td>
                                    <td className="p-3 text-center">
                                        <button onClick={() => handleEdit(item)} className="p-2 hover:bg-slate-700 rounded-lg text-cyan-400 hover:text-cyan-300 transition-colors">
                                            <Edit2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <MultifocalModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleSuccess}
                multifocalToEdit={selectedItem}
            />
        </div>
    );
};
