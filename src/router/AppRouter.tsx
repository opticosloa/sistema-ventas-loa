import { Routes, Route } from 'react-router-dom';
import { Navbar, ConsultaStock, ConsultaCliente, TicketList, TicketsHistorial, Estadisticas, ListaEmpleados, Home, HistorialPrescripciones } from '../ventas/components';
import { LoginPage, NotFoundPage, PagoResultadoPage, UnAuthorized, DevolucionesPage } from '../ventas/page';

import { HomePage, EmpleadoHomePage, TallerHomePage } from '../page';
import { AuthGuard, RoleGuard, TenantGuard } from '../auth/guards';
import { useAuthStore } from '../hooks';
import { FormularioDePago, FormularioVenta } from '../forms';

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
                <Route path="estado-taller" element={<TicketList />} />
                <Route path="empleados" element={<ListaEmpleados />} />
                <Route path="taller" element={<TicketList />} />
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
              </Route>
              <Route path="/ventas/devoluciones" element={<DevolucionesPage />} />
            </Route>


            {/* TALLER */}
            <Route element={<RoleGuard allowedRoles={['ADMIN', 'SUPERADMIN', 'TALLER']} />}>
              <Route path="/taller" element={<TallerHomePage />}>
                <Route path="lista" element={<TicketList />} />
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
