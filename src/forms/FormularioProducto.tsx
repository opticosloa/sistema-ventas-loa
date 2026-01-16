import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Plus } from 'lucide-react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import LOAApi from '../api/LOAApi';
import type { Brand } from '../types/Marcas';
import { BrandCreateModal } from './components/modals/BrandCreateModal';

// --- Zod Schema ---
const productSchema = z.object({
    nombre: z.string().min(1, "El nombre es obligatorio"),
    descripcion: z.string().optional(),
    tipo: z.enum(['ARMAZON', 'CRISTAL', 'ACCESORIO']),
    marca_id: z.string().min(1, "La marca es obligatoria"),
    precio_costo: z.number().optional(),
    precio_usd: z.number().optional(),
    precio_venta_ars: z.number().optional(),
    stock: z.number().min(0, "El stock es obligatorio"),
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
    stock: 0,
    stock_minimo: 0,
    ubicacion: '',
    is_active: true
};

export const FormularioProducto: React.FC = () => {
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

    // Refs
    const searchTimeout = useRef<any>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // --- Effects ---

    // 1. Fetch Dolar Rate
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
    }, []);

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

    const onSubmit: SubmitHandler<ProductFormData> = async (data) => {
        setLoading(true);
        try {
            // Determine final USD Price
            let finalUsd = data.precio_usd;

            // If USD is missing/0 but we have ARS, try to convert
            if ((!finalUsd || finalUsd <= 0) && data.precio_venta_ars && data.precio_venta_ars > 0) {
                if (dolarRate > 0) {
                    finalUsd = data.precio_venta_ars / dolarRate;
                } else {
                    alert("No hay cotización del dólar configurada para realizar la conversión. Ingrese el precio en USD manualmente.");
                    setLoading(false);
                    return;
                }
            }

            if (!finalUsd || finalUsd <= 0) {
                alert("El precio en USD no es válido.");
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
                stock: data.stock,
                stock_minimo: data.stock_minimo || 0,
                ubicacion: data.ubicacion,
                is_active: data.is_active
            };

            await LOAApi.post('/api/products', payload);
            alert('Producto creado correctamente');

            // Reset
            reset(initialValues);
            clearBrandSelection();
            setBrandSearchTerm('');

        } catch (error) {
            console.error(error);
            alert('Error al crear producto');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto p-4 fade-in">
            <section className="bg-opacity-10 border border-blanco rounded-xl p-4">
                <h2 className="text-blanco text-2xl font-semibold mb-4">
                    Alta de Producto
                </h2>

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
                        <label className="text-sm text-blanco">Precio Costo</label>
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

                    {/* Stock */}
                    <div>
                        <label className="text-sm text-blanco">Stock Inicial <span className="text-red-500">*</span></label>
                        <input
                            type="number"
                            {...register('stock', { valueAsNumber: true })}
                            className={`input w-full bg-slate-50 text-slate-900 ${errors.stock ? 'border-red-500' : ''}`}
                        />
                        {errors.stock && (
                            <p className="text-red-500 text-xs mt-1">{errors.stock.message}</p>
                        )}
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
            </section>
        </div>
    );
};
