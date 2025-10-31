import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import WorkspacePage from './pages/Workspace';
import DocumentPage from './pages/Document';
import PublicDocumentsPage from './pages/PublicDocuments';
import { ProtectedRoute } from './components/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <div className='min-h-screen bg-gray-50'>
            <Routes>
              <Route path='/login' element={<Login />} />
              <Route path='/register' element={<Register />} />
              <Route
                path='/*'
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Routes>
                        <Route path='/' element={<Dashboard />} />
                        <Route
                          path='/workspace/:id'
                          element={<WorkspacePage />}
                        />
                        <Route
                          path='/document/:id'
                          element={<DocumentPage />}
                        />
                        <Route
                          path='/public-documents'
                          element={<PublicDocumentsPage />}
                        />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
            <Toaster position='top-right' />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
