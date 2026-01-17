import React from 'react';
import type { FormValues } from '../../types/ventasFormTypes';
import { BotonEscanearDNI } from '../../components/ui/BotonEscanearDNI';
import type { Cliente } from '../../types/Cliente';
import LOAApi from '../../api/LOAApi';


interface ClientFormProps {
    formState: FormValues;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    handleSearchClick: () => void;
    loading: boolean;
    formErrors?: Record<string, string>;
}

export const ClientForm: React.FC<ClientFormProps> = ({
    formState,
    onInputChange,
    handleSearchClick,
    loading,
    formErrors = {},
}) => {
    const getInputClass = (fieldName: string, baseClass: string = "input") => {
        return formErrors[fieldName] ? `${baseClass} ring-2 ring-red-500` : baseClass;
    };

    const {
        clienteDNI,
        clienteNameVendedor,
        clienteName,
        clienteApellido,
        clienteDomicilio,
        clienteFechaRecibido,
        clienteTelefono,
        clienteFechaEntrega,
    } = formState;

    // Función auxiliar para disparar cambios manuales en el formulario
    const setManualValue = (name: string, value: string) => {
        onInputChange({
            target: { name, value }
        } as React.ChangeEvent<HTMLInputElement>);
    };

    const handleClienteEscaneado = async (datos: Partial<Cliente>) => {
        if (!datos || !datos.dni) return;

        let cambioDatos = false;
        const dniEscaneado = datos.dni; // DNI obtenido del escáner

        try {
            // 1. Buscamos al cliente usando el DNI del ESCÁNER, no el del estado anterior
            const { data } = await LOAApi.get(`/api/clients/by-dni/${dniEscaneado}`);
            const clienteData = data.result?.rows?.[0] || data.result?.[0] || data.result;

            if (clienteData) {
                // 2. Comparamos para ver si hay que actualizar datos viejos en la DB
                const nombreDistinto = datos.nombre && datos.nombre !== clienteData.nombre;
                const apellidoDistinto = datos.apellido && datos.apellido !== clienteData.apellido;
                const fechaDistinta = datos.fecha_nacimiento && datos.fecha_nacimiento !== clienteData.fecha_nacimiento;

                if (nombreDistinto || apellidoDistinto || fechaDistinta) {
                    cambioDatos = true;
                    // Actualizamos DB con la info nueva del DNI
                    await LOAApi.put(`/api/clients/${clienteData.cliente_id}`, {
                        nombre: datos.nombre,
                        apellido: datos.apellido,
                        fecha_nacimiento: datos.fecha_nacimiento
                    });
                }
            } else {
                // 3. Si no existe, lo creamos automáticamente
                await LOAApi.post(`/api/clients`, {
                    dni: datos.dni,
                    nombre: datos.nombre,
                    apellido: datos.apellido,
                    fecha_nacimiento: datos.fecha_nacimiento
                });
            }

            // 4. Actualizamos el Formulario (Solución al error ts2345 con ?? '')
            setManualValue('clienteDNI', dniEscaneado);
            setManualValue('clienteName', datos.nombre ?? '');
            setManualValue('clienteApellido', datos.apellido ?? '');

            // Si tienes este campo en tu formState, asegúrate de que exista en los tipos
            if (datos.fecha_nacimiento) {
                setManualValue('clienteFechaNacimiento', datos.fecha_nacimiento);
            }

            if (cambioDatos) {
                alert('✅ Datos del cliente actualizados en el sistema según su DNI');
            }

        } catch (error) {
            console.error("Error al sincronizar cliente escaneado:", error);
            // Fallback: al menos cargamos los datos en el form aunque falle la API
            setManualValue('clienteDNI', dniEscaneado);
            setManualValue('clienteName', datos.nombre ?? '');
            setManualValue('clienteApellido', datos.apellido ?? '');
        }
    };

    return (
        <section className="bg-opacity-10 border border-blanco rounded-xl p-4">
            <h3 className="text-blanco font-medium mb-3">Datos del cliente</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-opacity-10 border border-blanco rounded-xl p-4">
                    <label className="flex flex-col gap-1">
                        <span className="text-sm text-blanco">Buscar por DNI <span className="text-red-500">*</span></span>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                name="clienteDNI"
                                placeholder="Ingrese DNI"
                                value={clienteDNI}
                                onChange={onInputChange}
                                className={`flex-1 ${getInputClass('clienteDNI', 'input')}`}
                                inputMode="numeric"
                            />

                            <button
                                type="button"
                                onClick={handleSearchClick}
                                className={`btn-primary px-4 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={loading}
                            >
                                {loading ? 'Buscando...' : 'Buscar'}
                            </button>


                        </div>
                        <BotonEscanearDNI
                            onScanComplete={handleClienteEscaneado}
                            className="h-full pt-2"
                        />
                    </label>
                </div>

                <div className="bg-opacity-10 border border-blanco rounded-xl p-4">
                    <h3 className="text-blanco font-medium mb-3">Vendedor</h3>
                    <input
                        name="clienteNameVendedor"
                        value={clienteNameVendedor}
                        onChange={onInputChange}
                        placeholder="Nombre vendedor"
                        className="input mb-3"
                        disabled
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                    <span className="text-sm text-blanco">Nombre <span className="text-red-500">*</span></span>
                    <input
                        name="clienteName"
                        value={clienteName}
                        onChange={onInputChange}
                        placeholder="Nombre cliente"
                        className={getInputClass('clienteName')}
                        autoComplete="name"
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-sm text-blanco">Apellido <span className="text-red-500">*</span></span>
                    <input
                        name="clienteApellido"
                        value={clienteApellido}
                        onChange={onInputChange}
                        placeholder="Apellido cliente"
                        className={getInputClass('clienteApellido')}
                        autoComplete="name"
                    />
                </label>

                {/* Resto de los campos se mantienen igual... */}
                <label className="flex flex-col gap-1">
                    <span className="text-sm text-blanco">Domicilio</span>
                    <input
                        name="clienteDomicilio"
                        value={clienteDomicilio}
                        onChange={onInputChange}
                        placeholder="Domicilio"
                        className="input"
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-sm text-blanco">Fecha recibido</span>
                    <input
                        type="datetime-local"
                        name="clienteFechaRecibido"
                        value={clienteFechaRecibido}
                        onChange={onInputChange}
                        className="input"
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-sm text-blanco">Teléfono</span>
                    <input
                        type="tel"
                        name="clienteTelefono"
                        value={clienteTelefono}
                        onChange={onInputChange}
                        placeholder="Ej: 11 1234 5678"
                        className="input"
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-sm text-blanco">Fecha entrega</span>
                    <input
                        type="date"
                        name="clienteFechaEntrega"
                        value={clienteFechaEntrega}
                        onChange={onInputChange}
                        className="input"
                    />
                </label>
            </div>
        </section>
    );
};