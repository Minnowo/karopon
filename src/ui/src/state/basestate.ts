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
} from '../api/types';

export type BaseState = {
    user: TblUser;
    setUser: Dispatch<StateUpdater<TblUser | null>>;

    foods: TblUserFood[];
    setFoods: Dispatch<StateUpdater<TblUserFood[] | null>>;

    events: TblUserEvent[];
    setEvents: Dispatch<StateUpdater<TblUserEvent[] | null>>;

    eventlogs: UserEventFoodLog[];
    setEventLogs: Dispatch<StateUpdater<UserEventFoodLog[] | null>>;

    goals: TblUserGoal[];
    setGoals: Dispatch<StateUpdater<TblUserGoal[] | null>>;

    bodylogs: TblUserBodyLog[];
    setBodyLogs: Dispatch<StateUpdater<TblUserBodyLog[] | null>>;

    namespaces: string[];
    setNamespaces: Dispatch<StateUpdater<string[] | null>>;

    timespans: TaggedTimespan[];
    setTimespans: Dispatch<StateUpdater<TaggedTimespan[] | null>>;

    dataSources: TblDataSource[] | null;

    setErrorMsg: Dispatch<StateUpdater<string | null>>;
    readonly doRefresh: () => void;
};
