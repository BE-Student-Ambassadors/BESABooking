import { useEffect, useState, type FormEvent } from 'react';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { AlertCircle, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { auth } from '../../../../src/firebaseAuth.ts';

export default function SettingsView() {
  const [currentEmail, setCurrentEmail] = useState<string>(auth.currentUser?.email || '');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentEmail(user?.email || '');
    });
    return () => unsubscribe();
  }, []);

  const ensureUser = () => {
    const user = auth.currentUser;
    if (!user) throw new Error('You need to be signed in to update settings.');
    if (!user.email) throw new Error('Missing email for the current user.');
    return user;
  };

  const reauthenticate = async (password: string) => {
    const user = ensureUser();
    const credential = EmailAuthProvider.credential(user.email!, password);
    await reauthenticateWithCredential(user, credential);
    return user;
  };

  const handlePasswordUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setError('Please fill out all password fields.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setPasswordLoading(true);
    try {
      const user = await reauthenticate(passwordForm.currentPassword);
      await updatePassword(user, passwordForm.newPassword);
      setMessage('Password updated successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      const msg = err?.message || 'Unable to update password.';
      setError(msg.includes('recent login') ? 'Please sign in again and retry.' : msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck className="h-7 w-7 text-blue-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600 text-sm">Manage your admin login email and password.</p>
        </div>
      </div>

      {(error || message) && (
        <div
          className={`mb-6 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
            error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'
          }`}
        >
          {error ? <AlertCircle className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
          <span>{error || message}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Account Email</h2>
          </div>
          <p className="text-sm text-gray-600">
            This is the email currently associated with your admin account. Email changes are managed by a site admin.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Email</label>
            <input
              value={currentEmail}
              disabled
              className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-gray-700"
            />
          </div>
        </div>

        <form onSubmit={handlePasswordUpdate} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Update Password</h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={passwordLoading}
            className="w-full inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-white font-semibold hover:bg-blue-800 transition-colors disabled:opacity-60"
          >
            {passwordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
