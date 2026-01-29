import React from 'react';
import Swal from 'sweetalert2';
import LOAApi from '../../api/LOAApi';
import { BotonEscanearDNI } from '../../components/ui/BotonEscanearDNI';
import { formatDateForInput } from '../../helpers';
import type { FormValues } from '../../types/ventasFormTypes';
import type { Cliente } from '../../types/Cliente';


interface ClientFormProps {
    formState: FormValues;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    onBulkUpdate?: (updates: Partial<FormValues>) => void; // Para actualizaciones masivas sin race-conditions
    handleSearchClick: () => void;
    loading: boolean;
    formErrors?: Record<string, string>;
    setCliente: (cliente: Cliente | null) => void;
}

export const ClientForm: React.FC<ClientFormProps> = ({
    formState,
    onInputChange,
    onBulkUpdate,
    handleSearchClick,
    loading,
    formErrors = {},
    setCliente,
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

    // Helper para normalizar datos del cliente (backend -> form state)
    const mapClientDataToForm = (data: Partial<Cliente>): Partial<FormValues> => ({
        clienteDNI: data.dni || '',
        // Mapeo flexible: intenta nombre/apellido directos o usa clienteName/Prefix si viniera así
        clienteName: data.nombre || '',
        clienteApellido: data.apellido || '',
        clienteFechaNacimiento: formatDateForInput(data.fecha_nacimiento),
        clienteDomicilio: data.domicilio || '',
        clienteTelefono: data.telefono || '',
        clienteEmail: data.email || '',
    });

    const handleClienteEscaneado = async (datos: Partial<Cliente>) => {
        if (!datos || !datos.dni) return;

        const dniEscaneado = datos.dni;

        try {
            // 1. Buscamos SIEMPRE al cliente primero para ver si existe
            const { data } = await LOAApi.get(`/api/clients/by-dni/${dniEscaneado}`);
            const resultData = data.result || data; // Adapt to potential API response variations
            const hasRows = resultData?.rows?.length > 0;
            const clienteExistente = hasRows ? resultData.rows[0] : null;

            if (clienteExistente) {
                // CASO A: El cliente YA EXISTE
                console.log("Cliente existente encontrado:", clienteExistente);

                // Normalizamos con el helper
                const formUpdates = mapClientDataToForm(clienteExistente);
                console.log("Datos mappeados al form (Existente):", formUpdates);

                setCliente(clienteExistente);

                // Actualización del formulario
                if (onBulkUpdate) {
                    // Si el padre soporta bulk update, usamos eso (Recomendado)
                    onBulkUpdate({
                        clienteDNI: formUpdates.clienteDNI as string,
                        clienteName: formUpdates.clienteName as string,
                        clienteApellido: formUpdates.clienteApellido as string,
                        clienteFechaNacimiento: formUpdates.clienteFechaNacimiento as string,
                        clienteDomicilio: formUpdates.clienteDomicilio as string,
                        clienteTelefono: formUpdates.clienteTelefono as string,
                        clienteEmail: (formUpdates as any).clienteEmail as string
                    });
                } else {
                    // Fallback (puede causar race-conditions si el state update es lento)
                    setManualValue('clienteDNI', formUpdates.clienteDNI as string);
                    setManualValue('clienteName', formUpdates.clienteName as string);
                    setManualValue('clienteApellido', formUpdates.clienteApellido as string);
                    setManualValue('clienteFechaNacimiento', formUpdates.clienteFechaNacimiento as string);
                    setManualValue('clienteDomicilio', formUpdates.clienteDomicilio as string);
                    setManualValue('clienteTelefono', formUpdates.clienteTelefono as string);
                    setManualValue('clienteEmail', (formUpdates as any).clienteEmail as string);
                }

                Swal.fire({
                    icon: 'info',
                    title: 'Cliente Encontrado',
                    text: `Datos cargados: ${clienteExistente.nombre} ${clienteExistente.apellido}`,
                    timer: 2000,
                    showConfirmButton: false
                });

            } else {
                // CASO B: Cliente NUEVO
                // Normalizamos datos escaneados mezclados con defaults
                const datosEscaneados: Partial<Cliente> = {
                    dni: dniEscaneado,
                    nombre: datos.nombre,
                    apellido: datos.apellido,
                    fecha_nacimiento: datos.fecha_nacimiento
                    // otros campos si el scanner los provee
                };

                const formUpdates = mapClientDataToForm(datosEscaneados);
                console.log("Datos mappeados al form (Nuevo):", formUpdates);

                // Limpiamos ID para que sea un CREATE
                setCliente(null);

                if (onBulkUpdate) {
                    onBulkUpdate({
                        clienteDNI: formUpdates.clienteDNI as string,
                        clienteName: formUpdates.clienteName as string,
                        clienteApellido: formUpdates.clienteApellido as string,
                        clienteFechaNacimiento: formUpdates.clienteFechaNacimiento as string,
                    });
                } else {
                    // Aplicamos al form
                    setManualValue('clienteDNI', formUpdates.clienteDNI as string);
                    setManualValue('clienteName', formUpdates.clienteName as string);
                    setManualValue('clienteApellido', formUpdates.clienteApellido as string);
                    setManualValue('clienteFechaNacimiento', formUpdates.clienteFechaNacimiento as string);
                    // Los demás campos quedan vacíos por defecto en la función map si no vienen en datosEscaneados
                }

                Swal.fire({
                    icon: 'success',
                    title: 'DNI Leído',
                    text: 'Datos cargados. Verifique y guarde para registrar.',
                    timer: 2000,
                    showConfirmButton: false
                });
            }

        } catch (error) {
            console.error("Error al buscar cliente escaneado:", error);
            // Fallback con datos scanneados
            const formUpdates = mapClientDataToForm(datos);
            console.log("Datos mappeados al form (Fallback):", formUpdates);

            if (onBulkUpdate) {
                onBulkUpdate({
                    clienteDNI: dniEscaneado,
                    clienteName: formUpdates.clienteName as string,
                    clienteApellido: formUpdates.clienteApellido as string,
                    clienteFechaNacimiento: formUpdates.clienteFechaNacimiento as string,
                });
            } else {
                setManualValue('clienteDNI', dniEscaneado);
                setManualValue('clienteName', formUpdates.clienteName as string);
                setManualValue('clienteApellido', formUpdates.clienteApellido as string);
                setManualValue('clienteFechaNacimiento', formUpdates.clienteFechaNacimiento as string);
            }

            Swal.fire("Atención", "Se leyeron los datos pero hubo un error verificando existencia.", "warning");
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
                        value={formatDateForInput(clienteFechaRecibido, true)}
                        onChange={onInputChange}
                        className="input"
                        disabled
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-sm text-blanco">Teléfono <span className="text-red-500">*</span></span>
                    <input
                        type="tel"
                        name="clienteTelefono"
                        value={clienteTelefono}
                        onChange={onInputChange}
                        placeholder="Ej: 11 1234 5678"
                        className={getInputClass('clienteTelefono')}
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-sm text-blanco">Fecha entrega</span>
                    <input
                        type="date"
                        name="clienteFechaEntrega"
                        value={formatDateForInput(clienteFechaEntrega)}
                        onChange={onInputChange}
                        min={new Date().toISOString().split('T')[0]}
                        className="input"
                    />
                </label>
            </div>
        </section>
    );
};