import {Dispatch, StateUpdater, useState} from 'preact/hooks';
import {ActivityWithTag, UpdateUserActivityRequest} from '../../api/types';
import {DropdownButton} from '../../components/drop_down_button';
import {TagChip} from '../../components/tag_chip';
import {AddActivityPanel} from './add_activity_panel';

type ActivityEditPanelProps = {
    namespaces: string[];
    setNamespaces: Dispatch<StateUpdater<string[]>>;
    tagColors?: Map<string, string>;
    activityWithTag: ActivityWithTag;
    updateActivity: (req: UpdateUserActivityRequest) => void;
    deleteActivity: (activityWithTag: ActivityWithTag) => void;
};

export function ActivityEditPanel({
    namespaces,
    setNamespaces,
    tagColors,
    activityWithTag,
    updateActivity,
    deleteActivity,
}: ActivityEditPanelProps) {
    const [showEdit, setShowEdit] = useState(false);
    const {activity, tag} = activityWithTag;

    if (showEdit) {
        return (
            <AddActivityPanel
                namespaces={namespaces}
                setNamespaces={setNamespaces}
                tagColors={tagColors}
                title="Edit Break Activity"
                submitLabel="Save"
                initial={{
                    name: activity.name,
                    tag_namespace: tag.namespace,
                    tag_name: tag.name,
                    duration: activity.duration,
                    note: activity.note,
                }}
                onCreate={(req) => {
                    updateActivity({id: activity.id, ...req});
                    setShowEdit(false);
                }}
                onCancel={() => setShowEdit(false)}
            />
        );
    }

    return (
        <div className="w-full surface-1 flex items-center gap-2">
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">{activity.name}</span>
                    <TagChip tag={tag} color={tagColors?.get(tag.namespace)} />
                </div>
                <div className="text-sm text-c-on-surface-variant">
                    {activity.duration} min{activity.note ? ` - ${activity.note}` : ''}
                </div>
            </div>
            <DropdownButton
                actions={[
                    {label: 'Edit', onClick: () => setShowEdit(true)},
                    {label: 'Delete', dangerous: true, onClick: () => deleteActivity(activityWithTag)},
                ]}
            />
        </div>
    );
}
