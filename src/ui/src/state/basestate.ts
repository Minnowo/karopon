import {Dispatch, StateUpdater} from 'preact/hooks';
import {
    TblUser,
    TblUserFood,
    TblUserEvent,
    UserEventFoodLog,
    TblUserBodyLog,
    TblDataSource,
    TblUserGoal,
    TaggedTimespan,
    TblUserDashboard,
    TblUserTagColor,
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

    bodylogs: TblUserBodyLog[];
    setBodyLogs: Dispatch<StateUpdater<TblUserBodyLog[]>>;

    namespaces: string[];
    setNamespaces: Dispatch<StateUpdater<string[]>>;

    timespans: TaggedTimespan[];
    setTimespans: Dispatch<StateUpdater<TaggedTimespan[]>>;

    dashboards: TblUserDashboard[];
    setDashboards: Dispatch<StateUpdater<TblUserDashboard[]>>;

    tagColors: TblUserTagColor[];
    setTagColors: Dispatch<StateUpdater<TblUserTagColor[]>>;

    dataSources: TblDataSource[] | null;

    setErrorMsg: Dispatch<StateUpdater<ErrorDivMsg | null>>;
    readonly doRefresh: () => void;
};
