/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { makeAutoObservable } from "mobx";

const name = "mobx";

class MobxStore {
    constructor() {
        this.todos = [];
        makeAutoObservable(this);

        this.add = this.add.bind(this);
        this.reset = this.reset.bind(this);
        this.set = this.set.bind(this);
    }

    add(task) {
        this.todos.push(task);
    }

    reset() {
        this.todos = [];
    }

    set(el) {
        this.todos = el;
    }
}

const mobxStore = new MobxStore();

const mobx = {
    name,
    add: mobxStore.add,
    reset: mobxStore.reset,
    set: mobxStore.set,
    getState: () => mobxStore.todos,
};

export default mobx;
