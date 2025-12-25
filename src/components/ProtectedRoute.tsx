import { Component, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { isAuthenticated } from '../lib/pocketbase';
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
        <Show when={isAuthenticated()} fallback={<div class="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>}>
            <props.component />
        </Show>
    );
}
