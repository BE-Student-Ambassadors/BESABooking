import axios from 'axios';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || '';

const api = axios.create({
  baseURL: configuredBaseUrl,
});

export default api;
