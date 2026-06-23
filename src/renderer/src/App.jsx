import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Inventory from './pages/Inventory'
import Orders from './pages/Orders'
import Finance from './pages/Finance'
import Customers from './pages/Customers'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/inventory" replace />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="orders" element={<Orders />} />
          <Route path="finance" element={<Finance />} />
          <Route path="customers" element={<Customers />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
