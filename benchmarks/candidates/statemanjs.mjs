/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { createState } from "../../packages/statemanjs/statemanjs.mjs";

const name = "statemanjs";

const todosState = createState([]);

function add(el) {
    todosState.update((s) => {
        s.push(el);
    });
}

function reset() {
    todosState.set([]);
}

function set(el) {
    todosState.set(el);
}

const statemanjs = {
    name,
    add,
    reset,
    set,
    getState: todosState.get,
};

export default statemanjs;
