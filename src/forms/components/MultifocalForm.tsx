import React from 'react';
import type { FormValues } from '../../types/ventasFormTypes';

interface MultifocalFormProps {
    formState: FormValues;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export const MultifocalForm: React.FC<MultifocalFormProps> = ({
    formState,
    onInputChange,
}) => {
    const { multifocalTipo, DI_Lejos, DI_Cerca, Altura, Observacion } = formState;

    return (
        <section className="bg-opacity-10 border border-blanco rounded-xl p-4 mt-4">
            <h3 className="text-blanco font-medium mb-3">Multifocal / D.I / Altura</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                    name="multifocalTipo"
                    value={multifocalTipo}
                    onChange={onInputChange}
                    placeholder="Tipo multifocal"
                    className="input"
                />
                <input
                    name="DI_Lejos"
                    value={DI_Lejos}
                    onChange={onInputChange}
                    placeholder="D.I Lejos"
                    className="input"
                />
                <input
                    name="DI_Cerca"
                    value={DI_Cerca}
                    onChange={onInputChange}
                    placeholder="D.I Cerca"
                    className="input"
                />
                <input
                    name="Altura"
                    value={Altura}
                    onChange={onInputChange}
                    placeholder="Altura"
                    className="input"
                />
                <textarea
                    name="Observacion"
                    value={Observacion}
                    onChange={onInputChange}
                    placeholder="Observaciones"
                    className="input h-24 sm:col-span-3"
                />
            </div>
        </section>
    );
};
