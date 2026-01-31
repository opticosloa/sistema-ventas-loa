import React, { useEffect, useState } from 'react';
import { useForm, useWatch, type SubmitHandler, type FieldValues } from 'react-hook-form';
import Swal from 'sweetalert2';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import LOAApi from '../api/LOAApi';
import { type Sucursal } from '../types/Sucursal';
import { Eye, EyeOff } from 'lucide-react';

interface Props {
    sucursal?: Sucursal | null;
    onClose: () => void;
    onSuccess: () => void;
}

interface UserAdmin {
    id: string;
    nombre: string;
    apellido: string;
    rol: string;
}

const sucursalSchema = z.object({
    nombre: z.string().min(1, 'El nombre es obligatorio'),
    direccion: z.string().optional(),
    telefono: z.string().optional(),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    color_identificativo: z.string().default('#000000'),
    encargado: z.string().nullable().optional(),
    mp_public_key: z.string().nullable().optional(),
    mp_access_token: z.string().nullable().optional(),
    mp_user_id: z.string().nullable().optional(),
    is_active: z.boolean().optional().default(true),
});

type SucursalFormData = z.infer<typeof sucursalSchema>;

export const FormularioSucursal: React.FC<Props> = ({ sucursal, onClose, onSuccess }) => {
    const [admins, setAdmins] = useState<UserAdmin[]>([]);
    const [showToken, setShowToken] = useState(false);

    // Explicitly type useForm with the Zod inferred type
    const { register, handleSubmit, reset, control, formState: { errors } } = useForm<SucursalFormData>({
        resolver: zodResolver(sucursalSchema) as any,
        defaultValues: {
            nombre: '',
            direccion: '',
            telefono: '',
            email: '',
            mp_public_key: '',
            mp_access_token: '',
            mp_user_id: '',
            encargado: '',
            color_identificativo: '#000000',
            is_active: true
        }
    });

    // Watch fields for warnings
    const mpPublicKey = useWatch({ control, name: 'mp_public_key' });
    const mpAccessToken = useWatch({ control, name: 'mp_access_token' });
    const mpUserId = useWatch({ control, name: 'mp_user_id' });
    const encargado = useWatch({ control, name: 'encargado' });

    const showMpWarning = !mpPublicKey || !mpAccessToken || !mpUserId;
    const showEncargadoWarning = !encargado;

    useEffect(() => {
        const fetchAdmins = async () => {
            try {
                const { data } = await LOAApi.get('/api/users/admins');
                if (data.success) {
                    setAdmins(data.result);
                }
            } catch (error) {
                console.error("Error fetching admins:", error);
            }
        };

        fetchAdmins();
    }, []);

    useEffect(() => {
        if (sucursal) {
            reset({
                nombre: sucursal.nombre,
                direccion: sucursal.direccion || '',
                telefono: sucursal.telefono || '',
                email: sucursal.email || '',
                color_identificativo: sucursal.color_identificativo || '#000000',
                encargado: sucursal.encargado || '',
                mp_public_key: sucursal.mp_public_key || '',
                mp_access_token: sucursal.mp_access_token || '',
                mp_user_id: sucursal.mp_user_id || '',
                is_active: sucursal.is_active ?? true
            });
        }
    }, [sucursal, reset]);

    const onSubmit: SubmitHandler<FieldValues> = async (dataRaw) => {
        const data = dataRaw as SucursalFormData;
        console.log("📝 Form data received:", data);

        try {
            // Transform optional fields to null if they are empty strings or undefined
            const payload = {
                ...data,
                encargado: data.encargado && data.encargado.trim() !== '' ? data.encargado : null,
                mp_public_key: data.mp_public_key && data.mp_public_key.trim() !== '' ? data.mp_public_key : null,
                mp_access_token: data.mp_access_token && data.mp_access_token.trim() !== '' ? data.mp_access_token : null,
                mp_user_id: data.mp_user_id && data.mp_user_id.trim() !== '' ? data.mp_user_id : null,
                // Ensure other potential empty strings are handled if necessary, generally only optional ones matter for null
            };

            console.log("🚀 Payload to send:", payload);

            if (sucursal?.sucursal_id) {
                await LOAApi.put(`/api/tenants/${sucursal.sucursal_id}`, payload);
                Swal.fire('Actualizado', 'Sucursal actualizada correctamente', 'success');
            } else {
                await LOAApi.post('/api/tenants', payload);
                Swal.fire('Creado', 'Sucursal creada correctamente', 'success');
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error("❌ Error submitting form:", error);
            Swal.fire('Error', 'Hubo un error al guardar la sucursal', 'error');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] overflow-y-auto">
                <div className="bg-slate-900 p-4 flex justify-between items-center text-white sticky top-0 z-10">
                    <h2 className="text-xl font-bold">{sucursal ? 'Editar Sucursal' : 'Nueva Sucursal'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Basic Info */}
                    <div className="col-span-2 md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                        <input {...register('nombre')} className="input-field w-full border border-gray-300 rounded-md p-2" />
                        {errors.nombre && <span className="text-red-500 text-xs">{errors.nombre.message}</span>}
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Encargado</label>
                        <select {...register('encargado')} className="input-field w-full border border-gray-300 rounded-md p-2">
                            <option value="">Seleccione un encargado...</option>
                            {admins.map(admin => (
                                <option key={admin.id} value={admin.id}>
                                    {admin.nombre} {admin.apellido} ({admin.rol})
                                </option>
                            ))}
                        </select>
                        {showEncargadoWarning && (
                            <div className="text-amber-500 text-xs mt-1 flex items-center gap-1">
                                <span>⚠️</span> Sin encargado asignado
                            </div>
                        )}
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
                        {errors.email && <span className="text-red-500 text-xs">{errors.email.message}</span>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Color Identificativo</label>
                        <input type="color" {...register('color_identificativo')} className="w-full h-10 border border-gray-300 rounded-md p-1 cursor-pointer" />
                    </div>

                    {/* Mercado Pago Section */}
                    <div className="col-span-2 border-t pt-4 mt-2">
                        <h3 className="text-lg font-semibold text-cyan-700 mb-3 flex items-center gap-2">
                            Configuración Mercado Pago
                            {showMpWarning && <span className="text-xs font-normal text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">Configuración incompleta</span>}
                        </h3>
                        {showMpWarning && (
                            <div className="bg-amber-50 border-l-4 border-amber-400 p-3 mb-4 text-amber-700 text-sm">
                                <p className="font-bold">Atención</p>
                                <p>Sin la configuración completa de Mercado Pago, algunas funciones de cobro podrían verse limitadas.</p>
                            </div>
                        )}
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Public Key</label>
                        <input {...register('mp_public_key')} className="input-field w-full border border-gray-300 rounded-md p-2 font-mono text-sm" placeholder="APP_USR-..." />
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Access Token</label>
                        <input {...register('mp_access_token')} className="input-field w-full border border-gray-300 rounded-md p-2 font-mono text-sm" placeholder="APP_USR-..." type="password" />
                        <button
                            type="button"
                            onClick={() => setShowToken(!showToken)}
                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                            {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">User ID (Mercado Pago)</label>
                        <input {...register('mp_user_id')} className="input-field w-full border border-gray-300 rounded-md p-2" placeholder="Ej: 123456789" />
                        <p className="text-xs text-gray-500 mt-1">ID numérico de usuario de Mercado Pago necesario para identificación de cuenta.</p>
                    </div>

                    <div className="col-span-2 mt-4 flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 font-medium transition-colors shadow-sm">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
