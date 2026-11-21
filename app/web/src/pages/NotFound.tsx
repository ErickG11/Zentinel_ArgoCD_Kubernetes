import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="container page">
      <div className="state">
        <p className="eyebrow">Error 404</p>
        <h1>Esta página no existe</h1>
        <p className="muted">Quizá el enlace cambió o el producto ya no está disponible.</p>
        <Link to="/" className="btn btn--primary">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
