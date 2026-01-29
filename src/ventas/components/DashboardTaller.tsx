import { Outlet, useNavigate } from "react-router-dom";
import { useAppSelector } from "../../hooks";
import { useBranch } from '../../context/BranchContext';

export const DashboardTaller = () => {
    const navigate = useNavigate();
    const { nombre } = useAppSelector(state => state.auth);
    const { currentBranch } = useBranch();

    return (
        <div className="min-h-screen w-full bg-gradient-to-r from-[#006684] to-[#2db1c3] flex flex-col">
            <div className="w-full px-8 py-6">

                <h1 className="text-3xl text-white font-semibold mb-8 text-center drop-shadow-md">
                    Bienvenido, {nombre}
                    <span className="text-xl ml-3 opacity-90 font-normal border-l pl-3 border-white/40">
                        {currentBranch?.nombre}
                    </span>
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">

                    {/* Botón Tickets */}
                    <button
                        onClick={() => navigate("/taller/lista")}
                        className="
                            group relative overflow-hidden rounded-xl border border-white/60 
                            bg-white/10 backdrop-blur-sm p-6 text-white shadow-lg 
                            transition-all hover:bg-white/20 hover:scale-[1.02]
                        "
                    >
                        <div className="flex flex-col items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mb-2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v4.5c0 .621.504 1.125 1.125 1.125h4.5c.621 0 1.125-.504 1.125-1.125V6.375c0-.621-.504-1.125-1.125-1.125H3.375Zm0 9.75c-.621 0-1.125.504-1.125 1.125v4.5c0 .621.504 1.125 1.125 1.125h4.5c.621 0 1.125-.504 1.125-1.125v-4.5c0-.621-.504-1.125-1.125-1.125H3.375Zm9.75-9.75c-.621 0-1.125.504-1.125 1.125v4.5c0 .621.504 1.125 1.125 1.125h4.5c.621 0 1.125-.504 1.125-1.125V6.375c0-.621-.504-1.125-1.125-1.125h-4.5Z" />
                            </svg>
                            <span className="text-xl font-semibold tracking-wide">Tickets Activos</span>
                            <span className="text-sm text-white/80">Gestionar pedidos en curso</span>
                        </div>
                    </button>

                    {/* Botón Historial */}
                    <button
                        onClick={() => navigate("/taller/historial")}
                        className="
                             group relative overflow-hidden rounded-xl border border-white/60 
                            bg-white/10 backdrop-blur-sm p-6 text-white shadow-lg 
                            transition-all hover:bg-white/20 hover:scale-[1.02]
                        "
                    >
                        <div className="flex flex-col items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mb-2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                            <span className="text-xl font-semibold tracking-wide">Historial</span>
                            <span className="text-sm text-white/80">Tickets entregados y finalizados</span>
                        </div>
                    </button>

                    {/* Botón Stock */}
                    <button
                        onClick={() => navigate("/taller/stock")}
                        className="
                             group relative overflow-hidden rounded-xl border border-white/60 
                            bg-white/10 backdrop-blur-sm p-6 text-white shadow-lg 
                            transition-all hover:bg-white/20 hover:scale-[1.02]
                        "
                    >
                        <div className="flex flex-col items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mb-2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                            </svg>
                            <span className="text-xl font-semibold tracking-wide">Stock Insumos</span>
                            <span className="text-sm text-white/80">Control de cristales y armazones</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8">
                <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/30 p-6 shadow-2xl min-h-[500px]">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}
