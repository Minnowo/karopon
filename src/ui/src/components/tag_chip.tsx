import {TblUserTag} from '../api/types';

type Props = {
    tag: TblUserTag;
    onRemove?: () => void;
};
export const TagChip = ({tag, onRemove = undefined}: Props) => {
    const showDeleteButton = onRemove !== undefined;

    return (
        <span className="flex items-center min-h-8 bg-c-mauve rounded-2xl w-fit">
            <span className={`pl-3 ${showDeleteButton ? 'mr-2' : 'pr-3'} break-words`}>
                {tag.namespace}:{tag.name}
            </span>
            {showDeleteButton && (
                <button
                    className="px-2 mr-1 font-bold bg-transparent border-none rounded-2xl text-inherit"
                    type="button"
                    onClick={() => onRemove()}
                >
                    ×
                </button>
            )}
        </span>
    );
};
