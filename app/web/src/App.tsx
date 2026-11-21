import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AssistantPage } from './pages/Assistant';
import { BuilderPage } from './pages/Builder';
import { CatalogPage } from './pages/Catalog';
import { CheckoutPage } from './pages/Checkout';
import { ComparePage } from './pages/Compare';
import { ConfirmationPage } from './pages/Confirmation';
import { HomePage } from './pages/Home';
import { NotFoundPage } from './pages/NotFound';
import { ProductPage } from './pages/Product';
import { StatusPage } from './pages/Status';
import { VerifyPage } from './pages/Verify';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="catalogo" element={<CatalogPage />} />
        <Route path="producto/:id" element={<ProductPage />} />
        <Route path="comparar" element={<ComparePage />} />
        <Route path="armador" element={<BuilderPage />} />
        <Route path="asistente" element={<AssistantPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="pedido/confirmacion" element={<ConfirmationPage />} />
        <Route path="pedido/verificar" element={<VerifyPage />} />
        <Route path="pedido/verificar/:token" element={<VerifyPage />} />
        <Route path="estado" element={<StatusPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
