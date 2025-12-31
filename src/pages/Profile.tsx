import { createSignal, Show, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { currentUser, updateProfile, logout, pb } from '../lib/pocketbase';
import NotificationModal from '../components/NotificationModal';

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
            await pb.collection('users').update(currentUser()!.id, {
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
            await pb.collection('users').delete(currentUser()!.id);
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
                <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                    <div class="flex items-center gap-4 mb-8">
                        <div class="w-20 h-20 bg-zinc-700 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                            {currentUser()?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                            <h2 class="text-xl font-bold text-white">{currentUser()?.name}</h2>
                            <p class="text-gray-400">{currentUser()?.email}</p>
                            <Show when={currentUser()?.proUser}>
                                <span class="inline-block mt-2 px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-gray-400 font-semibold">
                                    PRO USER
                                </span>
                            </Show>
                        </div>
                    </div>

                    <form onSubmit={handleUpdateProfile} class="space-y-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">
                                Display Name
                            </label>
                            <input
                                type="text"
                                value={name()}
                                onInput={(e) => setName(e.currentTarget.value)}
                                required
                                class="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email()}
                                onInput={(e) => setEmail(e.currentTarget.value)}
                                required
                                class="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading()}
                            class="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                        <h3 class="text-xl font-bold text-white mb-6">Change Password</h3>
                        
                        <form onSubmit={handleChangePassword} class="space-y-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">
                                    Current Password
                                </label>
                                <input
                                    type="password"
                                    value={currentPassword()}
                                    onInput={(e) => setCurrentPassword(e.currentTarget.value)}
                                    required
                                    class="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    value={newPassword()}
                                    onInput={(e) => setNewPassword(e.currentTarget.value)}
                                    required
                                    minLength={8}
                                    class="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword()}
                                    onInput={(e) => setConfirmPassword(e.currentTarget.value)}
                                    required
                                    minLength={8}
                                    class="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading()}
                                class="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                    class="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 animate-fadeIn"
                    onClick={() => setDeleteConfirm(false)}
                >
                    <div 
                        class="bg-zinc-900 border border-red-600/30 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-scaleIn"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div class="flex items-start gap-4 mb-6">
                            <div class="text-4xl">⚠️</div>
                            <div class="flex-1">
                                <h3 class="text-xl font-bold text-white mb-2">Delete Account?</h3>
                                <p class="text-gray-300 leading-relaxed">
                                    Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.
                                </p>
                            </div>
                        </div>

                        <div class="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(false)}
                                class="flex-1 px-6 py-2.5 bg-zinc-800 text-white font-semibold rounded-lg hover:bg-zinc-700 transition-all duration-200"
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
