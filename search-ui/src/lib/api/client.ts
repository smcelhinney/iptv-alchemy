import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export const searchClient = axios.create({
  baseURL: API_BASE + '/search',
})

export const apiClient = axios.create({
  baseURL: API_BASE,
})
