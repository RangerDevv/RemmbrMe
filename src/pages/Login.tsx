import { createSignal, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { login } from '../lib/backend.ts';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = createSignal('');
    const [password, setPassword] = createSignal('');
    const [error, setError] = createSignal('');
    const [loading, setLoading] = createSignal(false);

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(email(), password());
        
        if (result.success) {
            // Small delay to ensure auth state propagates before navigation
            setTimeout(() => {
                navigate('/');
            }, 50);
        } else {
            setError(result.error || 'Login failed');
        }
        
        setLoading(false);
    };

    return (
        <div class="min-h-screen bg-black flex items-center justify-center p-6">
            <div class="w-full max-w-md">
                {/* Logo and Title */}
                <div class="text-center mb-8">
                    <h1 class="text-4xl font-bold text-white mb-2">
                        RemmbrMe
                    </h1>
                    <p class="text-gray-400">Your AI-powered organizer</p>
                </div>

                {/* Login Card */}
                <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                    <h2 class="text-2xl font-bold text-white mb-6">Welcome Back</h2>
                    
                    <Show when={error()}>
                        <div class="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm">
                            {error()}
                        </div>
                    </Show>

                    <form onSubmit={handleSubmit} class="space-y-5">
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
                                class="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading()}
                            class="w-full py-3 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading() ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div class="mt-6 text-center">
                        <p class="text-gray-400 text-sm">
                            Don't have an account?{' '}
                            <a href="/signup" class="text-blue-400 hover:text-blue-300 font-medium">
                                Sign up
                            </a>
                        </p>
                    </div>
                </div>

                {/* Demo Credentials */}
                <div class="mt-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                    <p class="text-xs text-gray-500 text-center">
                        💡 Demo: test@example.com / 12345678
                    </p>
                </div>
            </div>
        </div>
    );
}
