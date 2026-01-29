import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../hooks';
import Swal from 'sweetalert2';
import { Search, X, Plus, Store } from 'lucide-react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import LOAApi from '../api/LOAApi';
import type { Brand } from '../types/Marcas';
import { BrandCreateModal } from './components/modals/BrandCreateModal';
import { BulkProductImporter } from '../ventas/components/BulkProductImporter/BulkProductImporter';
import { useBranch } from '../context/BranchContext';

// --- Zod Schema ---
const productSchema = z.object({
    nombre: z.string().min(1, "El nombre es obligatorio"),
    descripcion: z.string().optional(),
    tipo: z.enum(['ARMAZON', 'CRISTAL', 'ACCESORIO', 'ANTEOJO_SOL']),
    marca_id: z.string().min(1, "La marca es obligatoria"),
    precio_costo: z.number().optional(),
    precio_usd: z.number().optional(),
    precio_venta_ars: z.number().optional(),
    // Stock removido de aquí, se maneja separado
    stock_minimo: z.number().optional(),
    ubicacion: z.string().optional(),
    is_active: z.boolean(),
    iva: z.number().optional()
}).superRefine((data, ctx) => {
    // Validation Logic: Must have at least one price > 0
    const hasUsd = data.precio_usd !== undefined && data.precio_usd > 0;
    const hasArs = data.precio_venta_ars !== undefined && data.precio_venta_ars > 0;

    if (!hasUsd && !hasArs) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Debe ingresar al menos un precio (USD o ARS)",
            path: ["precio_usd"]
        });
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Debe ingresar al menos un precio (USD o ARS)",
            path: ["precio_venta_ars"]
        });
    }
});

type ProductFormData = z.infer<typeof productSchema>;

const initialValues: ProductFormData = {
    nombre: '',
    descripcion: '',
    tipo: 'ARMAZON',
    marca_id: '',
    precio_costo: undefined,
    precio_usd: undefined,
    precio_venta_ars: undefined,
    stock_minimo: 0,
    ubicacion: '',
    is_active: true
};

