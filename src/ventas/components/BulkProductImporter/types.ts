export interface BulkImportConfig {
    presetId: string;
    marcaId: string;
    stock: number;
    categoryId: string; // 'ARMAZON' | 'CRISTAL' | 'ACCESORIO' | 'ANTEOJO_SOL'
    defaultIva: number;
}

export interface ParsedProduct {
    id: string; // temp id
    nombre: string;
    descripcion?: string; // Internal Code (from Codigo)
    precio_costo: number;
    precio_venta: number;
    // precio_usd will be calculated by backend
    stock_distribution: { sucursal_id: string; cantidad: number }[];
    originalData: any;
    selected: boolean;
}

export interface ImportPreset {
    id: string;
    name: string;
    skipRows: number;
    transformFn: (row: any[]) => string;
}

export const IMPORT_PRESETS: ImportPreset[] = [
    {
        id: 'rusty_receta',
        name: 'Rusty Receta',
        skipRows: 8,
        transformFn: (row) => `${row[0] || ''} ${row[1] || ''}`.trim()
    },
    {
        id: 'generic_concat_1_2',
        name: 'Genérico (Col 1 + Col 2)',
        skipRows: 1,
        transformFn: (row) => `${row[0] || ''} ${row[1] || ''}`.trim()
    },
    {
        id: 'generic_single_col',
        name: 'Genérico (Solo Col 1)',
        skipRows: 1,
        transformFn: (row) => `${row[0] || ''}`.trim()
    }
];

export const PRODUCT_CATEGORIES = [
    { value: 'ARMAZON', label: 'Armazón' },
    { value: 'ANTEOJO_SOL', label: 'Anteojo de Sol' },
    { value: 'CRISTAL', label: 'Cristal' },
    { value: 'ACCESORIO', label: 'Accesorio' },
];
