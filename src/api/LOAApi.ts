import axios from 'axios';
import { getEnvironments } from '../helpers';

const LOAApi = axios.create({
    baseURL: getEnvironments().VITE_API_URL,
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true' // Esto salta la página de aviso de ngrok automáticamente
    },
    withCredentials: true
});

export default LOAApi;