
import {
    ShoppingCart,
    Package,
    Users,
    Wrench,
    Wallet,
    FileText,
    BarChart2,
    Undo2,
    PlusCircle,
    Upload,
    Settings,
    Tags,
    Building2,
    Stethoscope,
    Glasses,
    Truck
} from 'lucide-react';

export interface NavItem {
    label: string;
    path: string;
    icon: React.ElementType;
    requiredRoles: string[];
    category: 'Ventas' | 'Inventario' | 'Administración' | 'Configuración' | 'Superadmin';
}

export const navigationConfig: NavItem[] = [
    // --- Ventas / Gestión Operativa ---
    {
        label: 'Nueva Venta',
        path: '/admin/nueva-venta',
        icon: ShoppingCart,
        requiredRoles: ['ADMIN', 'SUPERADMIN'],
        category: 'Ventas'
    },
    {
        label: 'Nueva Venta',
        path: '/empleado/nueva-venta',
        icon: ShoppingCart,
        requiredRoles: ['EMPLEADO'],
        category: 'Ventas'
    },
    {
        label: 'Stock',
        path: '/admin/stock',
        icon: Package,
        requiredRoles: ['ADMIN', 'SUPERADMIN'],
        category: 'Inventario'
    },
    {
        label: 'Stock',
        path: '/empleado/stock',
        icon: Package,
        requiredRoles: ['EMPLEADO'],
        category: 'Inventario'
    },
    {
        label: 'Stock',
        path: '/taller/stock',
        icon: Package,
        requiredRoles: ['TALLER'],
        category: 'Inventario'
    },
    {
        label: 'Clientes',
        path: '/admin/clientes',
        icon: Users,
        requiredRoles: ['ADMIN', 'SUPERADMIN'],
        category: 'Ventas'
    },
    {
        label: 'Clientes',
        path: '/empleado/clientes',
        icon: Users,
        requiredRoles: ['EMPLEADO'],
        category: 'Ventas'
    },
    {
        label: 'Taller',
        path: '/admin/taller',
        icon: Wrench,
        requiredRoles: ['ADMIN', 'SUPERADMIN'],
        category: 'Ventas'
    },
    {
        label: 'Lista Taller',
        path: '/taller/lista',
        icon: Wrench,
        requiredRoles: ['TALLER'],
        category: 'Ventas'
    },
    {
        label: 'Historial Taller',
        path: '/taller/historial',
        icon: Wrench,
        requiredRoles: ['TALLER'],
        category: 'Ventas'
    },
    {
        label: 'Cierre de Caja',
        path: '/admin/cierre-caja',
        icon: Wallet,
        requiredRoles: ['ADMIN', 'SUPERADMIN'],
        category: 'Ventas'
    },
    {
        label: 'Cierre de Caja',
        path: '/empleado/cierre-caja',
        icon: Wallet,
        requiredRoles: ['EMPLEADO'],
        category: 'Ventas'
    },
    {
        label: 'Entregas',
        path: '/empleado/entregas',
        icon: Truck,
        requiredRoles: ['EMPLEADO'],
        category: 'Ventas'
    },


    // --- Administración ---
    {
        label: 'Liquidaciones',
        path: '/admin/liquidaciones',
        icon: FileText,
        requiredRoles: ['ADMIN', 'SUPERADMIN'],
        category: 'Administración'
    },
    {
        label: 'Nueva Liquidación',
        path: '/admin/liquidaciones/nueva',
        icon: PlusCircle,
        requiredRoles: ['ADMIN', 'SUPERADMIN'],
        category: 'Administración'
    },
    {
        label: 'Empleados',
        path: '/admin/empleados',
        icon: Users,
        requiredRoles: ['ADMIN', 'SUPERADMIN'],
        category: 'Administración'
    },
    {
        label: 'Estadísticas',
        path: '/admin/estadisticas',
        icon: BarChart2,
        requiredRoles: ['ADMIN', 'SUPERADMIN'],
        category: 'Administración'
    },
    {
        label: 'Devoluciones',
        path: '/admin/devoluciones',
        icon: Undo2,
        requiredRoles: ['ADMIN', 'SUPERADMIN'],
        category: 'Administración'
    },
    {
        label: 'Devoluciones',
        path: '/empleado/devoluciones',
        icon: Undo2,
        requiredRoles: ['EMPLEADO'],
        category: 'Administración'
    },


    // --- Superadmin ---
    {
        label: 'Nuevo Producto',
        path: '/admin/productos/nuevo',
        icon: Package,
        requiredRoles: ['SUPERADMIN'],
        category: 'Superadmin'
    },
    {
        label: 'Nuevo Cristal',
        path: '/admin/cristales/nuevo',
        icon: Glasses,
        requiredRoles: ['SUPERADMIN'],
        category: 'Superadmin'
    },
    {
        label: 'Importar Productos',
        path: '/admin/productos/importar',
        icon: Upload,
        requiredRoles: ['SUPERADMIN'],
        category: 'Superadmin'
    },

    // --- Configuración ---
    {
        label: 'Configuración General',
        path: '/admin/configuracion',
        icon: Settings,
        requiredRoles: ['ADMIN', 'SUPERADMIN'],
        category: 'Configuración'
    },
    {
        label: 'Marcas',
        path: '/admin/configuracion/marcas',
        icon: Tags,
        requiredRoles: ['ADMIN', 'SUPERADMIN'],
        category: 'Configuración'
    },
    {
        label: 'Proveedores',
        path: '/admin/configuracion/proveedores',
        icon: Building2,
        requiredRoles: ['ADMIN', 'SUPERADMIN'],
        category: 'Configuración'
    },
    {
        label: 'Obras Sociales',
        path: '/admin/configuracion/obras-sociales',
        icon: Building2,
        requiredRoles: ['ADMIN', 'SUPERADMIN'],
        category: 'Configuración'
    },
    {
        label: 'Doctores',
        path: '/admin/configuracion/doctores',
        icon: Stethoscope,
        requiredRoles: ['ADMIN', 'SUPERADMIN'],
        category: 'Configuración'
    },
];
