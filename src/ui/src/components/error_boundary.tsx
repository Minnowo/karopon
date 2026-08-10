import {Component, ComponentChildren} from 'preact';
import {LocalClearAll} from '../utils/localstate';

type Props = {
    children: ComponentChildren;
};

type State = {
    error: Error | null;
};

// Catches render-phase crashes (via componentDidCatch) and errors outside of render
// (uncaught exceptions, unhandled promise rejections) via window listeners, so a bug
// anywhere in the app shows an error screen instead of a silent blank page.
export class ErrorBoundary extends Component<Props, State> {
    state: State = {error: null};

    static getDerivedStateFromError(error: unknown): State {
        return {error: error instanceof Error ? error : new Error(String(error))};
    }

    componentDidCatch(error: unknown) {
        this.setState({error: error instanceof Error ? error : new Error(String(error))});
    }

    private onWindowError = (e: ErrorEvent) => {
        this.setState({error: e.error instanceof Error ? e.error : new Error(e.message)});
    };

    private onUnhandledRejection = (e: PromiseRejectionEvent) => {
        this.setState({error: e.reason instanceof Error ? e.reason : new Error(String(e.reason))});
    };

    componentDidMount() {
        window.addEventListener('error', this.onWindowError);
        window.addEventListener('unhandledrejection', this.onUnhandledRejection);
    }

    componentWillUnmount() {
        window.removeEventListener('error', this.onWindowError);
        window.removeEventListener('unhandledrejection', this.onUnhandledRejection);
    }

    private reload = () => {
        window.location.reload();
    };

    private clearAndReload = () => {
        LocalClearAll();
        window.location.reload();
    };

    render() {
        const {error} = this.state;

        if (!error) {
            return this.props.children;
        }

        return (
            <div className="flex flex-col items-center text-center py-8 px-4">
                <div className="container-theme max-w-md w-full text-left">
                    <p className="text-lg font-bold text-c-red mb-2">Something went wrong</p>
                    <p className="mb-2">The app hit an unexpected error and could not continue.</p>
                    <pre className="text-xs text-c-overlay2 mt-1 mb-4 whitespace-pre-wrap break-words">
                        {error.stack || error.message}
                    </pre>
                    <div className="flex justify-end gap-2 flex-wrap">
                        <button className="cancel-btn" onClick={this.reload}>
                            Reload
                        </button>
                        <button className="save-btn" onClick={this.clearAndReload}>
                            Clear local data and reload
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}
