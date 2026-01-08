import { Show } from 'solid-js';
import { TrashIcon, WarningIcon, QuestionIcon } from './Icons';

interface ConfirmModalProps {
    show: boolean;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmModal(props: ConfirmModalProps) {
    const getColor = () => {
        switch (props.type) {
            case 'danger': return 'border-red-900/50';
            case 'warning': return 'border-yellow-900/50';
            default: return 'border-blue-900/50';
        }
    };

    const getIcon = () => {
        switch (props.type) {
            case 'danger': return <TrashIcon class="w-10 h-10 text-red-400" />;
            case 'warning': return <WarningIcon class="w-10 h-10 text-yellow-400" />;
            default: return <QuestionIcon class="w-10 h-10 text-blue-400" />;
        }
    };

    const getConfirmButtonStyle = () => {
        switch (props.type) {
            case 'danger': return 'bg-red-600 hover:bg-red-700';
            case 'warning': return 'bg-yellow-600 hover:bg-yellow-700';
            default: return 'bg-blue-600 hover:bg-blue-700';
        }
    };

    return (
        <Show when={props.show}>
            <div 
                class="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 animate-fadeIn"
                onClick={props.onCancel}
            >
                <div 
                    class={`bg-zinc-900 border ${getColor()} rounded-2xl p-6 max-w-md w-full shadow-2xl animate-scaleIn`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div class="flex items-start gap-4 mb-6">
                        <div>{getIcon()}</div>
                        <div class="flex-1">
                            <Show when={props.title}>
                                <h3 class="text-white text-xl font-semibold mb-2">{props.title}</h3>
                            </Show>
                            <p class="text-gray-300 text-base leading-relaxed">{props.message}</p>
                        </div>
                    </div>

                    <div class="flex justify-end gap-3">
                        <button
                            onClick={props.onCancel}
                            class="px-6 py-2.5 bg-zinc-800 text-white font-semibold rounded-lg hover:bg-zinc-700 transition-all duration-200 border border-zinc-700"
                        >
                            {props.cancelText || 'Cancel'}
                        </button>
                        <button
                            onClick={props.onConfirm}
                            class={`px-6 py-2.5 text-white font-semibold rounded-lg transition-all duration-200 ${getConfirmButtonStyle()}`}
                        >
                            {props.confirmText || 'Confirm'}
                        </button>
                    </div>
                </div>
            </div>
        </Show>
    );
}
