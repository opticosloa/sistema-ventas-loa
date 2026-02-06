import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { Upload, Save, AlertTriangle, FileSpreadsheet, ArrowLeft, Store } from 'lucide-react';
import { getBrands } from '../../../services/brands.api';
import type { Brand } from '../../../services/brands.api';
import { bulkUpsertProducts } from '../../../services/products.api';
import { IMPORT_PRESETS, PRODUCT_CATEGORIES } from './types';
import type { BulkImportConfig, ParsedProduct } from './types';
import { useBranch } from '../../../context/BranchContext'; // Hook for branches
import { X } from 'lucide-react';

interface BulkProductImporterProps {
    onClose?: () => void;
}

export const BulkProductImporter: React.FC<BulkProductImporterProps> = ({ onClose }) => {
    const { branches } = useBranch();
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

    // Stock Matrix "Apply All" State
    // keys: sucursal_id, value: amount
    const [stockDefaults, setStockDefaults] = useState<Record<string, string>>({});

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

            // Read as Objects (Headers = Keys)
            const data = XLSX.utils.sheet_to_json(ws) as any[];
            processData(data);
        };
        reader.readAsBinaryString(file);
    };

    const processData = (rawData: any[]) => {
        // Advanced Mapping Logic
        // Expected Headers: Rubro, Descripcion, Codigo, Precio, Sugerido

        const products = rawData.map((row: any, index: number) => {
            // 1. Name Generation: Rubro + Descripcion + Clean
            const rubro = row['Rubro'] || '';
            const desc = row['Descripcion'] || '';
            const rawName = `${rubro} ${desc}`;
            const cleanName = rawName.toUpperCase().trim().replace(/\s+/g, ' ');

            if (!cleanName) return null;

            // 2. Map other fields
            const codigo = row['Codigo'] ? String(row['Codigo']).trim() : ''; // Internal
            const precio = Math.ceil(Number(row['Precio']) || 0); // Costo (Rounded up)
            const sugerido = Math.ceil(Number(row['Sugerido']) || 0); // Venta (Rounded up)

            // 3. Initialize Stock Distribution (ALL Active Branches with 0)
            const initialStockDist = branches.map(b => ({
                sucursal_id: b.sucursal_id!,
                cantidad: 0
            }));

            return {
                id: `row-${index}`,
                nombre: cleanName,
                descripcion: codigo, // "Interna" = Codigo
                precio_costo: precio,
                precio_venta: sugerido,
                stock_distribution: initialStockDist,
                originalData: row,
                selected: true
            };
        }).filter((item) => item !== null) as ParsedProduct[];

        if (products.length === 0) {
            Swal.fire('Atención', 'No se encontraron productos válidos. Verifique las columnas (Rubro, Descripcion, Codigo, Precio, Sugerido).', 'warning');
            return;
        }

        setParsedProducts(products);
        setStep(2);
    };

    const handleBulkApply = (field: 'precio_costo' | 'precio_venta', value: number) => {
        setParsedProducts(prev => prev.map(p => ({
            ...p,
            [field]: value
        })));
        Swal.fire({
            toast: true, title: 'Precios actualizados', icon: 'success',
            position: 'top-end', showConfirmButton: false, timer: 1500
        });
    };

    // Apply Stock Default to ALL rows for a specific branch
    const handleApplyStockDefault = (sucursalId: string, value: string) => {
        const qty = parseInt(value) || 0;
        setStockDefaults(prev => ({ ...prev, [sucursalId]: value }));

        setParsedProducts(prev => prev.map(p => ({
            ...p,
            stock_distribution: p.stock_distribution.map(s =>
                s.sucursal_id === sucursalId ? { ...s, cantidad: qty } : s
            )
        })));
    };

    const handleRowChange = (id: string, field: string, value: any) => {
        setParsedProducts(prev => prev.map(p =>
            p.id === id ? { ...p, [field]: value } : p
        ));
    };

    const handleStockChange = (productId: string, sucursalId: string, value: string) => {
        const qty = parseInt(value) || 0;
        setParsedProducts(prev => prev.map(p => {
            if (p.id !== productId) return p;
            return {
                ...p,
                stock_distribution: p.stock_distribution.map(s =>
                    s.sucursal_id === sucursalId ? { ...s, cantidad: qty } : s
                )
            };
        }));
    };

    const handleConfirmImport = async () => {
        if (!config.marcaId) {
            Swal.fire('Error', 'Debe seleccionar una Marca', 'error');
            return;
        }

        const result = await Swal.fire({
            title: '¿Confirmar Importación?',
            text: `Se procesarán ${parsedProducts.length} productos. Se usarán los nombres generados (Rubro+Desc) y la distribución de stock indicada.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, Importar',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;

        setIsProcessing(true);
        try {
            // Transform to backend format
            // SP expects: { nombre, descripcion, tipo, marca_id, precio_costo, precio_venta, stock_distribution }
            const payload = parsedProducts.map(p => ({
                nombre: p.nombre,
                descripcion: p.descripcion, // Internal Code
                tipo: config.categoryId,
                marca_id: config.marcaId,
                precio_costo: p.precio_costo,
                precio_venta: p.precio_venta,
                stock_distribution: p.stock_distribution, // Array [{ sucursal_id, cantidad }]
                // Other defaults passed but might be ignored by new Master SP or handled
                iva: config.defaultIva,
                is_active: true
            }));

            const response = await bulkUpsertProducts(payload);

            if (response.success) {
                Swal.fire(
                    'Éxito',
                    `Importación completada.\n${response.message || ''}\nCreados: ${response.created}\nActualizados: ${response.updated}`,
                    'success'
                );
                setStep(1);
                setParsedProducts([]);
                setStockDefaults({});
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
                <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded border border-blue-200">
                    <strong>Nota:</strong> El archivo Excel debe tener las columnas:
                    <ul className="list-disc ml-5 mt-1">
                        <li><b>Rubro</b> y <b>Descripcion</b> (Se unen para el Nombre)</li>
                        <li><b>Codigo</b> (Se usa como descripción interna)</li>
                        <li><b>Precio</b> (Costo) y <b>Sugerido</b> (Venta)</li>
                    </ul>
                </div>

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
                        <span className="text-sm text-gray-400 mt-1">Requiere columnas con nombres específicos</span>
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
                    Paso 2: Revisión y Matriz de Stock
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
                        {isProcessing ? 'Procesando...' : 'Confirmar Todo'}
                        {!isProcessing && <Save className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Bulk Edit Toolbar */}
            <div className="bg-slate-50 p-4 rounded-lg mb-4 border border-slate-200 flex flex-wrap gap-4 items-end">
                <div className="text-sm font-medium text-slate-700 mr-2 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Edición Masiva Precios:
                </div>
                <div>
                    <label className="block text-xs text-gray-500">Costo</label>
                    <div className="flex">
                        <input type="number" className="w-20 border rounded-l p-1 text-sm" placeholder="0"
                            value={bulkCost} onChange={e => setBulkCost(e.target.value)} />
                        <button onClick={() => handleBulkApply('precio_costo', Number(bulkCost))}
                            className="bg-slate-200 hover:bg-slate-300 px-2 rounded-r border text-xs font-semibold">Aplicar</button>
                    </div>
                </div>
                <div>
                    <label className="block text-xs text-gray-500">Venta</label>
                    <div className="flex">
                        <input type="number" className="w-20 border rounded-l p-1 text-sm" placeholder="0"
                            value={bulkPrice} onChange={e => setBulkPrice(e.target.value)} />
                        <button onClick={() => handleBulkApply('precio_venta', Number(bulkPrice))}
                            className="bg-slate-200 hover:bg-slate-300 px-2 rounded-r border text-xs font-semibold">Aplicar</button>
                    </div>
                </div>
                <div className="ml-auto text-sm text-gray-600">Total: <b>{parsedProducts.length}</b></div>
            </div>

            {/* Data Table */}
            <div className="flex-1 overflow-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-64">Producto (Generado)</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-32">Costo ($)</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-32">Venta ($)</th>

                            {/* Dynamic Branch Columns */}
                            {branches.map(b => (
                                <th key={b.sucursal_id} className="px-2 py-2 text-center text-xs font-bold text-blue-800 bg-blue-50 border-l border-blue-200 w-24">
                                    <div className="flex flex-col gap-1 items-center">
                                        <div className="truncate max-w-[100px]" title={b.nombre}>{b.nombre}</div>
                                        <input
                                            type="number"
                                            placeholder="Todos"
                                            className="w-16 h-6 text-xs text-center border border-blue-300 rounded focus:ring-1 focus:ring-blue-500"
                                            value={stockDefaults[b.sucursal_id!] || ''}
                                            onChange={(e) => handleApplyStockDefault(b.sucursal_id!, e.target.value)}
                                        />
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {parsedProducts.map((product) => (
                            <tr key={product.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-sm text-gray-900">
                                    <div className="font-semibold">{product.nombre}</div>
                                    <div className="text-xs text-gray-500">Cod: {product.descripcion}</div>
                                </td>
                                <td className="px-3 py-2">
                                    <input type="number" className="w-full border rounded p-1 text-sm text-right"
                                        value={product.precio_costo}
                                        onChange={(e) => handleRowChange(product.id, 'precio_costo', Number(e.target.value))} />
                                </td>
                                <td className="px-3 py-2">
                                    <input type="number" className="w-full border rounded p-1 text-sm text-right font-bold text-gray-700"
                                        value={product.precio_venta}
                                        onChange={(e) => handleRowChange(product.id, 'precio_venta', Number(e.target.value))} />
                                </td>

                                {/* Stock Cells */}
                                {branches.map(b => {
                                    // Find stock for this branch
                                    const stockVal = product.stock_distribution.find(s => s.sucursal_id === b.sucursal_id)?.cantidad || 0;
                                    return (
                                        <td key={b.sucursal_id} className="px-2 py-2 border-l border-gray-100 text-center">
                                            <input
                                                type="number"
                                                className={`w-16 h-8 border rounded text-center text-sm focus:ring-1 focus:ring-blue-500 ${stockVal > 0 ? 'bg-green-50 font-bold text-green-700 border-green-200' : 'text-gray-400'}`}
                                                value={stockVal}
                                                onChange={(e) => handleStockChange(product.id, b.sucursal_id!, e.target.value)}
                                            />
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Store className="text-purple-600" /> Importación Masiva & Stock
                </h1>
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
