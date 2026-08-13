import { useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function ChangePasswordModal({ trigger }: { trigger: React.ReactNode }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { user } = useAuth();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      // Vérifier l'ancien mot de passe via /auth/login
      await api.post('/auth/login', {
        username: user?.username,
        password: oldPassword,
      });

      // Modifier le mot de passe via /users/:id
      await api.put(`/users/${user?.id}`, {
        password: newPassword,
      });

      setSuccess('Mot de passe modifié avec succès.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setError('Ancien mot de passe incorrect.');
      } else if (err?.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Erreur lors de la modification du mot de passe.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le mot de passe</DialogTitle>
          <DialogDescription>
            Veuillez renseigner les champs pour modifier votre mot de passe.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Ancien mot de passe</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-zinc-900"
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Nouveau mot de passe</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-zinc-900"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Confirmation du mot de passe</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-zinc-900"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">{success}</div>}
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? 'Modification...' : 'Valider'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
