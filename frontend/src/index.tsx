/* @refresh reload */
import { render } from 'solid-js/web'
import './style.css'
import App from './App'
import { AuthProvider } from './AuthContext'

const root = document.getElementById('root')

render(() => (
  <AuthProvider>
    <App />
  </AuthProvider>
), root!)
