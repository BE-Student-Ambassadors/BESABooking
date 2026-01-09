import axios from 'axios'

const api = axios.create({
    // baseURL: 'https://besabookingapi.vercel.app/',
    baseURL: "http://127.0.0.1:8000"

})


export default api;
