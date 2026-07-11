import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)

// Register service worker for PWA offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (reg) => console.log('[SW] registered, scope:', reg.scope),
      (err) => console.warn('[SW] registration failed:', err),
    )
  })
} else {
  console.warn('[SW] serviceWorker not supported in this browser')
}
