import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import Dashboard from '@/pages/Dashboard';
import Templates from '@/pages/Templates';
import Clients from '@/pages/Clients';
import InvoiceBuilder from '@/pages/InvoiceBuilder';
import SavedInvoices from '@/pages/SavedInvoices';
import Projects from '@/pages/Projects';
import Payments from '@/pages/Payments';

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/builder" element={<InvoiceBuilder />} />
            <Route path="/invoices" element={<SavedInvoices />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
        <SonnerToaster theme="dark" position="top-right" />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App