import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Swal from 'sweetalert2';
import LOAApi from '../api/LOAApi';
import { type Sucursal } from '../types/Sucursal';

interface Props {
    sucursal?: Sucursal | null;
    onClose: () => void;
    onSuccess: () => void;
}

export const FormularioSucursal: React.FC<Props> = ({ sucursal, onClose, onSuccess }) => {
    const { register, handleSubmit, reset } = useForm<Sucursal>({
        defaultValues: {
            nombre: '',
            direccion: '',
            telefono: '',
            email: '',
            mp_public_key: '',
            mp_access_token: '',
            mp_user_id: '',
            color_identificativo: '#000000',
            is_active: true
        }
    });

    useEffect(() => {
        if (sucursal) {
            reset({
                ...sucursal,
                mp_public_key: sucursal.mp_public_key || '',
                mp_access_token: sucursal.mp_access_token || '',
                mp_user_id: sucursal.mp_user_id || '',
                color_identificativo: sucursal.color_identificativo || '#000000'
            });
        }
    }, [sucursal, reset]);

    const onSubmit = async (data: Sucursal) => {
        try {
            if (sucursal?.sucursal_id) {
                await LOAApi.put(`/api/tenants/${sucursal.sucursal_id}`, data);
                Swal.fire('Actualizado', 'Sucursal actualizada correctamente', 'success');
            } else {
                await LOAApi.post('/api/tenants', data);
                Swal.fire('Creado', 'Sucursal creada correctamente', 'success');
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Hubo un error al guardar la sucursal', 'error');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
                <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
                    <h2 className="text-xl font-bold">{sucursal ? 'Editar Sucursal' : 'Nueva Sucursal'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                        <input {...register('nombre', { required: true })} className="input-field w-full border border-gray-300 rounded-md p-2" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                        <input {...register('direccion')} className="input-field w-full border border-gray-300 rounded-md p-2" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                        <input {...register('telefono')} className="input-field w-full border border-gray-300 rounded-md p-2" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input {...register('email')} className="input-field w-full border border-gray-300 rounded-md p-2" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Color Identificativo</label>
                        <input type="color" {...register('color_identificativo')} className="w-full h-10 border border-gray-300 rounded-md p-1 cursor-pointer" />
                    </div>

                    <div className="col-span-2 border-t pt-4 mt-2">
                        <h3 className="text-lg font-semibold text-cyan-700 mb-3">Configuración Mercado Pago</h3>
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Public Key</label>
                        <input {...register('mp_public_key')} className="input-field w-full border border-gray-300 rounded-md p-2 font-mono text-sm" placeholder="APP_USR-..." />
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Access Token</label>
                        <input {...register('mp_access_token')} className="input-field w-full border border-gray-300 rounded-md p-2 font-mono text-sm" placeholder="APP_USR-..." type="password" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">User ID (Opcional)</label>
                        <input {...register('mp_user_id')} className="input-field w-full border border-gray-300 rounded-md p-2" />
                    </div>

                    <div className="col-span-2 mt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-100">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 font-medium">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
