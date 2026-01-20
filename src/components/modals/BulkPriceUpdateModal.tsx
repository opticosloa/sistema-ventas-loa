import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { X, AlertTriangle, CheckCircle, Tag } from 'lucide-react';
import { getBrands, type Brand } from '../../services/brands.api';
import { getMaterials, getTreatments, type CrystalMaterial, type CrystalTreatment, updatePricesSelectively } from '../../services/crystals.api';
import { updatePricesByBrand } from '../../services/products.api';

interface BulkPriceUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const BulkPriceUpdateModal: React.FC<BulkPriceUpdateModalProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'CRYSTALS'>('PRODUCTS');
    const [loading, setLoading] = useState(false);

    // Data Sources
    const [brands, setBrands] = useState<Brand[]>([]);
    const [materials, setMaterials] = useState<CrystalMaterial[]>([]);
    const [treatments, setTreatments] = useState<CrystalTreatment[]>([]);

    // Form States
    const [selectedBrand, setSelectedBrand] = useState<string>('');
    const [selectedMaterial, setSelectedMaterial] = useState<string>('ALL');
    const [selectedTreatment, setSelectedTreatment] = useState<string>('ALL');
    const [percentage, setPercentage] = useState<string>('0');

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    const loadData = async () => {
        try {
            const [b, m, t] = await Promise.all([
                getBrands(),
                getMaterials(),
                getTreatments()
            ]);
            setBrands(b);
            setMaterials(m);
            setTreatments(t);
        } catch (error) {
            console.error("Error loading data for bulk update", error);
            Swal.fire('Error', 'No se pudieron cargar los datos necesarios.', 'error');
        }
    };

    const handleConfirm = async () => {
        const pct = parseFloat(percentage);
        if (isNaN(pct) || pct === 0) {
            return Swal.fire('Atención', 'Ingresa un porcentaje válido (distinto de 0).', 'warning');
        }

        if (activeTab === 'PRODUCTS') {
            if (!selectedBrand) return Swal.fire('Atención', 'Selecciona una marca.', 'warning');

            const brandName = brands.find(b => b.marca_id === selectedBrand)?.nombre || 'Seleccionada';

            const result = await Swal.fire({
                title: '¿Confirmar actualización?',
                text: `Vas a aumentar un ${pct}% a todos los productos de la marca ${brandName}. ¿Estás seguro?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#0891b2', // cyan-600
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, actualizar',
                cancelButtonText: 'Cancelar'
            });

            if (result.isConfirmed) {
                setLoading(true);
                try {
                    await updatePricesByBrand(Number(selectedBrand), pct);
                    Swal.fire('Éxito', 'Precios actualizados correctamente.', 'success');
                    onClose();
                    setPercentage('0');
                    setSelectedBrand('');
                } catch (error) {
                    console.error(error);
                    Swal.fire('Error', 'Hubo un problema actualizando los precios.', 'error');
                } finally {
                    setLoading(false);
                }
            }

        } else {
            // CRYSTALS
            const result = await Swal.fire({
                title: '¿Confirmar actualización?',
                text: `Vas a aumentar un ${pct}% a los cristales de material [${selectedMaterial}] con tratamiento [${selectedTreatment}]. ¿Confirmar?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#0891b2',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, actualizar',
                cancelButtonText: 'Cancelar'
            });

            if (result.isConfirmed) {
                setLoading(true);
                try {
                    await updatePricesSelectively(selectedMaterial, selectedTreatment, pct);
                    Swal.fire('Éxito', 'Precios de cristales actualizados correctamente.', 'success');
                    onClose();
                    setPercentage('0');
                    setSelectedMaterial('ALL');
                    setSelectedTreatment('ALL');
                } catch (error) {
                    console.error(error);
                    Swal.fire('Error', 'Hubo un problema actualizando los cristales.', 'error');
                } finally {
                    setLoading(false);
                }
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-gray-50 border-b px-6 py-4 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <AlertTriangle className="text-cyan-600" size={24} />
                        Actualización Masiva de Precios
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100">
                    <button
                        className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'PRODUCTS' ? 'border-cyan-600 text-cyan-700 bg-cyan-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('PRODUCTS')}
                    >
                        PRODUCTOS (Por Marca)
                    </button>
                    <button
                        className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'CRYSTALS' ? 'border-cyan-600 text-cyan-700 bg-cyan-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('CRYSTALS')}
                    >
                        CRISTALES (Por Mat/Trat)
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto">

                    {activeTab === 'PRODUCTS' ? (
                        <div className="space-y-4 animate-fade-in">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Marca</label>
                                <div className="relative">
                                    <select
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all appearance-none bg-white"
                                        value={selectedBrand}
                                        onChange={(e) => setSelectedBrand(e.target.value)}
                                    >
                                        <option value="">Selecciona una marca...</option>
                                        {brands.map(b => (
                                            <option key={b.marca_id} value={b.marca_id}>{b.nombre}</option>
                                        ))}
                                    </select>
                                    <Tag className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={16} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fade-in">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
                                    <select
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                                        value={selectedMaterial}
                                        onChange={(e) => setSelectedMaterial(e.target.value)}
                                    >
                                        <option value="ALL">Todos (ALL)</option>
                                        {materials.map(m => (
                                            <option key={m.material_id} value={m.nombre}>{m.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tratamiento</label>
                                    <select
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                                        value={selectedTreatment}
                                        onChange={(e) => setSelectedTreatment(e.target.value)}
                                    >
                                        <option value="ALL">Todos (ALL)</option>
                                        {treatments.map(t => (
                                            <option key={t.tratamiento_id} value={t.nombre}>{t.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <label className="block text-sm font-bold text-gray-700 mb-1">Porcentaje de Ajuste (%)</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                step="0.01"
                                className="flex-1 text-lg font-bold border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none"
                                placeholder="0.00"
                                value={percentage}
                                onChange={(e) => setPercentage(e.target.value)}
                            />
                            <span className="text-gray-500 text-sm max-w-[150px] leading-tight">
                                Use valores negativos para descuentos (ej: -10)
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-lg hover:shadow-lg hover:to-blue-500 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Procesando...' : (
                            <>
                                <CheckCircle size={18} />
                                Aplicar Actualización
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