export const FormularioProducto: React.FC = () => {
    const { role } = useAuthStore();
    const { branches, refreshBranches } = useBranch();

    // React Hook Form
    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors }
    } = useForm<ProductFormData>({
        resolver: zodResolver(productSchema),
        defaultValues: initialValues
    });

    const [loading, setLoading] = useState(false);
    const [dolarRate, setDolarRate] = useState<number>(0);

    // Brand Autocomplete State
    const [brandSearchTerm, setBrandSearchTerm] = useState('');
    const [brandResults, setBrandResults] = useState<Brand[]>([]);
    const [showBrandResults, setShowBrandResults] = useState(false);
    const [isSearchingBrand, setIsSearchingBrand] = useState(false);
    const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Stock Distribution State
    // Format: { [sucursalId]: quantity }
    const [stockDistribution, setStockDistribution] = useState<Record<string, number>>({});
    const [selectedBranches, setSelectedBranches] = useState<Record<string, boolean>>({});


    // Refs
    const searchTimeout = useRef<any>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const isSubmittingRef = useRef(false);

    // --- Effects ---

    // 1. Fetch Dolar Rate & Ensure Branches
    useEffect(() => {
        const fetchRate = async () => {
            try {
                const { data } = await LOAApi.get('/api/currency/rate');
                setDolarRate(data.result?.rate || 0);
            } catch (error) {
                console.error("Error fetching dolar rate", error);
            }
        };
        fetchRate();

        // Ensure branches are loaded
        if (branches.length === 0) {
            refreshBranches();
        }
    }, [branches.length, refreshBranches]); // Removed branches.length to avoid infinite loop if simple check, but refreshBranches should be stable.

    // 2. Close brand dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowBrandResults(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- Handlers ---

    const handleUsdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
        setValue('precio_usd', val, { shouldValidate: true });

        if (val !== undefined && !isNaN(val) && dolarRate > 0) {
            setValue('precio_venta_ars', parseFloat((val * dolarRate).toFixed(2)), { shouldValidate: true });
        }
    };

    const handleIVAChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
        setValue('iva', val, { shouldValidate: false });

        if (val !== undefined && !isNaN(val) && dolarRate > 0) {
            setValue('precio_venta_ars', parseFloat((val * dolarRate).toFixed(2)), { shouldValidate: true });
        }
    };

    const handleArsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
        setValue('precio_venta_ars', val, { shouldValidate: true });

        if (val !== undefined && !isNaN(val) && dolarRate > 0) {
            setValue('precio_usd', parseFloat((val / dolarRate).toFixed(2)), { shouldValidate: true });
        }
    };

    const handleBrandSearch = (term: string) => {
        setBrandSearchTerm(term);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        if (term.length < 1) {
            setBrandResults([]);
            setShowBrandResults(false);
            return;
        }

        setIsSearchingBrand(true);
        setShowBrandResults(true);

        searchTimeout.current = setTimeout(async () => {
            try {
                const { data } = await LOAApi.get(`/api/brands/search?q=${term}`);
                setBrandResults(data.result || []);
            } catch (err) {
                console.error("Error searching brands", err);
                setBrandResults([]);
            } finally {
                setIsSearchingBrand(false);
            }
        }, 300);
    };

    const selectBrand = (brand: Brand) => {
        setValue('marca_id', brand.marca_id, { shouldValidate: true });
        setBrandSearchTerm(brand.nombre);
        setShowBrandResults(false);
    };

    const clearBrandSelection = () => {
        setValue('marca_id', '', { shouldValidate: true });
        setBrandSearchTerm('');
    };

    const handleBrandCreateSuccess = (newBrand: Brand) => {
        selectBrand(newBrand);
        setIsBrandModalOpen(false);
    };

    // Stock Handlers
    const toggleBranch = (branchId: string) => {
        setSelectedBranches(prev => ({
            ...prev,
            [branchId]: !prev[branchId]
        }));
    };

    const handleBranchStockChange = (branchId: string, value: string) => {
        const qty = parseInt(value) || 0;
        setStockDistribution(prev => ({
            ...prev,
            [branchId]: qty
        }));
    };

    const onSubmit: SubmitHandler<ProductFormData> = async (data) => {
        if (isSubmittingRef.current) return;

        // 2. ACTIVAR BLOQUEO
        isSubmittingRef.current = true;
        setLoading(true);
        try {
            // Determine final USD Price
            let finalUsd = data.precio_usd;

            // If USD is missing/0 but we have ARS, try to convert
            if ((!finalUsd || finalUsd <= 0) && data.precio_venta_ars && data.precio_venta_ars > 0) {
                if (dolarRate > 0) {
                    finalUsd = data.precio_venta_ars / dolarRate;
                } else {
                    Swal.fire("Info", "No hay cotización del dólar configurada para realizar la conversión. Ingrese el precio en USD manualmente.", "info");
                    setLoading(false);
                    return;
                }
            }

            if (!finalUsd || finalUsd <= 0) {
                Swal.fire("Error", "El precio en USD no es válido.", "error");
                setLoading(false);
                return;
            }

            const payload = {
                nombre: data.nombre,
                descripcion: data.descripcion,
                tipo: data.tipo,
                marca_id: data.marca_id,
                precio_costo: data.precio_costo || 0,
                precio_usd: finalUsd,
                stock_minimo: data.stock_minimo || 0,
                ubicacion: data.ubicacion,
                is_active: data.is_active,
                // Legacy stock field might be required by backend validation if not updated yet? 
                // We send 0 or total? Sending 0 safe if we distribute separately.
                stock: 0
            };

            const response = await LOAApi.post<any>('/api/products', payload);

            // 2. VERIFICACIÓN DE CONFLICTO (DUPLICADO)
            if (response.data.conflict) {
                Swal.fire({
                    title: "Producto Duplicado",
                    text: `Ya existe un producto con el nombre "${data.nombre}" y esa marca.`,
                    icon: "warning"
                });
                setLoading(false);
                return; // Detenemos la ejecución aquí
            }
            // 3. EXTRACCIÓN DEL ID (Ahora es seguro)
            if (!response.data.result || !response.data.result.producto_id) {
                throw new Error("Respuesta del servidor inválida");
            }
            const newProductId = response.data.result.producto_id;

            // 2. Distribute Stock
            const distributionData = Object.entries(selectedBranches)
                .filter(([_, isSelected]) => isSelected)
                .map(([branchId, _]) => ({
                    sucursal_id: branchId,
                    cantidad: stockDistribution[branchId] || 0
                }))
                .filter(item => item.cantidad > 0);

            if (distributionData.length > 0) {
                await LOAApi.post(`/api/products/${newProductId}/stock-distribution`, {
                    stock_data: distributionData
                });
            }

            Swal.fire("Éxito", 'Producto creado y stock distribuido correctamente', "success");

            // Reset
            reset(initialValues);
            clearBrandSelection();
            setBrandSearchTerm('');
            setStockDistribution({});
            setSelectedBranches({});

        } catch (error) {
            console.error(error);
            Swal.fire("Error", 'Error al crear producto', "error");
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto p-4 fade-in">
            <section className="bg-opacity-10 border border-blanco rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-blanco text-2xl font-semibold">
                        Alta de Producto
                    </h2>
                    {role === 'SUPERADMIN' && (
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="px-4 py-1.5 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 shadow flex items-center gap-2"
                        >
                            <span>Importar (Excel)</span>
                        </button>
                    )}
                </div>

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                    {/* Nombre */}
                    <div className="md:col-span-2">
                        <label className="text-sm text-blanco">Nombre <span className="text-red-500">*</span></label>
                        <input
                            {...register('nombre')}
                            className={`input w-full bg-slate-50 text-slate-900 ${errors.nombre ? 'border-red-500' : ''}`}
                            placeholder="Nombre del producto"
                        />
                        {errors.nombre && (
                            <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>
                        )}
                    </div>

                    {/* Descripción */}
                    <div className="md:col-span-2">
                        <label className="text-sm text-blanco">Descripción</label>
                        <textarea
                            {...register('descripcion')}
                            rows={3}
                            className="input w-full bg-slate-50 text-slate-900"
                            placeholder="Detalles del producto"
                        />
                    </div>

                    {/* Tipo */}
                    <div>
                        <label className="text-sm text-blanco">Tipo <span className="text-red-500">*</span></label>
                        <select
                            {...register('tipo')}
                            className={`input w-full bg-slate-50 text-slate-900 ${errors.tipo ? 'border-red-500' : ''}`}
                        >
                            <option value="ARMAZON">Armazón</option>
                            <option value="ANTEOJO_SOL">Anteojo de Sol</option>
                            <option value="CRISTAL">Cristal</option>
                            <option value="ACCESORIO">Accesorio</option>
                        </select>
                        {errors.tipo && (
                            <p className="text-red-500 text-xs mt-1">{errors.tipo.message}</p>
                        )}
                    </div>

                    {/* Marca (Autocomplete) */}
                    <div className="relative" ref={wrapperRef}>
                        <label className="text-sm text-blanco mb-1 block">Marca <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <input
                                type="text"
                                value={brandSearchTerm}
                                onChange={(e) => handleBrandSearch(e.target.value)}
                                onFocus={() => brandSearchTerm && setShowBrandResults(true)}
                                className={`w-full bg-slate-50 text-slate-900 rounded-lg py-2 pl-9 pr-10 border-none focus:ring-2 focus:ring-cyan-500 ${errors.marca_id ? 'border border-red-500 ' : ''}`}
                                placeholder="Buscar marca..."
                            />
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />

                            {isSearchingBrand ? (
                                <div className="absolute right-3 top-2.5 w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : watch('marca_id') ? (
                                <button
                                    type="button"
                                    onClick={clearBrandSelection}
                                    className="absolute right-3 top-2.5 text-green-600 hover:text-red-500 transition-colors"
                                    title="Desvincular marca"
                                >
                                    <X size={16} />
                                </button>
                            ) : null}
                        </div>
                        {errors.marca_id && (
                            <p className="text-red-500 text-xs mt-1">{errors.marca_id.message}</p>
                        )}

                        {/* Dropdown Results */}
                        {showBrandResults && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 max-h-60 overflow-y-auto z-50">
                                {brandResults.length > 0 ? (
                                    brandResults.map((brand) => (
                                        <button
                                            key={brand.marca_id}
                                            type="button"
                                            onClick={() => selectBrand(brand)}
                                            className="w-full text-left px-4 py-2 hover:bg-cyan-50 border-b border-gray-100 last:border-0 text-slate-800"
                                        >
                                            {brand.nombre}
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-3 text-center">
                                        <p className="text-xs text-gray-500 mb-2">No encontrado</p>
                                        <button
                                            type="button"
                                            onClick={() => { setShowBrandResults(false); setIsBrandModalOpen(true); }}
                                            className="text-sm text-cyan-600 font-bold hover:underline flex items-center justify-center gap-1 mx-auto"
                                        >
                                            <Plus size={14} /> Nueva Marca
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Hidden Input for RHF registration of marca_id */}
                        <input type="hidden" {...register('marca_id')} />
                    </div>

                    {/* Ubicación */}
                    <div>
                        <label className="text-sm text-blanco">Ubicación</label>
                        <input
                            {...register('ubicacion')}
                            className="input w-full bg-slate-50 text-slate-900"
                            placeholder="Ej: A1"
                        />
                    </div>

                    {/* Precio Costo */}
                    <div>
                        <label className="text-sm text-blanco">Precio Costo <span className="text-red-500">*</span></label>
                        <input
                            type="number"
                            step="0.01"
                            {...register('precio_costo', { valueAsNumber: true })}
                            className="input w-full bg-slate-50 text-slate-900"
                        />
                    </div>

                    {/* Precios: USD (Principal) y ARS (Calculado) */}
                    <div>
                        <label className="text-sm text-blanco">Precio Venta (USD)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                            <input
                                type="number"
                                step="0.01"
                                {...register('precio_usd', { valueAsNumber: true, onChange: handleUsdChange })}
                                className={`input w-full bg-slate-50 text-slate-900 pl-7 ${errors.precio_usd ? 'border-red-500' : ''}`}
                            />
                        </div>
                        {errors.precio_usd && (
                            <p className="text-red-500 text-xs mt-1">{errors.precio_usd.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="text-sm text-blanco">Precio Venta (ARS)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                            <input
                                type="number"
                                step="0.01"
                                {...register('precio_venta_ars', { valueAsNumber: true, onChange: handleArsChange })}
                                className={`input w-full bg-slate-50 text-slate-900 pl-7 ${errors.precio_venta_ars ? 'border-red-500' : ''}`}
                            />
                        </div>
                        {errors.precio_venta_ars && (
                            <p className="text-red-500 text-xs mt-1">{errors.precio_venta_ars.message}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">Cotización: {dolarRate > 0 ? `$${dolarRate}` : 'No definida'}</p>
                    </div>

                    {/* Stock Multi-Branch Section */}
                    <div className="md:col-span-2 bg-slate-800/50 p-4 rounded-lg border border-slate-700 mt-2">
                        <label className="text-sm text-white font-semibold flex items-center gap-2 mb-3">
                            <Store size={18} className="text-cyan-400" />
                            Distribuir Stock Inicial
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {branches.map(branch => {
                                const isSelected = selectedBranches[branch.sucursal_id!] || false;
                                return (
                                    <div key={branch.sucursal_id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${isSelected ? 'bg-cyan-900/20 border-cyan-500/50' : 'bg-slate-900/50 border-slate-700'}`}>
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleBranch(branch.sucursal_id!)}
                                            className="w-5 h-5 accent-cyan-500"
                                        />
                                        <div className="flex-1">
                                            <span className="text-sm text-white block">{branch.nombre}</span>
                                        </div>
                                        {isSelected && (
                                            <input
                                                type="number"
                                                min="0"
                                                value={stockDistribution[branch.sucursal_id!] || 0}
                                                onChange={(e) => handleBranchStockChange(branch.sucursal_id!, e.target.value)}
                                                className="w-20 input h-8 text-center text-sm p-1"
                                                placeholder="Cant."
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Seleccione las sucursales donde desea inicializar stock.</p>
                    </div>

                    <div>
                        <label className="text-sm text-blanco">Stock Mínimo</label>
                        <input
                            type="number"
                            {...register('stock_minimo', { valueAsNumber: true })}
                            className="input w-full bg-slate-50 text-slate-900"
                        />
                    </div>

                    {/* Activo */}
                    <div className="flex items-center gap-2 mt-2">
                        <input
                            type="checkbox"
                            {...register('is_active')}
                            className="accent-celeste w-5 h-5"
                        />
                        <span className="text-blanco">Producto activo</span>
                    </div>

                    <div>
                        <label className="text-sm text-blanco">IVA aplicable</label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.01"
                                {...register('iva', { valueAsNumber: true, onChange: handleIVAChange })}
                                className={`input w-full bg-slate-50 text-slate-900 pl-7 ${errors.iva ? 'border-red-500' : ''}`}
                            />
                        </div>
                        {errors.iva && (
                            <p className="text-red-500 text-xs mt-1">{errors.iva.message}</p>
                        )}
                    </div>

                    {/* Submit */}
                    <div className="md:col-span-2 flex justify-end mt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary"
                        >
                            {loading ? 'Guardando...' : 'Crear Producto'}
                        </button>
                    </div>
                </form>

                <BrandCreateModal
                    isOpen={isBrandModalOpen}
                    onClose={() => setIsBrandModalOpen(false)}
                    onSuccess={handleBrandCreateSuccess}
                    initialName={brandSearchTerm}
                />

                {/* Import Modal */}
                {isImportModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="w-full max-w-5xl relative animate-in fade-in zoom-in duration-300">
                            {/* The content is handled by BulkProductImporter which now has local bg-white */}
                            <BulkProductImporter onClose={() => setIsImportModalOpen(false)} />
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
};
