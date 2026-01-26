import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { Upload, Save, AlertTriangle, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { getBrands } from '../../../services/brands.api';
import type { Brand } from '../../../services/brands.api';
import { bulkUpsertProducts } from '../../../services/products.api';
import { IMPORT_PRESETS, PRODUCT_CATEGORIES } from './types';
import type { BulkImportConfig, ParsedProduct } from './types';

import { X } from 'lucide-react';

interface BulkProductImporterProps {
    onClose?: () => void;
}

export const BulkProductImporter: React.FC<BulkProductImporterProps> = ({ onClose }) => {
    const [step, setStep] = useState<number>(1);
    const [config, setConfig] = useState<BulkImportConfig>({
        presetId: IMPORT_PRESETS[0].id,
        marcaId: '',
        stock: 0,
        categoryId: 'ARMAZON',
        defaultIva: 21,
    });
    const [brands, setBrands] = useState<Brand[]>([]);
    const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Bulk Edit States
    const [bulkPrice, setBulkPrice] = useState<string>('');
    const [bulkCost, setBulkCost] = useState<string>('');

    useEffect(() => {
        loadBrands();
    }, []);

    const loadBrands = async () => {
        try {
            const data = await getBrands();
            setBrands(data || []);
        } catch (error) {
            console.error('Error loading brands', error);
            Swal.fire('Error', 'No se pudieron cargar las marcas', 'error');
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            // Read as array of arrays
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

            processData(data);
        };
        reader.readAsBinaryString(file);
    };

    const processData = (rawData: any[][]) => {
        const preset = IMPORT_PRESETS.find(p => p.id === config.presetId);
        if (!preset) return;

        // Skip rows
        const slicedData = rawData.slice(preset.skipRows);

        const products = slicedData.map((row: any[], index: number) => {
            const name = preset.transformFn(row);
            if (!name) return null; // Skip empty names

            return {
                id: `row-${index}`,
                nombre: name,
                precio_costo: 0,
                precio_venta: 0,
                precio_sugerido: 0,
                originalData: row,
                selected: true
            };
        }).filter((item) => item !== null) as ParsedProduct[];

        if (products.length === 0) {
            Swal.fire('Atención', 'No se encontraron productos válidos o el archivo está vacío.', 'warning');
            return;
        }

        setParsedProducts(products);
        setStep(2);
    };

    const handleBulkApply = (field: 'precio_costo' | 'precio_venta' | 'precio_sugerido', value: number) => {
        setParsedProducts(prev => prev.map(p => ({
            ...p,
            [field]: value
        })));
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Precios actualizados',
            showConfirmButton: false,
            timer: 1500
        });
    };

    const handleRowChange = (id: string, field: string, value: any) => {
        setParsedProducts(prev => prev.map(p =>
            p.id === id ? { ...p, [field]: value } : p
        ));
    };

    const handleConfirmImport = async () => {
        if (!config.marcaId) {
            Swal.fire('Error', 'Debe seleccionar una Marca', 'error');
            return;
        }

        const result = await Swal.fire({
            title: '¿Confirmar Importación?',
            text: `Se procesarán ${parsedProducts.length} registros. Esta acción actualizará precios si existen y creará nuevos si no.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, Importar',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;

        setIsProcessing(true);
        try {
            // Transform to backend format
            const payload = parsedProducts.map(p => ({
                nombre: p.nombre,
                marca_id: config.marcaId,
                tipo: config.categoryId,
                stock: config.stock,
                stock_minimo: 0, // Default
                precio_costo: p.precio_costo,
                precio_venta: p.precio_venta,
                precio_usd: 0,
                iva: config.defaultIva,
                descripcion: `Importado masivo ${new Date().toLocaleDateString()}`,
                is_active: true
            }));

            const response = await bulkUpsertProducts(payload);

            if (response.success) {
                Swal.fire(
                    'Éxito',
                    `Importación completada.\nCreados: ${response.created}\nActualizados: ${response.updated}`,
                    'success'
                );
                // Reset or redirect?
                setStep(1);
                setParsedProducts([]);
            }
        } catch (error: any) {
            console.error('Import Error', error);
            Swal.fire('Error', 'Falló la importación: ' + (error.response?.data?.error || error.message), 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    // --- RENDER STEPS ---

    const renderStep1 = () => (
        <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto border border-gray-600">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                Paso 1: Configuración de Carga
            </h2>

            <div className="space-y-4">
                {/* Preset */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Preset de Importación</label>
                    <select
                        className="mt-1 block w-full rounded-md border-gray-800 bg-crema shadow-sm border p-2"
                        value={config.presetId}
                        onChange={(e) => setConfig({ ...config, presetId: e.target.value })}
                    >
                        {IMPORT_PRESETS.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                {/* Global Settings Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Marca *</label>
                        <select
                            className="mt-1 block w-full rounded-md border-gray-800 bg-crema shadow-sm border p-2"
                            value={config.marcaId}
                            onChange={(e) => setConfig({ ...config, marcaId: e.target.value })}
                        >
                            <option value="">-- Seleccionar Marca --</option>
                            {brands.map(b => (
                                <option key={b.marca_id} value={b.marca_id}>{b.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Categoría *</label>
                        <select
                            className="mt-1 block w-full rounded-md border-gray-800 bg-crema shadow-sm border p-2"
                            value={config.categoryId}
                            onChange={(e) => setConfig({ ...config, categoryId: e.target.value })}
                        >
                            {PRODUCT_CATEGORIES.map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Stock Inicial</label>
                        <input
                            type="number"
                            className="mt-1 block w-full rounded-md border-gray-800 bg-crema shadow-sm border p-2"
                            value={config.stock}
                            onChange={(e) => setConfig({ ...config, stock: Number(e.target.value) })}
                        />
                    </div>
                </div>

                {/* File Upload */}
                <div className="mt-6 border-2 border-dashed border-gray-800 bg-crema rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
                    <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                        <Upload className="w-12 h-12 text-gray-400 mb-2" />
                        <span className="text-gray-600 font-medium">Click para subir archivo (Excel/CSV)</span>
                        <span className="text-sm text-gray-400 mt-1">Soporta .xlsx, .csv</span>
                    </label>
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="bg-white p-4 rounded-lg shadow-md h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <FileSpreadsheet className="w-6 h-6 text-green-600" />
                    Paso 2: Vista Previa y Precios
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setStep(1)}
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                    >
                        <ArrowLeft className="w-4 h-4" /> Volver
                    </button>
                    <button
                        onClick={handleConfirmImport}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isProcessing ? 'Procesando...' : 'Confirmar Importación'}
                        {!isProcessing && <Save className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Bulk Edit Toolbar */}
            <div className="bg-slate-50 p-4 rounded-lg mb-4 border border-slate-200 flex flex-wrap gap-4 items-end">
                <div className="text-sm font-medium text-slate-700 mr-2 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Edición Masiva:
                </div>

                <div>
                    <label className="block text-xs text-gray-500">Aplicar Costo</label>
                    <div className="flex">
                        <input
                            type="number"
                            className="w-24 border rounded-l p-1 text-sm"
                            placeholder="0"
                            value={bulkCost}
                            onChange={e => setBulkCost(e.target.value)}
                        />
                        <button
                            onClick={() => handleBulkApply('precio_costo', Number(bulkCost))}
                            className="bg-slate-200 hover:bg-slate-300 px-2 rounded-r border-t border-b border-r text-xs font-semibold"
                        >
                            Aplicar
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs text-gray-500">Aplicar Venta</label>
                    <div className="flex">
                        <input
                            type="number"
                            className="w-24 border rounded-l p-1 text-sm"
                            placeholder="0"
                            value={bulkPrice}
                            onChange={e => setBulkPrice(e.target.value)}
                        />
                        <button
                            onClick={() => handleBulkApply('precio_venta', Number(bulkPrice))}
                            className="bg-slate-200 hover:bg-slate-300 px-2 rounded-r border-t border-b border-r text-xs font-semibold"
                        >
                            Aplicar
                        </button>
                    </div>
                </div>

                <div className="ml-auto text-sm text-gray-600">
                    Total registros: <b>{parsedProducts.length}</b>
                </div>
            </div>

            {/* Data Table */}
            <div className="flex-1 overflow-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto (Generado)</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo ($)</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Venta ($)</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datos Originales (Ref)</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {parsedProducts.map((product) => (
                            <tr key={product.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-sm text-gray-900 font-medium">
                                    {product.nombre}
                                </td>
                                <td className="px-3 py-2">
                                    <input
                                        type="number"
                                        className="w-24 border rounded p-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={product.precio_costo}
                                        onChange={(e) => handleRowChange(product.id, 'precio_costo', Number(e.target.value))}
                                    />
                                </td>
                                <td className="px-3 py-2">
                                    <input
                                        type="number"
                                        className="w-24 border rounded p-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800"
                                        value={product.precio_venta}
                                        onChange={(e) => handleRowChange(product.id, 'precio_venta', Number(e.target.value))}
                                    />
                                </td>
                                <td className="px-3 py-2 text-xs text-gray-500 truncate max-w-xs">
                                    {product.originalData.slice(0, 3).join(' | ')}...
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-lg p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Importación Masiva</h1>
                {onClose && (
                    <button onClick={onClose} className="text-gray-500 hover:text-red-500 transition-colors">
                        <X size={24} />
                    </button>
                )}
            </div>
            {step === 1 ? renderStep1() : renderStep2()}
        </div>
    );
};
