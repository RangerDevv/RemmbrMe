import { createSignal, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { login } from '../lib/backend.ts';
import { InfoIcon } from '../components/Icons';

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
        <div class="min-h-screen flex items-center justify-center p-6" style={{ "background-color": "var(--color-bg)" }}>
            <div class="w-full max-w-md">
                {/* Logo and Title */}
                <div class="text-center mb-8">
                    <h1 class="text-4xl font-bold mb-2" style={{ "color": "var(--color-text)" }}>
                        RemmbrMe
                    </h1>
                    <p style={{ "color": "var(--color-text-muted)" }}>Your AI-powered organizer</p>
                </div>

                {/* Login Card */}
                <div class="glass-modal rounded-2xl p-8">
                    <h2 class="text-2xl font-bold mb-6" style={{ "color": "var(--color-text)" }}>Welcome Back</h2>
                    
                    <Show when={error()}>
                        <div class="mb-4 p-4 rounded-xl text-sm" style={{ "background-color": "var(--color-danger-muted)", "border": "1px solid var(--color-danger)", "color": "var(--color-danger)" }}>
                            {error()}
                        </div>
                    </Show>

                    <form onSubmit={handleSubmit} class="space-y-5">
                        <div>
                            <label class="block text-sm font-medium mb-2" style={{ "color": "var(--color-text-secondary)" }}>
                                Email
                            </label>
                            <input
                                type="email"
                                value={email()}
                                onInput={(e) => setEmail(e.currentTarget.value)}
                                required
                                class="w-full px-4 py-3 rounded-xl transition-all focus:outline-none"
                                style={{ "background-color": "var(--color-bg-tertiary)", "border": "1px solid var(--color-border)", "color": "var(--color-text)" }}
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-2" style={{ "color": "var(--color-text-secondary)" }}>
                                Password
                            </label>
                            <input
                                type="password"
                                value={password()}
                                onInput={(e) => setPassword(e.currentTarget.value)}
                                required
                                class="w-full px-4 py-3 rounded-xl transition-all focus:outline-none"
                                style={{ "background-color": "var(--color-bg-tertiary)", "border": "1px solid var(--color-border)", "color": "var(--color-text)" }}
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading()}
                            class="w-full py-3 font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ "background-color": "var(--color-accent)", "color": "var(--color-accent-text)" }}
                        >
                            {loading() ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div class="mt-6 text-center">
                        <p class="text-sm" style={{ "color": "var(--color-text-muted)" }}>
                            Don't have an account?{' '}
                            <a href="/signup" class="font-medium" style={{ "color": "var(--color-accent)" }}>
                                Sign up
                            </a>
                        </p>
                    </div>
                </div>

                {/* Demo Credentials */}
                <div class="glass mt-6 p-4 rounded-xl">
                    <p class="text-xs text-center flex items-center justify-center gap-1.5" style={{ "color": "var(--color-text-muted)" }}>
                        <InfoIcon class="w-4 h-4" /> Demo: test@example.com / 12345678
                    </p>
                </div>
            </div>
        </div>
    );
}
