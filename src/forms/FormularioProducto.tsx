import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../hooks';
import Swal from 'sweetalert2';
import { Search, X, Plus, Store, Scan } from 'lucide-react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import LOAApi from '../api/LOAApi';
import type { Brand } from '../types/Marcas';
import { BrandCreateModal } from './components/modals/BrandCreateModal';
import { QRScanner } from './components/QRScanner';
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
    is_active: true,
    iva: 21
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

    // Product ABM State
    const [editMode, setEditMode] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [productResults, setProductResults] = useState<any[]>([]);
    const [showProductResults, setShowProductResults] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    // Refs
    const searchTimeout = useRef<any>(null);
    const productSearchTimeout = useRef<any>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const productSearchWrapperRef = useRef<HTMLDivElement>(null);
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

    // 2. Close brand and product dropdowns on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowBrandResults(false);
            }
            if (productSearchWrapperRef.current && !productSearchWrapperRef.current.contains(event.target as Node)) {
                setShowProductResults(false);
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
            // ARS Rounded UP to integer
            setValue('precio_venta_ars', Math.ceil(val * dolarRate), { shouldValidate: true });
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
        // Enforce Integer on Input
        const rawVal = e.target.value === '' ? undefined : parseFloat(e.target.value);
        const val = rawVal !== undefined ? Math.ceil(rawVal) : undefined;

        setValue('precio_venta_ars', val, { shouldValidate: true });

        if (val !== undefined && !isNaN(val) && dolarRate > 0) {
            // USD keeps decimals
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

        setSelectedBranches(prev => ({
            ...prev,
            [branchId]: true
        }));
    };

    // --- Product Search & Selection Handling ---

    const handleProductSearch = (term: string) => {
        setProductSearchTerm(term);
        if (productSearchTimeout.current) clearTimeout(productSearchTimeout.current);

        if (term.length < 2) {
            setProductResults([]);
            setShowProductResults(false);
            if (term.length === 0) {
                resetFormMode(); // Reset if cleared
            }
            return;
        }

        setShowProductResults(true);
        productSearchTimeout.current = setTimeout(async () => {
            try {
                // Using api/products/search/:search
                const { data } = await LOAApi.get(`/api/products/search/${term}`);
                console.log(data);
                setProductResults(data.result || []);
            } catch (err) {
                console.error("Error searching products", err);
                setProductResults([]);
            }
        }, 300);
    };

    const resetFormMode = () => {
        reset(initialValues);
        setEditMode(false);
        setSelectedProductId(null);
        setProductSearchTerm('');
        setStockDistribution({});
        setSelectedBranches({});
        clearBrandSelection();
        setProductResults([]);
        setShowProductResults(false);
    };

    const selectProduct = async (product: any) => {
        setEditMode(true);
        setSelectedProductId(product.producto_id);
        setProductSearchTerm(product.nombre);
        setShowProductResults(false);

        // Populate Form
        setValue('nombre', product.nombre);
        setValue('descripcion', product.descripcion || '');
        setValue('tipo', product.tipo);
        setValue('marca_id', product.marca_id || '');
        setBrandSearchTerm(product.marca || '');
        setValue('precio_costo', product.precio_costo);
        setValue('precio_usd', product.precio_usd);
        setValue('precio_venta_ars', product.precio_venta); // Assuming price_venta is ARS in DB
        setValue('stock_minimo', product.stock_minimo);
        setValue('ubicacion', product.ubicacion || '');
        setValue('is_active', product.is_active || true);
        setValue('iva', product.iva || 21);

        // Handle Brand Visuals if brand is present
        // We'd need the brand name. The search result usually sends raw data. 
        // If the search result has 'marca', use it. Else we might need to fetch or leave it blank (it will be valid via marca_id).
        // Assuming search/getById returns `marca` name if available or we can fetch it.
        // For now, if generic search returns just IDs, visual lookup might be missing unless we fetch details.
        // Let's assume we do a fresh fetchById to be safe or rely on what we have.
        // Ideally, fetch FULL details including stock now.

        try {
            // Fetch Stock Distribution
            const stockRes = await LOAApi.get(`/api/products/${product.producto_id}/stock-details`);
            const stockData = stockRes.data.result || [];

            const newDist: Record<string, number> = {};
            const newSelected: Record<string, boolean> = {};

            stockData.forEach((item: any) => {
                const qty = Number(item.cantidad);
                if (qty > 0) {
                    newDist[item.sucursal_id] = qty;
                    newSelected[item.sucursal_id] = true;
                }
            });

            // Also enable current branch if not in list? No, just show what has stock.
            // If user wants to add stock to a new branch, they check the box.

            // Just pre-fill with DB data. 
            // Note: If a branch has 0 stock, we might not get it back or it might be 0.
            // We'll trust the stored procedure.

            setStockDistribution(newDist);
            setSelectedBranches(newSelected); // Or maybe Select ALL branches so user sees 0s? 
            // Better: Select branches capable of having stock (all). 
            // But let's stick to "Show what has stock" + "User can add others".
            // To make it easier, let's auto-select all branches so they can see "0" vs "undefined"?
            // User requirement: "Mostrar en el input de cada sucursal la cantidad de stock actual".
            // So we should probably default to 0 for all branches if not present.

            const allBranchesSelected: Record<string, boolean> = {};
            branches.forEach(b => {
                allBranchesSelected[b.sucursal_id!] = true;
                if (newDist[b.sucursal_id!] === undefined) newDist[b.sucursal_id!] = 0;
            });
            setSelectedBranches(allBranchesSelected);
            setStockDistribution(newDist);

        } catch (e) {
            console.error("Error fetching stock params", e);
        }
    };

    const handleScanSuccess = async (decodedText: string) => {
        setIsScannerOpen(false);
        // Assume decodedText is product ID or Barcode.
        // Try to fetch product by ID first, or search by query.
        try {
            // First try getById (in case QR is ID)
            const { data } = await LOAApi.get(`/api/products/${decodedText}`);
            if (data.success && data.result) {
                selectProduct(data.result);
                Swal.fire({
                    icon: 'success',
                    title: 'Producto Encontrado',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 1500
                });
                return;
            }
        } catch (e) {
            // If ID fail, try search string
            console.log("Not an ID, trying search...");
        }

        // Fallback search
        handleProductSearch(decodedText);
        setProductSearchTerm(decodedText);
    };

    const onSubmit: SubmitHandler<ProductFormData> = async (data) => {
        if (isSubmittingRef.current) return;

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

            // Prepare Stock Payload (Current values in inputs)

            // Requirement says "enviar el array de stocks con los valores absolutos". 
            // Safest is to iterate over selected or just all active branches.
            // Let's filter by selected check or just send all non-null.
            const distributionData = Object.entries(selectedBranches)
                .filter(([_, isSelected]) => isSelected)
                .map(([branchId, _]) => ({
                    sucursal_id: branchId,
                    cantidad: stockDistribution[branchId] || 0
                }));

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
                stock: 0, // Legacy
                // Include stock_por_sucursal for direct update if editing
                stock_por_sucursal: editMode ? distributionData : undefined
            };

            let response;
            if (editMode && selectedProductId) {
                // UPDATE
                response = await LOAApi.put(`/api/products/${selectedProductId}`, payload);
            } else {
                // CREATE
                response = await LOAApi.post<any>('/api/products', payload);
            }

            if (response.data.conflict) {
                Swal.fire({
                    title: "Producto Duplicado",
                    text: `Ya existe un producto con el nombre "${data.nombre}" y esa marca.`,
                    icon: "warning"
                });
                setLoading(false);
                return;
            }

            // For Create: Handle Stock Separately (Existing Logic)
            if (!editMode) {
                if (!response.data.result || !response.data.result.producto_id) {
                    throw new Error("Respuesta del servidor inválida");
                }
                const newProductId = response.data.result.producto_id;

                if (distributionData.length > 0) {
                    await LOAApi.post(`/api/products/${newProductId}/stock-distribution`, {
                        stock_data: distributionData
                    });
                }
            }

            Swal.fire("Éxito", editMode ? 'Producto actualizado correctamente' : 'Producto creado y stock distribuido correctamente', "success");

            // Reset
            resetFormMode();

        } catch (error) {
            console.error(error);
            Swal.fire("Error", 'Error al guardar producto', "error");
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto p-4 fade-in">
            <section className="bg-opacity-10 border border-blanco rounded-xl p-4">
                <div className="flex flex-col gap-4 mb-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-blanco text-2xl font-semibold">
                            {editMode ? 'Editar Producto / Stock' : 'Alta de Producto'}
                        </h2>
                        {role === 'SUPERADMIN' && !editMode && (
                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="px-4 py-1.5 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 shadow flex items-center gap-2"
                            >
                                <span>Importar (Excel)</span>
                            </button>
                        )}
                    </div>

                    {/* BUSCADOR INTEGRADO */}
                    <div className="relative w-full" ref={productSearchWrapperRef}>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                                <input
                                    className="w-full bg-slate-900 text-white rounded-lg py-2.5 pl-10 pr-10 border border-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none placeholder:text-gray-500"
                                    placeholder="Buscar producto por nombre para editar o ajustar stock..."
                                    value={productSearchTerm}
                                    onChange={(e) => handleProductSearch(e.target.value)}
                                // Disable typing if in edit mode? Maybe allow to search again to switch?
                                // User said: "Si se limpia el buscador: Resetear el formulario para permitir crear uno nuevo."
                                // So we allow typing always.
                                />
                                {productSearchTerm && (
                                    <button
                                        onClick={resetFormMode}
                                        className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
                                    >
                                        <X size={20} />
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => setIsScannerOpen(true)}
                                className="bg-slate-800 hover:bg-slate-700 text-white p-2.5 rounded-lg border border-slate-700"
                                title="Escanear QR"
                                type="button"
                            >
                                <Scan size={24} />
                            </button>
                        </div>

                        {/* Result Dropdown */}
                        {showProductResults && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 max-h-60 overflow-y-auto z-50">
                                {productResults.map((prod) => (
                                    <button
                                        key={prod.producto_id}
                                        type="button"
                                        onClick={() => selectProduct(prod)}
                                        className="w-full text-left px-4 py-3 hover:bg-cyan-50 border-b border-gray-100 last:border-0 text-slate-800 flex justify-between items-center"
                                    >
                                        <div>
                                            <span className="font-semibold block">{prod.nombre}</span>
                                            <span className="text-xs text-gray-500">{prod.marca || 'Sin marca'} | {prod.tipo}</span>
                                        </div>
                                        <span className="text-sm font-bold text-cyan-700">
                                            ${prod.precio_usd || prod.precio_venta || 0}
                                        </span>
                                    </button>
                                ))}
                                {productResults.length === 0 && (
                                    <div className="p-4 text-center text-gray-500">
                                        No se encontraron productos
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
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
                            step="1" // Integers only visual hint
                            {...register('precio_costo', {
                                valueAsNumber: true,
                                onChange: (e) => {
                                    const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                    if (val !== undefined) {
                                        setValue('precio_costo', Math.ceil(val), { shouldValidate: true });
                                    }
                                }
                            })}
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
                    <div className={`md:col-span-2 p-4 rounded-lg border mt-2 ${editMode ? 'bg-cyan-900/10 border-cyan-500/30' : 'bg-slate-800/50 border-slate-700'}`}>
                        <label className={`text-sm font-semibold flex items-center gap-2 mb-3 ${editMode ? 'text-cyan-400' : 'text-white'}`}>
                            <Store size={18} className={editMode ? "text-cyan-400" : "text-cyan-400"} />
                            {editMode ? 'Gestión de Stock (Edición Directa)' : 'Distribuir Stock Inicial'}
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
                        <p className="text-xs text-slate-400 mt-2">
                            {editMode
                                ? "Modifique los valores para actualizar el stock real de cada sucursal."
                                : "Seleccione las sucursales donde desea inicializar stock."}
                        </p>
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
                            {loading ? 'Guardando...' : (editMode ? 'Guardar Cambios' : 'Crear Producto')}
                        </button>
                    </div>
                </form>

                <BrandCreateModal
                    isOpen={isBrandModalOpen}
                    onClose={() => setIsBrandModalOpen(false)}
                    onSuccess={handleBrandCreateSuccess}
                    initialName={brandSearchTerm}
                />

                {/* Scanner Modal */}
                {isScannerOpen && (
                    <QRScanner
                        onScanSuccess={handleScanSuccess}
                        onClose={() => setIsScannerOpen(false)}
                    />
                )}

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
