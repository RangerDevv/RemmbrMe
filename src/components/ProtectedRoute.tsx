import { Component, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { isAuthenticated } from '../lib/backend.ts';
import { onMount } from 'solid-js';

interface ProtectedRouteProps {
    component: Component;
}

export default function ProtectedRoute(props: ProtectedRouteProps) {
    const navigate = useNavigate();

    onMount(() => {
        if (!isAuthenticated()) {
            navigate('/login', { replace: true });
        }
    });

    return (
        <Show when={isAuthenticated()} fallback={<div class="min-h-screen flex items-center justify-center" style={{ "background-color": "var(--color-bg)", "color": "var(--color-text)" }}>Loading...</div>}>
            <props.component />
        </Show>
    );
}
