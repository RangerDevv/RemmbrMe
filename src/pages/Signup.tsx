import { createSignal, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { signup } from '../lib/backend.ts';

export default function Signup() {
    const navigate = useNavigate();
    const [name, setName] = createSignal('');
    const [email, setEmail] = createSignal('');
    const [password, setPassword] = createSignal('');
    const [passwordConfirm, setPasswordConfirm] = createSignal('');
    const [error, setError] = createSignal('');
    const [loading, setLoading] = createSignal(false);

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        setError('');

        if (password() !== passwordConfirm()) {
            setError('Passwords do not match');
            return;
        }

        if (password().length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);

        const result = await signup(email(), password(), passwordConfirm(), name());
        
        if (result.success) {
            // Small delay to ensure auth state propagates before navigation
            setTimeout(() => {
                navigate('/');
            }, 50);
        } else {
            setError(result.error || 'Signup failed');
        }
        
        setLoading(false);
    };

    return (
        <div class="min-h-screen bg-black flex items-center justify-center p-6">
            <div class="w-full max-w-md">
                {/* Logo and Title */}
                <div class="text-center mb-8">
                    <h1 class="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                        RemmbrMe
                    </h1>
                    <p class="text-gray-400">Your AI-powered organizer</p>
                </div>

                {/* Signup Card */}
                <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
                    <h2 class="text-2xl font-bold text-white mb-6">Create Account</h2>
                    
                    <Show when={error()}>
                        <div class="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm">
                            {error()}
                        </div>
                    </Show>

                    <form onSubmit={handleSubmit} class="space-y-5">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">
                                Name
                            </label>
                            <input
                                type="text"
                                value={name()}
                                onInput={(e) => setName(e.currentTarget.value)}
                                required
                                class="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                placeholder="John Doe"
                            />
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email()}
                                onInput={(e) => setEmail(e.currentTarget.value)}
                                required
                                class="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password()}
                                onInput={(e) => setPassword(e.currentTarget.value)}
                                required
                                minLength={8}
                                class="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                value={passwordConfirm()}
                                onInput={(e) => setPasswordConfirm(e.currentTarget.value)}
                                required
                                minLength={8}
                                class="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading()}
                            class="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
                        >
                            {loading() ? 'Creating account...' : 'Sign Up'}
                        </button>
                    </form>

                    <div class="mt-6 text-center">
                        <p class="text-gray-400 text-sm">
                            Already have an account?{' '}
                            <a href="/login" class="text-blue-400 hover:text-blue-300 font-medium">
                                Sign in
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
