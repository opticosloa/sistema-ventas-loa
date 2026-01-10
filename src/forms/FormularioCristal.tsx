import React, { useState } from 'react';
import LOAApi from '../api/LOAApi';

interface CrystalForm {
    material: string;
    tratamiento: string;
    esfera: number;
    cilindro: number;
    stock: number;
    stock_minimo: number;
    ubicacion: string;
    precio_venta: number;
    precio_costo: number;
}

const initialForm: CrystalForm = {
    material: '',
    tratamiento: '',
    esfera: 0,
    cilindro: 0,
    stock: 0,
    stock_minimo: 0,
    ubicacion: '',
    precio_venta: 0,
    precio_costo: 0,
};

export const FormularioCristal: React.FC = () => {
    const [form, setForm] = useState<CrystalForm>(initialForm);
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await LOAApi.post('/api/crystals', form);
            alert('Cristal creado correctamente');
            setForm(initialForm);
        } catch (error) {
            console.error(error);
            alert('Error al crear cristal');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-6 bg-gray-900 rounded-xl shadow-xl mt-10 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6">Alta de Cristal (Stock)</h2>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Material */}
                <div>
                    <label className="block text-gray-400 text-sm mb-1">Material (Tipo)</label>
                    <select
                        required
                        name="material"
                        value={form.material}
                        onChange={handleChange}
                        className="input w-full bg-gray-800 border-gray-600 focus:border-celeste"
                    >
                        <option value="">Seleccionar...</option>
                        <option value="Organico">Orgánico</option>
                        <option value="Policarbonato">Policarbonato</option>
                        <option value="Mineral">Mineral</option>
                        <option value="Alto Indice">Alto Índice</option>
                    </select>
                </div>

                {/* Tratamiento */}
                <div>
                    <label className="block text-gray-400 text-sm mb-1">Tratamiento (Color)</label>
                    <input
                        required
                        name="tratamiento"
                        value={form.tratamiento}
                        onChange={handleChange}
                        className="input w-full bg-gray-800 border-gray-600 focus:border-celeste"
                        placeholder="Ej: Blanco, Antirreflex..."
                    />
                </div>

                {/* Esfera */}
                <div>
                    <label className="block text-gray-400 text-sm mb-1">Esfera</label>
                    <input
                        type="number"
                        step="0.25"
                        name="esfera"
                        value={form.esfera}
                        onChange={handleChange}
                        className="input w-full bg-gray-800 border-gray-600 focus:border-celeste"
                    />
                </div>

                {/* Cilindro */}
                <div>
                    <label className="block text-gray-400 text-sm mb-1">Cilindro</label>
                    <input
                        type="number"
                        step="0.25"
                        name="cilindro"
                        value={form.cilindro}
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

                {/* Ubicacion */}
                <div className="md:col-span-2">
                    <label className="block text-gray-400 text-sm mb-1">Ubicación</label>
                    <input
                        name="ubicacion"
                        value={form.ubicacion}
                        onChange={handleChange}
                        className="input w-full bg-gray-800 border-gray-600 focus:border-celeste"
                        placeholder="Cajón A-1..."
                    />
                </div>

                {/* Submit */}
                <div className="md:col-span-2 flex justify-end mt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary"
                    >
                        {loading ? 'Guardando...' : 'Crear Cristal'}
                    </button>
                </div>

            </form>
        </div>
    );
};
