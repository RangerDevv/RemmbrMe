import { createSignal, Show, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { currentUser, updateProfile, logout, bk } from '../lib/backend.ts';
import { WarningIcon } from '../components/Icons';

export default function Profile() {
    const navigate = useNavigate();
    const [name, setName] = createSignal(currentUser()?.name || '');
    const [email, setEmail] = createSignal(currentUser()?.email || '');
    const [currentPassword, setCurrentPassword] = createSignal('');
    const [newPassword, setNewPassword] = createSignal('');
    const [confirmPassword, setConfirmPassword] = createSignal('');
    const [success, setSuccess] = createSignal('');
    const [error, setError] = createSignal('');
    const [loading, setLoading] = createSignal(false);
    const [deleteConfirm, setDeleteConfirm] = createSignal(false);
    const [activeTab, setActiveTab] = createSignal<'profile' | 'security'>('profile');

    onMount(() => {
        if (!currentUser()) {
            navigate('/login');
        }
    });

    const handleUpdateProfile = async (e: Event) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        const result = await updateProfile(currentUser()!.id, {
            name: name(),
            email: email()
        });

        if (result.success) {
            setSuccess('Profile updated successfully!');
        } else {
            setError(result.error || 'Failed to update profile');
        }

        setLoading(false);
    };

    const handleChangePassword = async (e: Event) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword() !== confirmPassword()) {
            setError('New passwords do not match');
            return;
        }

        if (newPassword().length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);

        try {
            await bk.collection('users').update(currentUser()!.id, {
                oldPassword: currentPassword(),
                password: newPassword(),
                passwordConfirm: confirmPassword()
            });

            setSuccess('Password changed successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setError(err.message || 'Failed to change password');
        }

        setLoading(false);
    };

    const handleDeleteAccount = async () => {
        setDeleteConfirm(true);
    };

    const confirmDeleteAccount = async () => {
        setDeleteConfirm(false);
        
        try {
            await bk.collection('users').delete(currentUser()!.id);
            logout();
            navigate('/signup');
        } catch (err: any) {
            setError(err.message || 'Failed to delete account');
        }
    };

    return (
        <div class="flex-1 max-w-4xl mx-auto">
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-white mb-2">Settings</h1>
                <p class="text-gray-400">Manage your account settings and preferences</p>
            </div>

            {/* Tabs */}
            <div class="flex gap-2 mb-6 border-b border-zinc-800">
                <button
                    onClick={() => setActiveTab('profile')}
                    class={`px-6 py-3 font-medium transition-all border-b-2 ${
                        activeTab() === 'profile'
                            ? 'border-blue-500 text-blue-400'
                            : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                >
                    Profile
                </button>
                <button
                    onClick={() => setActiveTab('security')}
                    class={`px-6 py-3 font-medium transition-all border-b-2 ${
                        activeTab() === 'security'
                            ? 'border-blue-500 text-blue-400'
                            : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                >
                    Security
                </button>
            </div>

            {/* Success/Error Messages */}
            <Show when={success()}>
                <div class="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-xl text-green-400">
                    {success()}
                </div>
            </Show>

            <Show when={error()}>
                <div class="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400">
                    {error()}
                </div>
            </Show>

            {/* Profile Tab */}
            <Show when={activeTab() === 'profile'}>
                <div class="glass rounded-2xl p-8">
                    <div class="flex items-center gap-4 mb-8">
                        <div class="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold" style={{ "background-color": "var(--color-accent-muted)", "color": "var(--color-accent)" }}>
                            {currentUser()?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                            <h2 class="text-xl font-bold" style={{ "color": "var(--color-text)" }}>{currentUser()?.name}</h2>
                            <p style={{ "color": "var(--color-text-muted)" }}>{currentUser()?.email}</p>
                            <Show when={currentUser()?.proUser}>
                                <span class="inline-block mt-2 px-3 py-1 rounded-lg text-xs font-semibold" style={{ "background-color": "var(--color-bg-tertiary)", "border": "1px solid var(--color-border)", "color": "var(--color-text-muted)" }}>
                                    PRO USER
                                </span>
                            </Show>
                        </div>
                    </div>

                    <form onSubmit={handleUpdateProfile} class="space-y-6">
                        <div>
                            <label class="block text-sm font-medium mb-2" style={{ "color": "var(--color-text-secondary)" }}>
                                Display Name
                            </label>
                            <input
                                type="text"
                                value={name()}
                                onInput={(e) => setName(e.currentTarget.value)}
                                required
                                class="w-full px-4 py-3 rounded-xl transition-all focus:outline-none"
                                style={{ "background-color": "var(--color-bg-tertiary)", "border": "1px solid var(--color-border)", "color": "var(--color-text)" }}
                            />
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-2" style={{ "color": "var(--color-text-secondary)" }}>
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email()}
                                onInput={(e) => setEmail(e.currentTarget.value)}
                                required
                                class="w-full px-4 py-3 rounded-xl transition-all focus:outline-none"
                                style={{ "background-color": "var(--color-bg-tertiary)", "border": "1px solid var(--color-border)", "color": "var(--color-text)" }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading()}
                            class="px-6 py-3 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ "background-color": "var(--color-accent)", "color": "var(--color-accent-text)" }}
                        >
                            {loading() ? 'Saving...' : 'Save Changes'}
                        </button>
                    </form>
                </div>
            </Show>

            {/* Security Tab */}
            <Show when={activeTab() === 'security'}>
                <div class="space-y-6">
                    {/* Change Password */}
                    <div class="glass rounded-2xl p-8">
                        <h3 class="text-xl font-bold mb-6" style={{ "color": "var(--color-text)" }}>Change Password</h3>
                        
                        <form onSubmit={handleChangePassword} class="space-y-6">
                            <div>
                                <label class="block text-sm font-medium mb-2" style={{ "color": "var(--color-text-secondary)" }}>
                                    Current Password
                                </label>
                                <input
                                    type="password"
                                    value={currentPassword()}
                                    onInput={(e) => setCurrentPassword(e.currentTarget.value)}
                                    required
                                    class="w-full px-4 py-3 rounded-xl transition-all focus:outline-none"
                                    style={{ "background-color": "var(--color-bg-tertiary)", "border": "1px solid var(--color-border)", "color": "var(--color-text)" }}
                                    placeholder="••••••••"
                                />
                            </div>

                            <div>
                                <label class="block text-sm font-medium mb-2" style={{ "color": "var(--color-text-secondary)" }}>
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    value={newPassword()}
                                    onInput={(e) => setNewPassword(e.currentTarget.value)}
                                    required
                                    minLength={8}
                                    class="w-full px-4 py-3 rounded-xl transition-all focus:outline-none"
                                    style={{ "background-color": "var(--color-bg-tertiary)", "border": "1px solid var(--color-border)", "color": "var(--color-text)" }}
                                    placeholder="••••••••"
                                />
                            </div>

                            <div>
                                <label class="block text-sm font-medium mb-2" style={{ "color": "var(--color-text-secondary)" }}>
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword()}
                                    onInput={(e) => setConfirmPassword(e.currentTarget.value)}
                                    required
                                    minLength={8}
                                    class="w-full px-4 py-3 rounded-xl transition-all focus:outline-none"
                                    style={{ "background-color": "var(--color-bg-tertiary)", "border": "1px solid var(--color-border)", "color": "var(--color-text)" }}
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading()}
                                class="px-6 py-3 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ "background-color": "var(--color-accent)", "color": "var(--color-accent-text)" }}
                            >
                                {loading() ? 'Changing...' : 'Change Password'}
                            </button>
                        </form>
                    </div>

                    {/* Danger Zone */}
                    <div class="bg-red-500/5 border border-red-500/20 rounded-2xl p-8">
                        <h3 class="text-xl font-bold text-red-400 mb-2">Danger Zone</h3>
                        <p class="text-gray-400 mb-6">
                            Once you delete your account, there is no going back. All your data will be permanently deleted.
                        </p>
                        
                        <button
                            onClick={handleDeleteAccount}
                            class="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-all"
                        >
                            Delete Account
                        </button>
                    </div>
                </div>
            </Show>

            {/* Delete Confirmation Modal */}
            <Show when={deleteConfirm()}>
                <div 
                    class="fixed inset-0 glass-overlay flex items-center justify-center z-[100] p-4 animate-fadeIn"
                    onClick={() => setDeleteConfirm(false)}
                >
                    <div 
                        class="glass-modal rounded-2xl p-6 max-w-md w-full animate-scaleIn" style={{ "border-color": "var(--color-danger)" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div class="flex items-start gap-4 mb-6">
                            <WarningIcon class="w-10 h-10 text-red-400 shrink-0" />
                            <div class="flex-1">
                                <h3 class="text-xl font-bold mb-2" style={{ "color": "var(--color-text)" }}>Delete Account?</h3>
                                <p class="leading-relaxed" style={{ "color": "var(--color-text-secondary)" }}>
                                    Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.
                                </p>
                            </div>
                        </div>

                        <div class="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(false)}
                                class="flex-1 px-6 py-2.5 font-semibold rounded-lg transition-all duration-200"
                                style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text)", "border": "1px solid var(--color-border)" }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteAccount}
                                class="flex-1 px-6 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-500 transition-all duration-200"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </Show>
        </div>
    );
}
