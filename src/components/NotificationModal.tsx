import { Show } from 'solid-js';

interface NotificationModalProps {
    show: boolean;
    message: string;
    type?: 'info' | 'warning' | 'error' | 'success';
    onClose: () => void;
}

export default function NotificationModal(props: NotificationModalProps) {
    const getIcon = () => {
        switch (props.type) {
            case 'warning': return '⚠️';
            case 'error': return '❌';
            case 'success': return '✅';
            default: return 'ℹ️';
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
                class="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 animate-fadeIn"
                onClick={props.onClose}
            >
                <div 
                    class={`bg-zinc-900 border ${getColor()} rounded-2xl p-6 max-w-md w-full shadow-2xl animate-scaleIn`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div class="flex items-start gap-4">
                        <div class="text-4xl">{getIcon()}</div>
                        <div class="flex-1">
                            <p class="text-white text-lg leading-relaxed">{props.message}</p>
                        </div>
                    </div>

                    <div class="flex justify-end mt-6">
                        <button
                            onClick={props.onClose}
                            class="px-6 py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-all duration-200"
                        >
                            OK
                        </button>
                    </div>
                </div>
            </div>
        </Show>
    );
}
