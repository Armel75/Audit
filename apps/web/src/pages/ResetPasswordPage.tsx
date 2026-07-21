// src/pages/ResetPasswordPage.tsx

import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const API_BASE = import.meta.env.VITE_API_URL;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError('Token invalide');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          token,
          newPassword: password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur');
      }

      setSuccess('Mot de passe mis à jour');

      setTimeout(() => {
        navigate('/audit/login');
      }, 2000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow w-full max-w-md"
      >
        <h2 className="text-xl font-semibold mb-4">
          Nouveau mot de passe
        </h2>

        {error && <p className="text-red-600 mb-3">{error}</p>}
        {success && <p className="text-green-600 mb-3">{success}</p>}

        <input
          type="password"
          placeholder="Nouveau mot de passe"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 p-3 border rounded-xl"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-3 rounded-xl"
        >
          {loading ? 'Chargement...' : 'Réinitialiser'}
        </button>
      </form>
    </div>
  );
}