/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { legacy_createStore } from "redux";

const name = "redux";
const reduxReducer = (state = [], action) => {
    switch (action.type) {
        case "ADD":
            return [...state, action.payload];

        case "RESET":
            return [];

        case "SET":
            return action.payload;

        default:
            return state;
    }
};

const addAction = (el) => {
    return {
        type: "ADD",
        payload: el,
    };
};

const resetAction = () => {
    return {
        type: "RESET",
    };
};

const setAction = (el) => {
    return {
        type: "SET",
        payload: el,
    };
};

const reduxStore = legacy_createStore(reduxReducer, []);

const add = (el) => reduxStore.dispatch(addAction(el));
const reset = () => reduxStore.dispatch(resetAction());
const set = (el) => reduxStore.dispatch(setAction(el));

const redux = {
    name,
    add,
    reset,
    set,
    getState: () => reduxStore.getState(),
};

export default redux;
