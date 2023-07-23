import { createEvent, createStore } from "effector";

const name = "effector";
const add = createEvent();
const remove = createEvent();
const reset = createEvent();
const setState = createEvent();
const $state = createStore([])
    .on(add, (state, newEl) => [...state, newEl])
    .on(remove, (state, index) => state.filter((_, i) => i !== index))
    .reset(reset)
    .on(setState, (_, ns) => ns);

const effector = {
    name,
    add,
    reset,
    set: setState,
    getState: $state.getState,
};

export default effector;
