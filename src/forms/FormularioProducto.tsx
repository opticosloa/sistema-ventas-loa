import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Plus } from 'lucide-react';
import LOAApi from '../api/LOAApi';
import type { Brand } from '../types/Marcas';
import { BrandCreateModal } from './components/modals/BrandCreateModal';
import { useNumericInput } from '../hooks/useNumericInput';

interface ProductForm {
    nombre: string;
    descripcion: string;
    tipo: 'ARMAZON' | 'LIQUIDO' | 'ACCESORIO';
    marca_id: string;
    precio_costo: number;
    precio_usd: number;
    stock: number;
    stock_minimo: number;
    ubicacion: string;
    is_active: boolean;
}

const initialForm: ProductForm = {
    nombre: '',
    descripcion: '',
    tipo: 'ARMAZON',
    marca_id: '',
    precio_costo: 0,
    precio_usd: 0,
    stock: 0,
    stock_minimo: 0,
    ubicacion: '',
    is_active: true
};

export const FormularioProducto: React.FC = () => {
    const [form, setForm] = useState<ProductForm>(initialForm);
    const [loading, setLoading] = useState(false);

    // Brand Autocomplete State
    const [brandSearchTerm, setBrandSearchTerm] = useState('');
    const [brandResults, setBrandResults] = useState<Brand[]>([]);
    const [showBrandResults, setShowBrandResults] = useState(false);
    const [isSearchingBrand, setIsSearchingBrand] = useState(false);

    // Modal State
    const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);

    // Refs
    const searchTimeout = useRef<any>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowBrandResults(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleBrandSearch = (term: string) => {
        setBrandSearchTerm(term);
        // If user is typing, we might want to clear selected ID until they select again? 
        // Or keep it? Usually better to clear if they change the text significantly.
        // For now, let's just search.

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
                // Verify structure
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
        setForm(prev => ({ ...prev, marca_id: brand.marca_id }));
        setBrandSearchTerm(brand.nombre);
        setShowBrandResults(false);
    };

    const clearBrandSelection = () => {
        setForm(prev => ({ ...prev, marca_id: '' }));
        setBrandSearchTerm('');
    };

    const handleBrandCreateSuccess = (newBrand: Brand) => {
        selectBrand(newBrand);
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value, type } = e.target;

        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox'
                ? (e.target as HTMLInputElement).checked
                : type === 'number'
                    ? (parseFloat(value) || 0) // Convierte a número inmediatamente
                    : value
        }));
    };

    const { handleNumericChange } = useNumericInput(handleChange);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await LOAApi.post('/api/products', form);
            alert('Producto creado correctamente');
            setForm(initialForm);
            // Reset brand state
            clearBrandSelection();
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
                    onSubmit={handleSubmit}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                    {/* Nombre */}
                    <div className="md:col-span-2">
                        <label className="text-sm text-blanco">Nombre *</label>
                        <input
                            required
                            name="nombre"
                            value={form.nombre}
                            onChange={handleChange}
                            className="input w-full bg-slate-50 text-slate-900"
                            placeholder="Nombre del producto"
                        />
                    </div>

                    {/* Descripción */}
                    <div className="md:col-span-2">
                        <label className="text-sm text-blanco">Descripción</label>
                        <textarea
                            name="descripcion"
                            value={form.descripcion}
                            onChange={handleChange}
                            rows={3}
                            className="input w-full bg-slate-50 text-slate-900"
                            placeholder="Detalles del producto"
                        />
                    </div>

                    {/* Tipo */}
                    <div>
                        <label className="text-sm text-blanco">Tipo</label>
                        <select
                            name="tipo"
                            value={form.tipo}
                            onChange={handleChange}
                            className="input w-full bg-slate-50 text-slate-900"
                        >
                            <option value="ARMAZON">Armazón</option>
                            <option value="LIQUIDO">Líquido</option>
                            <option value="ACCESORIO">Accesorio</option>
                        </select>
                    </div>

                    {/* Marca (Autocomplete) */}
                    <div className="relative" ref={wrapperRef}>
                        <label className="text-sm text-blanco mb-1 block">Marca *</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={brandSearchTerm}
                                onChange={(e) => handleBrandSearch(e.target.value)}
                                onFocus={() => brandSearchTerm && setShowBrandResults(true)}
                                className="w-full bg-slate-50 text-slate-900 rounded-lg py-2 pl-9 pr-10 border-none focus:ring-2 focus:ring-cyan-500"
                                placeholder="Buscar marca..."
                            />
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />

                            {isSearchingBrand ? (
                                <div className="absolute right-3 top-2.5 w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : form.marca_id ? (
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

                        {/* Hidden input for validation if needed, or just rely on state check in submit */}
                        {!form.marca_id && <input tabIndex={-1} className="w-0 h-0 opacity-0 absolute" required />}
                    </div>

                    {/* Ubicación */}
                    <div>
                        <label className="text-sm text-blanco">Ubicación</label>
                        <input
                            name="ubicacion"
                            value={form.ubicacion}
                            onChange={handleChange}
                            className="input w-full bg-slate-50 text-slate-900"
                            placeholder="Ej: A1"
                        />
                    </div>

                    {/* Precios */}
                    <div>
                        <label className="text-sm text-blanco">Precio Costo</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            name="precio_costo"
                            value={form.precio_costo}
                            onChange={handleNumericChange}
                            className="input w-full bg-slate-50 text-slate-900"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-blanco">Precio Venta (USD)</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            name="precio_usd"
                            value={form.precio_usd}
                            onChange={handleNumericChange}
                            className="input w-full bg-slate-50 text-slate-900"
                        />
                    </div>

                    {/* Stock */}
                    <div>
                        <label className="text-sm text-blanco">Stock Inicial</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            name="stock"
                            value={form.stock}
                            onChange={handleNumericChange}
                            className="input w-full bg-slate-50 text-slate-900"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-blanco">Stock Mínimo</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            name="stock_minimo"
                            value={form.stock_minimo}
                            onChange={handleNumericChange}
                            className="input w-full bg-slate-50 text-slate-900"
                        />
                    </div>

                    {/* QR Removed */}

                    {/* Activo */}
                    <div className="md:col-span-2 flex items-center gap-2">
                        <input
                            type="checkbox"
                            name="is_active"
                            checked={form.is_active}
                            onChange={handleChange}
                            className="accent-celeste w-5 h-5"
                        />
                        <span className="text-blanco">Producto activo</span>
                    </div>

                    {/* Submit */}
                    <div className="md:col-span-2 flex justify-end mt-2">
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

