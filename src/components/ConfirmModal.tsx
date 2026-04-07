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
                class="fixed inset-0 glass-overlay flex items-end lg:items-center justify-center z-[100] animate-fadeIn"
                onClick={props.onCancel}
            >
                <div 
                    class={`glass-modal rounded-t-2xl lg:rounded-2xl p-5 lg:p-6 w-full lg:max-w-md animate-scaleIn ${getColor()}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div class="flex items-start gap-4 mb-5">
                        <div>{getIcon()}</div>
                        <div class="flex-1">
                            <Show when={props.title}>
                                <h3 class="text-lg lg:text-xl font-semibold mb-2" style={{ "color": "var(--color-text)" }}>{props.title}</h3>
                            </Show>
                            <p class="text-sm lg:text-base leading-relaxed" style={{ "color": "var(--color-text-secondary)" }}>{props.message}</p>
                        </div>
                    </div>

                    <div class="flex justify-end gap-3">
                        <button
                            onClick={props.onCancel}
                            class="px-5 py-2.5 font-semibold rounded-xl transition-all duration-200"
                            style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text)", "border": "1px solid var(--color-border)" }}
                        >
                            {props.cancelText || 'Cancel'}
                        </button>
                        <button
                            onClick={props.onConfirm}
                            class={`px-5 py-2.5 text-white font-semibold rounded-xl transition-all duration-200 ${getConfirmButtonStyle()}`}
                        >
                            {props.confirmText || 'Confirm'}
                        </button>
                    </div>
                </div>
            </div>
        </Show>
    );
}
