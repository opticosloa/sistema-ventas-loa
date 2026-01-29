import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useForm } from '../../hooks';
import { startLoginWithEmailPassword, startLogout } from '../../store';
import { Footer } from '../components';
import type { LoginFormValues } from '../../types/LoginTypes';
import { useEffect, useState } from 'react';


const loginFormFields: LoginFormValues = {
    loginEmail: '',
    loginPassword: '',
}

export const LoginPage = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { formState, onInputChange, setFieldValue } = useForm(loginFormFields);
    const { loginEmail, loginPassword } = formState;
    const { status, role, sucursal_id, nombre } = useAuthStore();



    const [showLocationWarning, setShowLocationWarning] = useState(false);
    const [lastKnownBranch, setLastKnownBranch] = useState<string | null>(null);

    const onLoginWithEmailPassword = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const result = await dispatch(startLoginWithEmailPassword({
            email: loginEmail,
            password: loginPassword,
        }));

        if (!result) {
            setFieldValue('loginPassword', '');
        }

        return result;
    };

    const handleConfirmLocation = () => {
        // User confirmed they are at their assigned branch
        if (role !== 'SUPERADMIN') { // SUPERADMIN handles their own context
            localStorage.setItem('branch_context_id', lastKnownBranch || ''); // Actually we update to USER's branch?
            // Task says: "Si, Continuar (actualiza context)"
            // If I am User A (Branch A). Browser thinks Branch B.
            // Warning: "You are assigned to A. Are you physically there?"
            // If YES -> Browser should now think Branch A.
            // So we update localStorage to matches user.sucursal_id ?
            // Or is it checking if I am at Branch B (Browser)?
            // If I say YES (I am at A), then Browser becomes A.
            // Correct.
        }
        localStorage.setItem('last_known_branch_id', sucursal_id || '');
        navigateBasedOnRole();
    };

    const handleLogout = () => {
        // User said NO (I am not at assigned branch, or I am just ensuring security)
        dispatch(startLogout()); // Logout
        setShowLocationWarning(false);
    };

    const navigateBasedOnRole = () => {
        switch (role) {
            case 'SUPERADMIN':
            case 'ADMIN':
                navigate('/admin', { replace: true });
                break;
            case 'EMPLEADO':
                navigate('/empleado', { replace: true });
                break;
            case 'TALLER':
                navigate('/taller', { replace: true });
                break;
            default:
                console.warn('Rol no reconocido:', role);
                navigate('/login', { replace: true });
        }
    }

    useEffect(() => {
        if (status !== 'authenticated') return;

        // Check Location logic
        const storedBranch = localStorage.getItem('last_known_branch_id');

        // If first time (no stored branch), set it and proceed.
        // Or if SUPERADMIN, skip check (they switch manually).
        if (role === 'SUPERADMIN') {
            navigateBasedOnRole();
            return;
        }

        if (!storedBranch) {
            localStorage.setItem('last_known_branch_id', sucursal_id || '');
            navigateBasedOnRole();
            return;
        }

        // Mismatch check
        if (sucursal_id && storedBranch !== sucursal_id) {
            setLastKnownBranch(storedBranch); // Keep track of what it was
            setShowLocationWarning(true);
        } else {
            navigateBasedOnRole();
        }

    }, [status, role, navigate, sucursal_id]);

    if (showLocationWarning) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
                <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center border-l-4 border-yellow-500">
                    <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4 text-yellow-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Advertencia de Ubicación</h2>

                    <p className="text-gray-600 mb-6">
                        Tu usuario <strong>{nombre}</strong> está asignado a la sucursal:
                        <br />
                        <span className="text-lg font-bold text-cyan-600 block mt-1 uppercase">{/* We likely don't have branch name here unless in user object or fetched. User object usually has sucursal_id. Displaying ID or generic is safe. */} {sucursal_id} </span>

                        <span className="text-sm block mt-4 text-gray-500">Esta computadora estaba operando en una sucursal diferente.</span>
                    </p>

                    <div className="text-lg font-medium text-gray-900 mb-8">
                        ¿Estás físicamente en tu sucursal asignada?
                    </div>

                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={handleLogout}
                            className="px-5 py-2.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-medium transition-colors"
                        >
                            No, Cerrar Sesión
                        </button>
                        <button
                            onClick={handleConfirmLocation}
                            className="px-5 py-2.5 rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 shadow-lg font-medium transition-transform active:scale-95"
                        >
                            Sí, Continuar
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="flex h-full w-screen mt-36 items-center justify-center">
                <div className="flex place-content-center justify-self-center shadow-lg rounded-lg bg-azul p-16">
                    <div >
                        <div className="flex-row">
                            <h3 className="text-blanco text-2xl mb-6">Inicie sesión</h3>
                            <form
                                onSubmit={onLoginWithEmailPassword}
                                className="flex flex-col justify-center items-center"
                            >
                                <div className="flex justify-center my-3 shadow-sm rounded-md h-10">
                                    <input
                                        type="text"
                                        className="text-gray-500 rounded-sm pl-2 bg-crema"
                                        placeholder="Correo"
                                        name="loginEmail"
                                        value={loginEmail}
                                        onChange={onInputChange}
                                    />
                                </div>
                                <div className="flex justify-center my-3 shadow-sm rounded-md">
                                    <input
                                        type="password"
                                        className="text-gray-500 rounded-sm pl-2 bg-crema h-10"
                                        placeholder="Contraseña"
                                        name="loginPassword"
                                        value={loginPassword}
                                        onChange={onInputChange}
                                    />
                                </div>

                                <div>
                                    <button
                                        type="submit"
                                        className="flex my-4 px-4 py-2 w-48 h-12 justify-center text-blanco text-lg border-2 border-crema rounded-lg hover:bg-celeste hover:opacity-70 transition-colors duration-300"
                                    >
                                        Ingresar
                                    </button>
                                </div>

                            </form>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </>

    )
}
