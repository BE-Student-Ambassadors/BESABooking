import axios from 'axios'

const api = axios.create({
    // Production uses the Vercel function on this same domain. Set this only
    // when intentionally using a separately hosted API.
    baseURL: import.meta.env.VITE_API_BASE_URL ?? ""
})





export default api;
