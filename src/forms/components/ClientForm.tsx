import React from 'react';
import type { FormValues } from '../../types/ventasFormTypes';

const OBRA_SOCIAL_OPTIONS = [
    "SIN OBRA SOCIAL/PREPAGA",
    "SWISS MEDICAL ",
    "AUSTRAL SALUD ",
    "AMEBPBA",
    "PAMI",
    "MUNICIPALIDAD DE LUJAN ",
    "HIPERVISION",
];

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
        clienteObraSocial,
        clienteNameVendedor,
        clienteName,
        clienteApellido,
        clienteDomicilio,
        clienteFechaRecibido,
        clienteTelefono,
        clienteFechaEntrega,
    } = formState;

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
                                className={`btn-primary px-4 ${loading ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                disabled={loading}
                            >
                                {loading ? 'Buscando...' : 'Buscar'}
                            </button>
                        </div>

                        <h3 className="text-blanco text-sm font-medium mt-3">Obra Social</h3>
                        <select
                            name="clienteObraSocial"
                            value={clienteObraSocial}
                            onChange={onInputChange}
                            className="input"
                        >
                            <option value="" className="text-black">Seleccionar Obra Social</option>
                            {OBRA_SOCIAL_OPTIONS.map((os) => (
                                <option key={os} value={os} className="text-black">
                                    {os.trim()}
                                </option>
                            ))}
                        </select>
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
