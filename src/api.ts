import axios from 'axios'

const api = axios.create({
    baseURL: 'https://besabookingapi.vercel.app/',
})


export default api;
