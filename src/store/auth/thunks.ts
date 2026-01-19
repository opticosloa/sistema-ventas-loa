import { checkingCredential, login, logout } from './authSlice';
import LOAApi from '../../api/LOAApi';
import Swal from 'sweetalert2';

export const startLoginWithEmailPassword = ({ email, password }: { email: string; password: string }) => {
    return async (dispatch: any) => {

        dispatch(checkingCredential());

        try {

            const { data } = await LOAApi.post('/api/users/login', { email, password });

            // Backend returns: { success: true, user: { ... }, token: "..." }
            // The cookie is set by the browser automatically due to withCredentials: true.
            // We still receive the token in body but we don't need to save it manually.

            const { user } = data;

            dispatch(login({
                uid: user.id,
                email: user.email,
                role: user.rol.toUpperCase(),
                nombre: user.nombre,
                apellido: user.apellido,
                sucursal_id: user.sucursal_id,
                max_descuento: user.max_descuento
            }));

            return true;

        } catch (error: any) {
            Swal.fire('Error', 'Usuario/Contraseña incorrectos', 'error');
            dispatch(logout({ errorMessage: error.response?.data?.error || 'Error en la autenticación' }));
            return false;
        }

    }
}


export const startLogout = () => {
    return async (dispatch: any) => {

        try {
            await LOAApi.post('/api/users/logout');
        } catch (error) {
            console.log(error);
        }
        finally {
            dispatch(logout({}));
        }

    }
}

export const checkAuthToken = () => {
    return async (dispatch: any) => {

        dispatch(checkingCredential());

        try {
            const { data } = await LOAApi.get('/api/users/validate-token');

            if (!data.success) return dispatch(logout({}));

            const { user } = data;

            dispatch(login({
                uid: user.id,
                email: user.email,
                role: user.rol,
                nombre: user.nombre,
                apellido: user.apellido,
                sucursal_id: user.sucursal_id,
                max_descuento: user.max_descuento
            }));

        } catch (error) {
            dispatch(logout({}));
        }

    }
}

export const checkingAuthentication = () => {
    return async (dispatch: any) => {
        dispatch(checkingCredential());
    }
}

