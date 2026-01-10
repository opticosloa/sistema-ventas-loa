import React, { useState } from 'react';
import LOAApi from '../api/LOAApi';

interface ProductForm {
    nombre: string;
    descripcion: string;
    tipo: 'ARMAZON' | 'LIQUIDO' | 'ACCESORIO';
    precio_costo: number;
    precio_venta: number;
    stock: number;
    stock_minimo: number;
    ubicacion: string;
    codigo_qr: string;
    is_active: boolean;
}

const initialForm: ProductForm = {
    nombre: '',
    descripcion: '',
    tipo: 'ARMAZON',
    precio_costo: 0,
    precio_venta: 0,
    stock: 0,
    stock_minimo: 0,
    ubicacion: '',
    codigo_qr: '',
    is_active: true
};

export const FormularioProducto: React.FC = () => {
    const [form, setForm] = useState<ProductForm>(initialForm);
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await LOAApi.post('/api/products', form);
            alert('Producto creado correctamente');
            setForm(initialForm);
        } catch (error) {
            console.error(error);
            alert('Error al crear producto');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-6 bg-gray-900 rounded-xl shadow-xl mt-10 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6">Alta de Producto</h2>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Nombre */}
                <div className="md:col-span-2">
                    <label className="block text-gray-400 text-sm mb-1">Nombre *</label>
                    <input
                        required
                        name="nombre"
                        value={form.nombre}
                        onChange={handleChange}
                        className="input w-full bg-gray-800 border-gray-600 focus:border-celeste"
                        placeholder="Nombre del producto"
                    />
                </div>

                {/* Descripcion */}
                <div className="md:col-span-2">
                    <label className="block text-gray-400 text-sm mb-1">Descripción</label>
                    <textarea
                        name="descripcion"
                        value={form.descripcion}
                        onChange={handleChange}
                        rows={3}
                        className="input w-full bg-gray-800 border-gray-600 focus:border-celeste"
                        placeholder="Detalles del producto..."
                    />
                </div>

                {/* Tipo */}
                <div>
                    <label className="block text-gray-400 text-sm mb-1">Tipo</label>
                    <select
                        name="tipo"
                        value={form.tipo}
                        onChange={handleChange}
                    >
                        <option value="ARMAZON">Armazón</option>
                        <option value="LIQUIDO">Líquido</option>
                        <option value="ACCESORIO">Accesorio</option>
                    </select>
                </div>

                {/* Ubicacion */}
                <div>
                    <label className="block text-gray-400 text-sm mb-1">Ubicación</label>
                    <input
                        name="ubicacion"
                        value={form.ubicacion}
                        onChange={handleChange}
                        className="input w-full bg-gray-800 border-gray-600 focus:border-celeste"
                        placeholder="Estante A1..."
                    />
                </div>

                {/* Precios */}
                <div>
                    <label className="block text-gray-400 text-sm mb-1">Precio Costo</label>
                    <input
                        type="number"
                        name="precio_costo"
                        value={form.precio_costo}
                        onChange={handleChange}
                        className="input w-full bg-gray-800 border-gray-600 focus:border-celeste"
                    />
                </div>
                <div>
                    <label className="block text-gray-400 text-sm mb-1">Precio Venta</label>
                    <input
                        type="number"
                        name="precio_venta"
                        value={form.precio_venta}
                        onChange={handleChange}
                        className="input w-full bg-gray-800 border-gray-600 focus:border-celeste"
                    />
                </div>

                {/* Stock */}
                <div>
                    <label className="block text-gray-400 text-sm mb-1">Stock Inicial</label>
                    <input
                        type="number"
                        name="stock"
                        value={form.stock}
                        onChange={handleChange}
                        className="input w-full bg-gray-800 border-gray-600 focus:border-celeste"
                    />
                </div>
                <div>
                    <label className="block text-gray-400 text-sm mb-1">Stock Mínimo</label>
                    <input
                        type="number"
                        name="stock_minimo"
                        value={form.stock_minimo}
                        onChange={handleChange}
                        className="input w-full bg-gray-800 border-gray-600 focus:border-celeste"
                    />
                </div>

                {/* QR */}
                <div className="md:col-span-2">
                    <label className="block text-gray-400 text-sm mb-1">Código QR (Opcional)</label>
                    <input
                        name="codigo_qr"
                        value={form.codigo_qr}
                        onChange={handleChange}
                        className="input w-full bg-gray-800 border-gray-600 focus:border-celeste"
                        placeholder="Dejar vacío para autogenerar con ID"
                    />
                    <p className="text-xs text-gray-500 mt-1">Si no se ingresa, se usará el ID del producto.</p>
                </div>

                {/* Active */}
                <div className="md:col-span-2 flex items-center gap-2">
                    <input
                        type="checkbox"
                        name="is_active"
                        checked={form.is_active}
                        onChange={handleChange}
                        className="w-5 h-5 accent-celeste bg-gray-700 border-gray-600 rounded"
                    />
                    <label className="text-gray-300">Producto Activo</label>
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

            </form >
        </div >
    );
};
