import { Routes, Route } from 'react-router-dom';
import { Navbar, ConsultaStock, ConsultaCliente, TicketList, TicketsHistorial, Estadisticas, ListaEmpleados, Home, HistorialPrescripciones, ListaTicketsTaller, ConfiguracionPage, CierreCajaPage } from '../ventas/components';
import { LoginPage, NotFoundPage, PagoResultadoPage, UnAuthorized, DevolucionesPage } from '../ventas/page';

import { HomePage, EmpleadoHomePage, TallerHomePage } from '../page';
import { AuthGuard, RoleGuard, TenantGuard } from '../auth/guards';
import { useAuthStore } from '../hooks';
import { FormularioDePago, FormularioVenta, FormularioProducto, FormularioCristal } from '../forms';

export const AppRouter = () => {
  const { status } = useAuthStore();

  return (
    <>
      {status === 'authenticated' && <Navbar />}

      <Routes>
        {/* PUBLICAS */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnAuthorized />} />

        {/* PROTEGIDAS */}
        <Route element={<AuthGuard />}>
          <Route element={<TenantGuard />}>

            {/* ADMIN / SUPERADMIN */}
            <Route element={<RoleGuard allowedRoles={['ADMIN', 'SUPERADMIN']} />}>
              <Route path="/admin" element={<HomePage />}>
                <Route path="stock" element={<ConsultaStock />} />
                <Route path="clientes" element={<ConsultaCliente />} />
                <Route path="estadisticas" element={<Estadisticas />} />
                <Route path="nueva-venta" element={<FormularioVenta />} />
                <Route path="empleados" element={<ListaEmpleados />} />
                <Route path="taller" element={<TicketList />} />
                <Route path="devoluciones" element={<DevolucionesPage />} />

                {/* NUEVAS RUTAS ADMIN */}
                <Route path="configuracion" element={<ConfiguracionPage />} />
                <Route path="cierre-caja" element={<CierreCajaPage />} />

                <Route element={<RoleGuard allowedRoles={['SUPERADMIN']} />}>
                  <Route path="productos/nuevo" element={<FormularioProducto />} />
                  <Route path="cristales/nuevo" element={<FormularioCristal />} />
                </Route>
              </Route>
            </Route>

            {/* EMPLEADO */}
            <Route element={<RoleGuard allowedRoles={['ADMIN', 'SUPERADMIN', 'EMPLEADO']} />}>
              <Route path="/empleado" element={<EmpleadoHomePage />}>
                <Route path="nueva-venta" element={<FormularioVenta />} />
                <Route path="stock" element={<ConsultaStock />} />
                <Route path="clientes" element={<ConsultaCliente />} />
                <Route path="nueva-venta/pago" element={<FormularioDePago />} />
                <Route path="clientes/:cliente_id/historial" element={<HistorialPrescripciones />} />
                <Route path="devoluciones" element={<DevolucionesPage />} />

                {/* NUEVA RUTA EMPLEADO */}
                <Route path="cierre-caja" element={<CierreCajaPage />} />
              </Route>
            </Route>

            {/* TALLER */}
            <Route element={<RoleGuard allowedRoles={['ADMIN', 'SUPERADMIN', 'TALLER']} />}>
              <Route path="/taller" element={<TallerHomePage />}>
                <Route path="lista" element={<ListaTicketsTaller />} />
                <Route path="historial" element={<TicketsHistorial />} />
                <Route path="stock" element={<ConsultaStock />} />
              </Route>
            </Route>

          </Route>
        </Route>

        <Route element={<AuthGuard />}>
          <Route path="/pago-resultado" element={<PagoResultadoPage />} />
        </Route>

        <Route path='/' element={<Home />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
};