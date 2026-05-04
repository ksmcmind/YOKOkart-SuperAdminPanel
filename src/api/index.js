// src/api/index.js
// Change BASE_URL if backend runs on different port
const BASE_URL = 'http://localhost:3000/api'

// import.meta.env.VITE_API_URL ||

export const getToken = () => localStorage.getItem('ksmcm_token') || ''

const request = async (method, path, body = null) => {
    const isFormData = body instanceof FormData

    const options = {
        method,
        credentials: 'include', // Include cookies in cross-origin requests
        headers: {
            ...(!isFormData && { 'Content-Type': 'application/json' }),
            'X-Client-Type': 'web', // Tell backend to use cookies
        },
    }

    if (body) options.body = isFormData ? body : JSON.stringify(body)

    const res = await fetch(`${BASE_URL}${path}`, options)
    const data = await res.json()

    if (res.status === 401) {
        localStorage.clear()
        if (path !== '/auth/me' && window.location.pathname !== '/login') {
            window.location.href = '/login'
        }
    }

    return data
}

export const api = {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    patch: (path, body) => request('PATCH', path, body),
    put: (path, body) => request('PUT', path, body),
    delete: (path) => request('DELETE', path),
}

export default api