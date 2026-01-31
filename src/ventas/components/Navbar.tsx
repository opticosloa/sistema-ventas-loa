import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Settings, ChevronDown, Wallet, Building2, Tag, Layers, MapPin } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { startLogout, updateUserBranch } from '../../store';
import { Logo } from './Logo';
import { UserWidget } from './UserWidget';
import { SideBar } from '.';
import { useUiStore } from '../../hooks';
import { ProfileEditModal } from './ProfileEditModal';
import { BulkPriceUpdateModal } from '../../components/modals/BulkPriceUpdateModal';
import { useBranch } from '../../context/BranchContext';
import LOAApi from '../../api/LOAApi';
import Swal from 'sweetalert2';

export const Navbar = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { role, nombre, apellido, uid } = useAppSelector((state: any) => state.auth);
  const { currentBranch, branches, setCurrentBranch } = useBranch();

  const { toggleSideBar } = useUiStore();

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showConfigDropdown, setShowConfigDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const configDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (configDropdownRef.current && !configDropdownRef.current.contains(event.target as Node)) {
        setShowConfigDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handlerLogout = () => {
    dispatch(startLogout());
    setShowDropdown(false);
  };

  const handleBranchSelect = async (branchId: string) => {
    const branch = branches.find(b => b.sucursal_id === branchId);
    if (branch) {
      try {
        if (uid) {
          await LOAApi.post('/api/tenants/user-branch', {
            usuario_id: uid,
            nueva_sucursal_id: branchId
          });
        }
        dispatch(updateUserBranch(branchId));
        setCurrentBranch(branch);
        setShowConfigDropdown(false);
        Swal.fire('Cambio exitoso', 'Se ha cambiado la sucursal exitosamente', 'success');
      } catch (e) {
        console.error("Failed to persist branch change", e);
      }


    }
  };


  const navigateHome = () => {
    if (!role) {
      navigate('/login');
      return;
    }

    switch (role) {
      case 'SUPERADMIN':
      case 'ADMIN':
        navigate('/admin');
        break;
      case 'EMPLEADO':
        navigate('/empleado');
        break;
      case 'TALLER':
        navigate('/taller');
        break;
      default:
        navigate('/login');
    }
  };


  return (
    <>
      <header className="block static top-0 w-full shadow-md z-50 bg-gradient-to-r from-azul to-celeste">
        <div
          className="flex items-center justify-between px-4 py-4 max-w-7xl mx-auto"
        >
          <div className="flex items-center gap-4">
            <a
              className="flex items-center cursor-pointer"
              onClick={navigateHome}
            >
              <Logo />
            </a>
          </div>

          <div className='hidden md:flex items-center gap-6'>
            {
              (role === 'ADMIN' || role === 'SUPERADMIN') && (
                <div className="flex items-center gap-4">
                  <Link
                    to="/taller"
                    className="text-white font-medium hover:text-gray-200 transition-colors px-3 py-2 rounded-md hover:bg-white/10"
                  >
                    Taller
                  </Link>
                  <Link
                    to="/empleado"
                    className="text-white font-medium hover:text-gray-200 transition-colors px-3 py-2 rounded-md hover:bg-white/10"
                  >
                    Empleados
                  </Link>
                  <Link
                    to="/admin/liquidaciones"
                    className="text-white font-medium hover:text-gray-200 transition-colors px-3 py-2 rounded-md hover:bg-white/10"
                  >
                    Liquidaciones
                  </Link>

                  {/* Config Dropdown */}
                  <div className="relative" ref={configDropdownRef}>
                    <button
                      className="text-white font-medium hover:text-gray-200 transition-colors px-3 py-2 rounded-md hover:bg-white/10 flex items-center gap-1"
                      onClick={() => setShowConfigDropdown(!showConfigDropdown)}
                    >
                      Configuración
                      <ChevronDown size={16} />
                    </button>

                    {showConfigDropdown && (
                      <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl overflow-hidden z-50 animate-fade-in-down border border-gray-100">
                        <div className="py-2">
                          {/* Branch Display / Switcher inside Dropdown */}
                          <div className="px-4 py-2 border-b border-gray-100 mb-2">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Sucursal Actual</p>
                            <div className="flex items-center gap-2 text-cyan-700 font-medium">
                              <MapPin size={16} />
                              <span>{currentBranch?.nombre || 'Desconocida'}</span>
                            </div>
                          </div>

                          {role === 'SUPERADMIN' && (
                            <div className="px-4 pb-2 border-b border-gray-100 mb-2">
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-xs font-bold text-gray-400 uppercase">Cambiar a:</p>
                                <Link to="/admin/configuracion/sucursales" className="text-[10px] text-cyan-600 hover:underline" onClick={() => setShowConfigDropdown(false)}>
                                  Gestionar
                                </Link>
                              </div>

                              {branches.length > 1 ? (
                                <div className="grid grid-cols-1 gap-1 max-h-[150px] overflow-y-auto custom-scrollbar">
                                  {branches.filter(b => b.sucursal_id !== currentBranch?.sucursal_id).map(branch => (
                                    <button
                                      key={branch.sucursal_id}
                                      onClick={() => handleBranchSelect(branch.sucursal_id!)}
                                      className="text-left text-sm text-gray-600 hover:text-cyan-600 hover:bg-cyan-50 px-2 py-1.5 rounded transition-colors flex items-center gap-2 w-full truncate"
                                      title={branch.nombre}
                                    >
                                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                                      <span className="truncate">{branch.nombre}</span>
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400 italic px-2">Solo una sucursal disponible</p>
                              )}
                            </div>
                          )}

                          <Link
                            to="/admin/configuracion"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-cyan-600 flex items-center gap-3"
                            onClick={() => setShowConfigDropdown(false)}
                          >
                            <Settings size={18} className="text-gray-400" />
                            <div>
                              <span className="font-semibold block">Configuración General</span>
                              <span className="text-xs text-gray-500">Divisas, Cristales, Métodos Pago</span>
                            </div>
                          </Link>

                          <Link
                            to="/admin/cierre-caja"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-cyan-600 flex items-center gap-3"
                            onClick={() => setShowConfigDropdown(false)}
                          >
                            <Wallet size={18} className="text-gray-400" />
                            Cierre de Caja
                          </Link>

                          <Link
                            to="/admin/configuracion/marcas"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-cyan-600 flex items-center gap-3"
                            onClick={() => setShowConfigDropdown(false)}
                          >
                            <Tag size={18} className="text-gray-400" />
                            Marcas
                          </Link>

                          <Link
                            to="/admin/configuracion/proveedores"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-cyan-600 flex items-center gap-3"
                            onClick={() => setShowConfigDropdown(false)}
                          >
                            <Building2 size={18} className="text-gray-400" />
                            Proveedores
                          </Link>

                          <Link
                            to="/admin/configuracion/obras-sociales"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-cyan-600 flex items-center gap-3"
                            onClick={() => setShowConfigDropdown(false)}
                          >
                            <Building2 size={18} className="text-gray-400" />
                            Obras Sociales
                          </Link>

                          <button
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-cyan-600 flex items-center gap-3 border-t border-gray-100"
                            onClick={() => { setShowConfigDropdown(false); setShowBulkPriceModal(true); }}
                          >
                            <Layers size={18} className="text-gray-400" />
                            Actualización Masiva
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            }

            {/* User Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                className="flex items-center justify-center rounded-full hover:bg-white/10 transition-colors duration-300 focus:outline-none"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <UserWidget />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl overflow-hidden z-50 animate-fade-in-down border border-gray-100">
                  <div className="px-4 py-3 border-b bg-gray-50">
                    <p className="text-sm font-semibold text-gray-800 truncate">{nombre} {apellido}</p>
                    <p className="text-xs text-gray-500 font-medium">{role}</p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowProfileModal(true);
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor"><path d="M420-160v-526l-60-60-336 336 160 160 236 90Zm-400-60 336-336 280-280q20-20 51-20t52 21l32 31q18 19 19 50.5t-21 52.5l-284 280-365 201Zm680-240v320H160v-166l-80-80v326q0 33 23.5 56.5T160-80h560q33 0 56.5-23.5T800-160v-380l-80 80Z" /></svg>
                      Editar Perfil
                    </button>

                    <div className="border-t my-1"></div>

                    <button
                      onClick={handlerLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h280v80H200Zm440-160-55-58 102-102H360v-80h327L585-622l55-58 200 200-200 200Z" /></svg>
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <span
            className="md:hidden flex text-blanco cursor-pointer"
            onClick={toggleSideBar}
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M234-276q51-39 114-61.5T480-360q69 0 132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 59 19.5 111t54.5 93Zm246-164q-59 0-99.5-40.5T340-580q0-59 40.5-99.5T480-720q59 0 99.5 40.5T620-580q0 59-40.5 99.5T480-440Zm0 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q53 0 100-15.5t86-44.5q-39-29-86-44.5T480-280q-53 0-100 15.5T294-220q39 29 86 44.5T480-160Zm0-360q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm0-60Zm0 360Z" /></svg>
          </span>
          <SideBar />

        </div>
      </header>

      {showProfileModal && (
        <ProfileEditModal onClose={() => setShowProfileModal(false)} />
      )}

      <BulkPriceUpdateModal isOpen={showBulkPriceModal} onClose={() => setShowBulkPriceModal(false)} />
    </>
  )
}
