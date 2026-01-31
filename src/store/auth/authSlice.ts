import { createSlice } from '@reduxjs/toolkit';
import type { AuthState } from '../../types/AuthSlice';

const initialState: AuthState = {
    status: 'checking',
    uid: null,
    email: null,
    role: null,
    nombre: null,
    apellido: null,
    sucursal_id: null,
    sucursal_name: null,
    errorMessage: null,
    max_descuento: 0,
}

export const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        login: (state, { payload }) => {
            state.status = 'authenticated';
            state.uid = payload.uid;
            state.email = payload.email;
            state.role = payload.role;
            state.nombre = payload.nombre;
            state.apellido = payload.apellido;
            state.sucursal_id = payload.sucursal_id;
            state.sucursal_name = payload.sucursal_name;
            state.errorMessage = null;
            state.max_descuento = payload.max_descuento || 0;
        },
        logout: (state, { payload }) => {
            state.status = 'not-authenticated';
            state.uid = null;
            state.email = null;
            state.role = null;
            state.nombre = null;
            state.apellido = null;
            state.sucursal_id = null;
            state.sucursal_name = null;
            state.errorMessage = payload?.errorMessage;
            state.max_descuento = 0;
        },
        checkingCredential: (state) => {
            state.status = 'checking';
        },
        clearErrorMessage: (state) => {
            state.errorMessage = null;
        },
        updateUserBranch: (state, action) => {
            state.sucursal_id = action.payload;
        }
    }
});

export const { login, logout, checkingCredential, clearErrorMessage, updateUserBranch } = authSlice.actions;