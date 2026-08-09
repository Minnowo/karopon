import {Dispatch, StateUpdater} from 'preact/hooks';
import {
    TblUser,
    TblUserFood,
    TblUserEvent,
    UserEventFoodLog,
    UserBodyLog,
    TblUserBodyMetric,
    TblDataSource,
    TblUserGoal,
    TaggedTimespan,
    TblUserDashboard,
    TblUserTagColor,
    ActivityWithTag,
    ReminderWithActivities,
} from '../api/types';
import {ErrorDivMsg} from '../components/error_div';

export type BaseState = {
    user: TblUser;
    setUser: Dispatch<StateUpdater<TblUser | null>>;

    foods: TblUserFood[];
    setFoods: Dispatch<StateUpdater<TblUserFood[]>>;

    events: TblUserEvent[];
    setEvents: Dispatch<StateUpdater<TblUserEvent[]>>;

    eventlogs: UserEventFoodLog[];
    setEventLogs: Dispatch<StateUpdater<UserEventFoodLog[]>>;

    goals: TblUserGoal[];
    setGoals: Dispatch<StateUpdater<TblUserGoal[]>>;

    bodylogs: UserBodyLog[];
    setBodyLogs: Dispatch<StateUpdater<UserBodyLog[]>>;

    bodyMetrics: TblUserBodyMetric[];
    setBodyMetrics: Dispatch<StateUpdater<TblUserBodyMetric[]>>;

    namespaces: string[];
    setNamespaces: Dispatch<StateUpdater<string[]>>;

    timespans: TaggedTimespan[];
    setTimespans: Dispatch<StateUpdater<TaggedTimespan[]>>;

    dashboards: TblUserDashboard[];
    setDashboards: Dispatch<StateUpdater<TblUserDashboard[]>>;

    tagColors: TblUserTagColor[];
    setTagColors: Dispatch<StateUpdater<TblUserTagColor[]>>;

    activities: ActivityWithTag[];
    setActivities: Dispatch<StateUpdater<ActivityWithTag[]>>;

    reminders: ReminderWithActivities[];
    setReminders: Dispatch<StateUpdater<ReminderWithActivities[]>>;

    dataSources: TblDataSource[] | null;

    setErrorMsg: Dispatch<StateUpdater<ErrorDivMsg | null>>;
    readonly doRefresh: () => void;
};
