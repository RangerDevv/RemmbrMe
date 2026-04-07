import { Show } from 'solid-js';
import { WarningIcon, ErrorIcon, SuccessIcon, InfoIcon } from './Icons';

interface NotificationModalProps {
    show: boolean;
    message: string;
    type?: 'info' | 'warning' | 'error' | 'success';
    onClose: () => void;
}

export default function NotificationModal(props: NotificationModalProps) {
    const getIcon = () => {
        switch (props.type) {
            case 'warning': return <WarningIcon class="w-10 h-10 text-yellow-400" />;
            case 'error': return <ErrorIcon class="w-10 h-10 text-red-400" />;
            case 'success': return <SuccessIcon class="w-10 h-10" />;
            default: return <InfoIcon class="w-10 h-10 text-blue-400" />;
        }
    };

    const getColor = () => {
        switch (props.type) {
            case 'warning': return 'border-yellow-900/50';
            case 'error': return 'border-red-900/50';
            case 'success': return 'border-green-900/50';
            default: return 'border-blue-900/50';
        }
    };

    return (
        <Show when={props.show}>
            <div 
                class="fixed inset-0 glass-overlay flex items-center justify-center z-[100] p-4 animate-fadeIn"
                onClick={props.onClose}
            >
                <div 
                    class={`glass-modal ${getColor()} rounded-2xl p-6 max-w-md w-full animate-scaleIn`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div class="flex items-start gap-4">
                        <div>{getIcon()}</div>
                        <div class="flex-1">
                            <p class="text-lg leading-relaxed" style={{ "color": "var(--color-text)" }}>{props.message}</p>
                        </div>
                    </div>

                    <div class="flex justify-end mt-6">
                        <button
                            onClick={props.onClose}
                            class="px-6 py-2.5 font-semibold rounded-lg transition-all duration-200"
                            style={{ "background-color": "var(--color-accent)", "color": "var(--color-accent-text)" }}
                        >
                            OK
                        </button>
                    </div>
                </div>
            </div>
        </Show>
    );
}
