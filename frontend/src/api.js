import axios from "axios"
import { ACCESS_TOKEN } from "./constants"

// Set VITE_API_URL to point at a different backend (Docker passes it in at
// build time). Defaults to the local Django dev server.
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
})

// Attach the JWT access token to every request.
api.interceptors.request.use((config) => {
    const token = localStorage.getItem(ACCESS_TOKEN)
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

export default api
