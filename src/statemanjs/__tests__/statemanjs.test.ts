/* eslint-disable @typescript-eslint/no-explicit-any */

import { formatError } from "../shared/utility";
import {
    StatemanjsAPI,
    StatemanjsComputedAPI,
    createComputedState,
    createState,
} from "../index";
import { TransactionService } from "../service/transactionService";
import _ from "lodash";

type Moon = {
    name: string;
};
type Planet = {
    name: string;
    system: string;
    moons: Moon[];
    countOfSatelites?: number | string;
    anyInfo?: any;
};
type SetPlanet = {
    name: string;
    system: string;
    moons?: Set<string>;
};
type MapPlanet = {
    name: string;
    system: string;
    moons?: Map<string, string>;
};

type MoonObserver = {
    distance: number;
};

describe("Statemanjs API", () => {
    test("it should create state", () => {
        const planetState = createState<Planet>({
            name: "Earth",
            system: "Solar system",
            moons: [{ name: "Moon" }],
        });

        expect(planetState).toHaveProperty("set");
        expect(planetState).toHaveProperty("get");
        expect(planetState).toHaveProperty("subscribe");
        expect(planetState).toHaveProperty("unsubscribeAll");
        expect(planetState).toHaveProperty("getActiveSubscribersCount");
        expect(planetState).toHaveProperty("update");
    });

    test("it should work with primitive state (number)", () => {
        const counterState = createState<number>(0);

        let notifyCount = 0;
        counterState.subscribe(() => {
            notifyCount++;
        });

        counterState.set(1);
        expect(counterState.get()).toBe(1);
        expect(notifyCount).toBe(1);

        counterState.set(1); // Same value
        expect(notifyCount).toBe(1); // Should not notify

        counterState.set(2, { skipComparison: true });
        expect(notifyCount).toBe(2); // Should notify even with same value
    });

    test("it should work with primitive state (string)", () => {
        const messageState = createState<string>("Hello");

        expect(messageState.get()).toBe("Hello");

        messageState.set("World");
        expect(messageState.get()).toBe("World");
    });

    test("it should work with primitive state (boolean)", () => {
        const flagState = createState<boolean>(false);

        let notifyCount = 0;
        flagState.subscribe(() => {
            notifyCount++;
        });

        flagState.set(true);
        expect(flagState.get()).toBe(true);
        expect(notifyCount).toBe(1);
    });

    test("it should throw error when using update on primitive state", () => {
        const numberState = createState<number>(42);

        expect(() => {
            numberState.update((s) => {
                // This should throw
                return s;
            });
        }).toThrow("Cannot use 'update' method on primitive state");
    });

    test("it should work with batch option enabled", () => {
        const planetState = createState<Planet>(
            {
                name: "Earth",
                system: "Solar system",
                moons: [{ name: "Moon" }],
            },
            { batch: true },
        );

        let notifyCount = 0;
        planetState.subscribe(() => {
            notifyCount++;
        });

        // Multiple synchronous updates
        planetState.set({
            name: "Mars",
            system: "Solar system",
            moons: [{ name: "Phobos" }],
        });

        planetState.set({
            name: "Jupiter",
            system: "Solar system",
            moons: [{ name: "Io" }],
        });

        // Should only notify once after microtask
        expect(notifyCount).toBe(0);

        return new Promise<void>((resolve) => {
            queueMicrotask(() => {
                expect(notifyCount).toBe(1);
                resolve();
            });
        });
    });

    test("it should unsubscribe by id", () => {
        const planetState = createState<Planet>({
            name: "Earth",
            system: "Solar system",
            moons: [{ name: "Moon" }],
        });

        let count1 = 0;
        let count2 = 0;

        const unsub1 = planetState.subscribe(() => {
            count1++;
        });

        planetState.subscribe(() => {
            count2++;
        });

        expect(planetState.getActiveSubscribersCount()).toBe(2);

        unsub1();
        expect(planetState.getActiveSubscribersCount()).toBe(1);

        planetState.set({
            name: "Mars",
            system: "Solar system",
            moons: [{ name: "Phobos" }],
        });

        expect(count1).toBe(0);
        expect(count2).toBe(1);
    });

    test("it should skip generation increment when specified", () => {
        const planetState = createState<Planet>({
            name: "Earth",
            system: "Solar system",
            moons: [{ name: "Moon" }],
        });

        let notifyCount = 0;
        planetState.subscribe(() => {
            notifyCount++;
        });

        planetState.set(
            {
                name: "Mars",
                system: "Solar system",
                moons: [{ name: "Phobos" }],
            },
            { skipGenerationIncrement: true },
        );

        expect(notifyCount).toBe(1);
    });

    test("it should use shallow comparator correctly", () => {
        type SimpleState = {
            count: number;
            name: string;
        };

        const state = createState<SimpleState>(
            { count: 0, name: "test" },
            { defaultComparator: "shallow" },
        );

        let notifyCount = 0;
        state.subscribe(() => {
            notifyCount++;
        });

        // Same values - should not notify
        const result = state.set({ count: 0, name: "test" });
        expect(result).toBe(false);
        expect(notifyCount).toBe(0);

        // Different value - should notify
        state.set({ count: 1, name: "test" });
        expect(notifyCount).toBe(1);
    });

    test("it should return false when update does not change state", () => {
        const planetState = createState<Planet>({
            name: "Earth",
            system: "Solar system",
            moons: [{ name: "Moon" }],
        });

        const result = planetState.update((s) => {
            // Do nothing
        });

        expect(result).toBe(false);
    });

    test("it should handle customComparatorOverride option", () => {
        const planetState = createState<Planet>({
            name: "Earth",
            system: "Solar system",
            moons: [{ name: "Moon" }],
        });

        let notifyCount = 0;
        planetState.subscribe(() => {
            notifyCount++;
        });

        // Custom comparator that always returns false (always different)
        planetState.set(
            {
                name: "Earth",
                system: "Solar system",
                moons: [{ name: "Moon" }],
            },
            {
                customComparatorOverride: () => false,
                comparatorOverride: "custom",
            },
        );

        // Should notify because comparator returns false
        expect(notifyCount).toBe(1);
    });

    test("it should return value (get method)", () => {
        const planetState = createState<Planet>({
            name: "Earth",
            system: "Solar system",
            moons: [{ name: "Moon" }],
        });

        expect(planetState.get()).toMatchObject({
            name: "Earth",
            system: "Solar system",
            moons: [{ name: "Moon" }],
        });
    });

    test("it should set new state (set method)", () => {
        const planetState = createState<Planet>({
            name: "Earth",
            system: "Solar system",
            moons: [{ name: "Moon" }],
        });
        planetState.set({
            name: "Mars",
            system: "Solar system",
            moons: [{ name: "Phobos" }],
        });
        expect(planetState.get()).toMatchObject({
            name: "Mars",
            system: "Solar system",
            moons: [{ name: "Phobos" }],
        });
    });

    test("it should not update state or notify subscribers if the same object is passed to set", () => {
        const initialState = {
            name: "Earth",
            system: "Solar System",
            moons: [{ name: "Moon" }],
            characteristics: {
                gravity: 1,
                atmosphere: {
                    composition: {
                        oxygen: 21,
                    },
                },
            },
        };

        const planetState = createState<Planet>(
            { ...initialState },
            { defaultComparator: "shallow" },
        );

        let notifyCount = 0;

        planetState.subscribe(() => {
            notifyCount++;
        });

        planetState.set({ ...initialState });

        expect(planetState.get()).toMatchObject({ ...initialState });
        expect(notifyCount).toBe(0);
    });

    test("it should update element (update)", () => {
        const planetState = createState<Planet>({
            name: "Mars",
            system: "Solar system",
            moons: [{ name: "Phobos" }],
        });

        planetState.update((s) => {
            if (s.moons) {
                s.moons.push({ name: "Deimos" });
            }
        });

        expect(planetState.get()).toMatchObject({
            name: "Mars",
            system: "Solar system",
            moons: [{ name: "Phobos" }, { name: "Deimos" }],
        });
    });

    test("it should react on changes (subscripe method)", () => {
        let isTheMoonGettingCloser = false;

        const apogee = 405400;
        const moonObserverState = createState<MoonObserver>({
            distance: apogee,
        });
        moonObserverState.subscribe((s) => {
            isTheMoonGettingCloser = s.distance < apogee;
        }, {});

        moonObserverState.update((s) => {
            s.distance -= 30;
        });

        expect(isTheMoonGettingCloser).toBe(true);
    });

    test("it should return count of subscribers (getActiveSubscribersCount method)", () => {
        const apogee = 405400;
        const moonObserverState = createState<MoonObserver>({
            distance: apogee,
        });
        moonObserverState.subscribe((s) => {
            const _isTheMoonGettingCloser = s.distance < apogee;
        }, {});

        moonObserverState.update((s) => {
            s.distance -= 30;
        });

        expect(moonObserverState.getActiveSubscribersCount()).toBe(1);
    });

    test("it should use custom condition for update (notifyCondition)", () => {
        let isTheMoonInPerigee = false;

        const apogee = 405400;
        const perigee = 362600;
        const moonObserverState = createState<MoonObserver>({
            distance: apogee,
        });

        moonObserverState.subscribe(
            () => {
                isTheMoonInPerigee = true;
            },
            { notifyCondition: (s) => s.distance === perigee },
        );

        moonObserverState.update((s) => {
            s.distance -= 30;
        });

        expect(isTheMoonInPerigee).toBe(false);

        moonObserverState.update((s) => {
            s.distance = perigee;
        });

        expect(isTheMoonInPerigee).toBe(true);
    });

    test("it should delete broken subscriber", () => {
        const apogee = 405400;
        const moonObserverState = createState<MoonObserver>({
            distance: apogee,
        });
        moonObserverState.subscribe(() => {
            throw new Error("");
        }, {});

        moonObserverState.update((s) => {
            s.distance = NaN;
        });

        expect(moonObserverState.getActiveSubscribersCount()).toBe(0);
    });

    test("it should delete all unprotected subscribers (unsubscribeAll method)", () => {
        const apogee = 405400;
        const perigee = 362600;
        const moonObserverState = createState<MoonObserver>({
            distance: apogee,
        });

        moonObserverState.subscribe(
            () => {
                // Protected subscriber
            },
            { notifyCondition: (s) => s.distance === perigee, protect: true },
        );

        moonObserverState.subscribe(
            () => {
                // Unprotected subscriber
            },
            { notifyCondition: (s) => s.distance === apogee, protect: false },
        );

        moonObserverState.subscribe(() => {
            // Unprotected subscriber
        }, {});

        moonObserverState.unsubscribeAll();

        expect(moonObserverState.getActiveSubscribersCount()).toBe(1);
    });

    test("it should unwrap state", () => {
        const planetState = createState<Planet>({
            name: "earth", // typo
            system: "Solar system",
            moons: [{ name: "Moon" }],
        });

        const unwrappedPlanet = planetState.unwrap();
        unwrappedPlanet.name = "Earth"; // fix typo

        expect(unwrappedPlanet.name).toBe("Earth");
        expect(planetState.get().name).toBe("earth");
    });

    test("it should unwrap deep state", () => {
        const planetState = createState<Planet>({
            name: "Earth",
            system: "Solar system",
            moons: [{ name: "moon" }], // typo
        });

        const unwrappedPlanet = planetState.unwrap();
        unwrappedPlanet.moons[0].name = "Moon"; // fix typo

        expect(unwrappedPlanet.moons[0].name).toBe("Moon");
    });

    test("it should not notify only by props changing (set is set, not update)", () => {
        const shuttleState = createState({
            speed: 1000,
            exitManeuverDistance: 20000,
            startPreparingForManeuver: false,
        });

        let countOfNotifications = 0;

        shuttleState.subscribe(
            () => {
                countOfNotifications = countOfNotifications + 1;
            },
            { properties: ["startPreparingForManeuver"] },
        );

        shuttleState.set({
            speed: 1500,
            exitManeuverDistance: 18500,
            startPreparingForManeuver: false,
        });

        shuttleState.set({
            speed: 1700,
            exitManeuverDistance: 16800,
            startPreparingForManeuver: false,
        });

        shuttleState.set({
            speed: 2800,
            exitManeuverDistance: 15000,
            startPreparingForManeuver: false,
        });

        shuttleState.set({
            speed: 2800,
            exitManeuverDistance: 15000,
            startPreparingForManeuver: true,
        });

        expect(countOfNotifications).toBe(4);
    });

    test("it should notify only by notify condition in set", () => {
        const shuttleState = createState({
            speed: 1000,
            exitManeuverDistance: 20000,
            startPreparingForManeuver: false,
        });

        let countOfNotifications = 0;

        let currStartPreparingForManeuver =
            shuttleState.get().startPreparingForManeuver;

        shuttleState.subscribe(
            (s) => {
                countOfNotifications = countOfNotifications + 1;
                currStartPreparingForManeuver = s.startPreparingForManeuver;
            },
            {
                notifyCondition: (s) =>
                    s.startPreparingForManeuver !==
                    currStartPreparingForManeuver,
            },
        );

        shuttleState.set({
            speed: 1500,
            exitManeuverDistance: 18500,
            startPreparingForManeuver: false,
        });

        shuttleState.set({
            speed: 1700,
            exitManeuverDistance: 16800,
            startPreparingForManeuver: false,
        });

        shuttleState.set({
            speed: 2800,
            exitManeuverDistance: 15000,
            startPreparingForManeuver: false,
        });

        shuttleState.set({
            speed: 2800,
            exitManeuverDistance: 15000,
            startPreparingForManeuver: true,
        });

        expect(countOfNotifications).toBe(1);
    });

    test("the custom comparator (`_.isEqual`) should works", () => {
        const initialState = {
            name: "Earth",
            system: "Solar System",
            moons: [{ name: "Moon" }],
            characteristics: {
                gravity: 1,
                atmosphere: {
                    composition: {
                        oxygen: 21,
                    },
                },
            },
        };

        const planetState = createState(
            { ...initialState },
            {
                customComparator: (a, b): boolean => _.isEqual(a, b),
                defaultComparator: "custom",
            },
        );

        let countOfNotifications = 0;

        planetState.subscribe(() => {
            countOfNotifications = countOfNotifications + 1;
        });

        planetState.set({ ...initialState });

        expect(countOfNotifications).toBe(0);

        planetState.set({
            ...initialState,
            ...{
                characteristics: {
                    gravity: 1,
                    atmosphere: { composition: { oxygen: 20 } },
                },
            },
        });

        expect(countOfNotifications).toBe(1);
    });

    test("it should notify only by props changing (update)", () => {
        const shuttleState = createState({
            speed: 1000,
            exitManeuverDistance: 20000,
            startPreparingForManeuver: false,
        });

        let countOfNotifications = 0;

        shuttleState.subscribe(
            () => {
                countOfNotifications = countOfNotifications + 1;
            },
            { properties: ["startPreparingForManeuver"] },
        );

        shuttleState.update((s) => {
            s.speed = 1500;
            s.exitManeuverDistance = 18500;
        });

        shuttleState.update((s) => {
            s.speed = 1700;
            s.exitManeuverDistance = 16800;
        });

        shuttleState.update((s) => {
            s.speed = 2800;
            s.exitManeuverDistance = 15000;
        });

        expect(countOfNotifications).toBe(0);

        shuttleState.update((s) => {
            s.startPreparingForManeuver = true;
        });

        expect(countOfNotifications).toBe(1);
    });

    test("it should async set new state", async () => {
        const planetState = createState<Planet | null>(null);

        const asyncAction = async (
            stateManager: StatemanjsAPI<Planet | null>,
        ) => {
            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    stateManager.set({
                        name: "Mars",
                        system: "Solar system",
                        moons: [{ name: "Phobos" }],
                    });
                    resolve();
                }, 100);
            });
        };

        await planetState.asyncAction(asyncAction);
        expect(planetState.get()).not.toBeNull();
        expect(planetState.get()).toMatchObject({
            name: "Mars",
            system: "Solar system",
            moons: [{ name: "Phobos" }],
        });
    });

    test("it should update selector", () => {
        const planetState = createState<Planet>({
            name: "Mars",
            system: "Solar system",
            moons: [],
        });

        const planetNameSelectorState: StatemanjsComputedAPI<string> =
            planetState.createSelector((state: Planet) => state.name, {
                properties: ["name"],
            });

        expect(planetNameSelectorState.get()).toBe("Mars");

        let count = 0;

        planetNameSelectorState.subscribe(() => {
            count++;
        });

        planetState.update((s) => {
            s.moons.push({ name: "Phobos" });
        });

        expect(count).toBe(0);
        expect(planetState.get()).toMatchObject({
            name: "Mars",
            system: "Solar system",
            moons: [{ name: "Phobos" }],
        });

        planetState.set({
            name: "Earth",
            system: "Solar system",
            moons: [{ name: "Moon" }],
        });

        expect(count).toBe(1);
        expect(planetNameSelectorState.get()).toBe("Earth");
    });

    test("it should track changes via array find() method", () => {
        type TodoState = {
            todos: Array<{ id: number; text: string; completed: boolean }>;
        };

        const state = createState<TodoState>({
            todos: [
                { id: 1, text: "First", completed: false },
                { id: 2, text: "Second", completed: false },
            ],
        });

        let notificationCount = 0;
        state.subscribe(() => {
            notificationCount++;
        });

        state.update((draft) => {
            const found = draft.todos.find((t) => t.id === 1);
            if (found) {
                found.completed = true;
            }
        });

        expect(notificationCount).toBe(1);
        expect(state.get().todos[0].completed).toBe(true);
        expect(state.get().todos[1].completed).toBe(false);
    });

    test("it should track changes via array filter() method", () => {
        type TodoState = {
            todos: Array<{ id: number; text: string; completed: boolean }>;
        };

        const state = createState<TodoState>({
            todos: [
                { id: 1, text: "Active 1", completed: false },
                { id: 2, text: "Completed", completed: true },
                { id: 3, text: "Active 2", completed: false },
            ],
        });

        let notificationCount = 0;
        state.subscribe(() => {
            notificationCount++;
        });

        state.update((draft) => {
            const active = draft.todos.filter((t) => !t.completed);
            active.forEach((todo) => {
                todo.completed = true;
            });
        });

        expect(notificationCount).toBe(1);
        expect(state.get().todos.every((t) => t.completed)).toBe(true);
    });

    test("it should track changes via array map() method", () => {
        type TodoState = {
            todos: Array<{ id: number; text: string; completed: boolean }>;
        };

        const state = createState<TodoState>({
            todos: [
                { id: 1, text: "Todo 1", completed: false },
                { id: 2, text: "Todo 2", completed: false },
            ],
        });

        let notificationCount = 0;
        state.subscribe(() => {
            notificationCount++;
        });

        state.update((draft) => {
            const mapped = draft.todos.map((t) => t);
            if (mapped[0]) {
                mapped[0].completed = true;
            }
        });

        expect(notificationCount).toBe(1);
        expect(state.get().todos[0].completed).toBe(true);
        expect(state.get().todos[1].completed).toBe(false);
    });

    test("it should track changes via array at() method", () => {
        type TodoState = {
            todos: Array<{ id: number; text: string; completed: boolean }>;
        };

        const state = createState<TodoState>({
            todos: [
                { id: 1, text: "First", completed: false },
                { id: 2, text: "Second", completed: false },
            ],
        });

        let notificationCount = 0;
        state.subscribe(() => {
            notificationCount++;
        });

        state.update((draft) => {
            const item = draft.todos.at(0);
            if (item) {
                item.completed = true;
            }
        });

        expect(notificationCount).toBe(1);
        expect(state.get().todos[0].completed).toBe(true);
    });

    test("it should track changes via array slice() method", () => {
        type TodoState = {
            todos: Array<{ id: number; text: string; completed: boolean }>;
        };

        const state = createState<TodoState>({
            todos: [
                { id: 1, text: "First", completed: false },
                { id: 2, text: "Second", completed: false },
                { id: 3, text: "Third", completed: false },
            ],
        });

        let notificationCount = 0;
        state.subscribe(() => {
            notificationCount++;
        });

        state.update((draft) => {
            const sliced = draft.todos.slice(0, 2);
            sliced.forEach((todo) => {
                todo.completed = true;
            });
        });

        expect(notificationCount).toBe(1);
        expect(state.get().todos[0].completed).toBe(true);
        expect(state.get().todos[1].completed).toBe(true);
        expect(state.get().todos[2].completed).toBe(false);
    });
});

describe("Statemanjs security", () => {
    test("it shouldn't depends on base variable", () => {
        let planet = {
            name: "Earth",
            system: "Solar system",
            moons: [{ name: "Moon" }],
        };
        const planetState = createState<Planet>(planet);

        planet = {
            name: "Mars",
            system: "Solar system",
            moons: [{ name: "Phobos" }, { name: "Deimos" }],
        };

        expect(planetState.get()).toMatchObject({
            name: "Earth",
            system: "Solar system",
            moons: [{ name: "Moon" }],
        });
    });

    test("it should deny direct access", () => {
        const planet = {
            name: "Earth",
            system: "Solar system",
            moons: [{ name: "Moon" }],
        };
        const planetState = createState<Planet>(planet);

        const expectErr = () => {
            planetState.get().name = "Mars";
        };

        expect(expectErr).toThrow();
    });

    test("it should deny descriptors changes", () => {
        const planet = {
            name: "Earth",
            system: "Solar system",
            moons: [{ name: "Moon" }],
        };
        const planetState = createState<Planet>(planet);

        const expectErr = () => Object.freeze(planetState.get());

        expect(expectErr).toThrow();
    });

    test("it should throw the error for 'clear' method outside the 'update' method", () => {
        const planetState = createState<SetPlanet>({
            name: "Mars",
            system: "Solar system",
            moons: new Set("Phobos"),
        });

        const expectErr = () => planetState.get().moons?.add("Deimos");

        expect(expectErr).toThrow();
    });

    test("it shouldn't throw the error for 'clear' method inside the 'update' method", () => {
        const planetState = createState<SetPlanet>({
            name: "Mars",
            system: "Solar system",
            moons: new Set("Phobos"),
        });

        planetState.update((s) => {
            s.moons?.add("Deimos");
        });
    });

    test("it should throw the error for 'delete' method outside the 'update' method", () => {
        const moons = new Set<string>();
        moons.add("Phobos");
        moons.add("Deimos");
        const planetState = createState<SetPlanet>({
            name: "Mars",
            system: "Solar system",
            moons,
        });

        const expectErr = () => planetState.get().moons?.delete("Deimos");

        expect(expectErr).toThrow();
    });

    test("it shouldn't throw the error for 'delete' method inside the 'update' method", () => {
        const moons = new Set<string>();
        moons.add("Phobos");
        moons.add("Deimos");
        const planetState = createState<SetPlanet>({
            name: "Mars",
            system: "Solar system",
            moons,
        });

        planetState.update((s) => {
            s.moons?.delete("Deimos");
        });
    });

    test("it should throw the error for 'set' method outside the 'update' method", () => {
        const planetState = createState<MapPlanet>({
            name: "Mars",
            system: "Solar system",
            moons: new Map(),
        });

        const expectErr = () => planetState.get().moons?.set("0", "Deimos");

        expect(expectErr).toThrow();
    });

    test("it shouldn't throw the error for 'set' method inside the 'update' method", () => {
        const planetState = createState<MapPlanet>({
            name: "Mars",
            system: "Solar system",
            moons: new Map(),
        });

        planetState.update((s) => {
            s.moons?.set("0", "Deimos");
        });
    });

    test("it should throw the error for 'add' method outside the 'update' method", () => {
        const planetState = createState<SetPlanet>({
            name: "Mars",
            system: "Solar system",
            moons: new Set("Phobos"),
        });

        const expectErr = () => planetState.get().moons?.add("Deimos");

        expect(expectErr).toThrow();
    });

    test("it shouldn't throw the error for 'add' method inside the 'update' method", () => {
        const planetState = createState<SetPlanet>({
            name: "Mars",
            system: "Solar system",
            moons: new Set("Phobos"),
        });

        planetState.update((s) => {
            s.moons?.add("Deimos");
        });
    });

    test("it should throw the error for 'fill' method outside the 'update' method", () => {
        const planetState = createState<Planet>({
            name: "Mars",
            system: "Solar system",
            moons: [{ name: "Phobos" }, { name: "Deimos" }],
        });

        const expectErr = () =>
            planetState.get().moons?.fill({ name: "Moon" }, 2, 4);

        expect(expectErr).toThrow();
    });

    test("it shouldn't throw the error for 'fill' method inside the 'update' method", () => {
        const planetState = createState<Planet>({
            name: "Mars",
            system: "Solar system",
            moons: [{ name: "Phobos" }, { name: "Deimos" }],
        });

        planetState.update((s) => {
            s.moons?.fill({ name: "Moon" }, 2, 4);
        });
    });

    test("it should throw the error for 'reverse' method outside the 'update' method", () => {
        const planetState = createState<Planet>({
            name: "Mars",
            system: "Solar system",
            moons: [{ name: "Phobos" }, { name: "Deimos" }],
        });

        const expectErr = () => planetState.get().moons?.reverse();

        expect(expectErr).toThrow();
    });

    test("it shouldn't throw the error for 'reverse' method inside the 'update' method", () => {
        const planetState = createState<Planet>({
            name: "Mars",
            system: "Solar system",
            moons: [{ name: "Phobos" }, { name: "Deimos" }],
        });

        planetState.update((s) => {
            s.moons?.reverse();
        });
    });

    test("it should throw the error for 'sort' method outside the 'update' method", () => {
        const planetState = createState<Planet>({
            name: "Mars",
            system: "Solar system",
            moons: [{ name: "Phobos" }, { name: "Deimos" }],
            anyInfo: [4, 10, 2, 0, 3],
        });

        const expectErr = () => planetState.get().anyInfo?.sort();

        expect(expectErr).toThrow();
    });

    test("it shouldn't throw the error for 'sort' method inside the 'update' method", () => {
        const planetState = createState<Planet>({
            name: "Mars",
            system: "Solar system",
            moons: [{ name: "Phobos" }, { name: "Deimos" }],
            anyInfo: [4, 10, 2, 0, 3],
        });

        planetState.update((s) => {
            s.anyInfo?.sort();
        });
    });

    test("it should throw the error for 'unscopables' method outside the 'update' method", () => {
        const planetState = createState<Planet>({
            name: "Mars",
            system: "Solar system",
            moons: [{ name: "Phobos" }, { name: "Deimos" }],
            anyInfo: "Sand storm",
        });

        const expectErr = () => {
            (planetState.get() as any)[Symbol.unscopables] = {
                anyInfo: true,
            };
        };

        expect(expectErr).toThrow();
    });

    test("it shouldn't throw the error for 'unscopables' method inside the 'update' method", () => {
        const planetState = createState<Planet>({
            name: "Mars",
            system: "Solar system",
            moons: [{ name: "Phobos" }, { name: "Deimos" }],
            anyInfo: "Sand storm",
        });

        planetState.update((s) => {
            (s as any)[Symbol.unscopables] = {
                anyInfo: true,
            };
        });
    });

    test("it shouldn't throw the error for 'pop' method inside the 'update' method", () => {
        const planetState = createState<Planet>({
            name: "Mars",
            system: "Solar system",
            moons: [{ name: "Phobos" }, { name: "Deimos" }],
        });

        planetState.update((s) => {
            s.moons?.pop();
        });
    });

    test("it should throw the error for 'push' method outside the 'update' method", () => {
        const planetState = createState<Planet>({
            name: "Mars",
            system: "Solar system",
            moons: [{ name: "Phobos" }],
        });

        const expectErr = () =>
            planetState.get().moons?.push({ name: "Deimos" });

        expect(expectErr).toThrow();
    });

    test("it shouldn't throw the error for 'push' method inside the 'update' method", () => {
        const planetState = createState<Planet>({
            name: "Mars",
            system: "Solar system",
            moons: [{ name: "Phobos" }],
        });

        planetState.update((s) => {
            s.moons?.push({ name: "Deimos" });
        });
    });

    test("it should throw the error for 'shift' method outside the 'update' method", () => {
        const planetState = createState<Planet>({
            name: "Mars",
            system: "Solar system",
            moons: [{ name: "Phobos" }, { name: "Deimos" }],
        });

        const expectErr = () => planetState.get().moons?.shift();

        expect(expectErr).toThrow();
    });

    test("it shouldn't throw the error for 'shift' method inside the 'update' method", () => {
        const planetState = createState<Planet>({
            name: "Mars",
            system: "Solar system",
            moons: [{ name: "Phobos" }, { name: "Deimos" }],
        });

        planetState.update((s) => {
            s.moons?.shift();
        });
    });

    test("it should throw the error for 'unshift' method outside the 'update' method", () => {
        const planetState = createState<Planet>({
            name: "Mars",
            system: "Solar system",
            moons: [{ name: "Phobos" }],
        });

        const expectErr = () =>
            planetState.get().moons?.unshift({ name: "Deimos" });

        expect(expectErr).toThrow();
    });

    test("it shouldn't throw the error for 'unshift' method inside the 'update' method", () => {
        const planetState = createState<Planet>({
            name: "Mars",
            system: "Solar system",
            moons: [{ name: "Phobos" }],
        });

        planetState.update((s) => {
            s.moons?.unshift({ name: "Deimos" });
        });
    });
});

describe("Statemanjs computed API", () => {
    test("it should create computed state and react on changes (subscripe method)", () => {
        const DISTANCE = 225 * 1000000; // 225 million km
        const MAX_SPEED = 27000; // km/hr

        const speedState = createState<number>(10000);
        const travelTimeState = createState<number>(0); // seconds

        let remaningTravelTime = "";

        const remaningTravelTimeComputedState =
            createComputedState<string>((): string => {
                const speedKmPerSec = speedState.get() / 3600; // convert km/h to km/s
                const remainingDistance =
                    DISTANCE - speedKmPerSec * travelTimeState.get(); // calculate remaining distance
                const remainingTime = remainingDistance / speedKmPerSec; // calculate remaining time in seconds

                // calculate months, weeks, days, hours, minutes, and seconds
                const months = Math.floor(remainingTime / 2.628e6);
                const weeks = Math.floor(remainingTime / 604800);
                const days = Math.floor(remainingTime / 86400);
                const hours = Math.floor(remainingTime / 3600);
                const minutes = Math.floor(remainingTime / 60);
                const seconds = Math.floor(remainingTime);

                return `Mars is: ${months} month / ${weeks} weeks / ${days} days / ${hours} hours / ${minutes} minutes / ${seconds} seconds away`;
            }, [speedState, travelTimeState]);

        // test initialization
        expect(remaningTravelTimeComputedState.get()).toEqual(
            "Mars is: 30 month / 133 weeks / 937 days / 22500 hours / 1350000 minutes / 81000000 seconds away",
        );

        remaningTravelTimeComputedState.subscribe((s) => {
            remaningTravelTime = s;
        });

        speedState.set(MAX_SPEED);
        travelTimeState.set(216000);

        expect(remaningTravelTime).toEqual(
            "Mars is: 11 month / 49 weeks / 344 days / 8273 hours / 496400 minutes / 29784000 seconds away",
        );

        travelTimeState.set(16200000);

        expect(remaningTravelTime).toEqual(
            "Mars is: 5 month / 22 weeks / 159 days / 3833 hours / 230000 minutes / 13800000 seconds away",
        );
    });

    test("it should throw an error due to a missing dependency states array", () => {
        const problemState = createState<boolean>(true);

        const expectErr = () =>
            createComputedState<string>((): string => {
                return problemState.get()
                    ? "Houston, we have a problem"
                    : "Houston, everything is fine";
            }, []);

        expect(expectErr).toThrow();
    });

    test("It shouldn't work to change directly", () => {
        const problemState = createState<boolean>(false);

        const statusComputedState = createComputedState<string>((): string => {
            return problemState.get()
                ? "Houston, we have a problem"
                : "Houston, everything is fine";
        }, [problemState]);

        statusComputedState.get().replace("Houston", "Hacker");

        expect(statusComputedState.get()).toEqual(
            "Houston, everything is fine",
        );
    });

    test("it should handle unsubscribeAll on computed state", () => {
        const counterState = createState<number>(0);

        const doubleState = createComputedState<number>(
            () => counterState.get() * 2,
            [counterState],
        );

        let count1 = 0;
        let count2 = 0;

        doubleState.subscribe(() => {
            count1++;
        });

        doubleState.subscribe(
            () => {
                count2++;
            },
            { protect: true },
        );

        expect(doubleState.getActiveSubscribersCount()).toBe(2);

        doubleState.unsubscribeAll();

        expect(doubleState.getActiveSubscribersCount()).toBe(1);

        counterState.set(5);

        expect(count1).toBe(0);
        expect(count2).toBe(1);
    });

    test("it should handle lazy evaluation of computed state", () => {
        const counterState = createState<number>(0);

        let computeCount = 0;
        const doubleState = createComputedState<number>(() => {
            computeCount++;
            return counterState.get() * 2;
        }, [counterState]);

        // No computation yet
        expect(computeCount).toBe(0);

        // First get triggers computation
        expect(doubleState.get()).toBe(0);
        expect(computeCount).toBe(1);

        // Change without subscribers - marks as dirty but doesn't recompute immediately
        counterState.set(5);

        // Next get recomputes
        expect(doubleState.get()).toBe(10);
        expect(computeCount).toBe(2);
    });

    test("it should recompute computed state on dependency change", () => {
        const counterState = createState<number>(5);

        const squaredState = createComputedState<number>(() => {
            const val = counterState.get();
            return val * val;
        }, [counterState]);

        expect(squaredState.get()).toBe(25);

        counterState.set(10);
        expect(squaredState.get()).toBe(100);
    });

    test("it should handle multiple subscribers on computed state", () => {
        const counterState = createState<number>(0);

        const doubleState = createComputedState<number>(
            () => counterState.get() * 2,
            [counterState],
        );

        let count1 = 0;
        let count2 = 0;

        const unsub1 = doubleState.subscribe(() => {
            count1++;
        });

        doubleState.subscribe(() => {
            count2++;
        });

        counterState.set(5);
        expect(count1).toBe(1);
        expect(count2).toBe(1);

        unsub1();
        expect(doubleState.getActiveSubscribersCount()).toBe(1);

        counterState.set(10);
        expect(count1).toBe(1);
        expect(count2).toBe(2);
    });
});

describe("Utils", () => {
    test("It should format error", () => {
        const description = "test";
        const errorMsg = "test message";

        expect(formatError(description, new Error(errorMsg))).toEqual(
            `${description}: ${errorMsg}`,
        );
    });
});

describe("TransactionService", () => {
    it("should add a transaction", () => {
        const transactionService = new TransactionService<number>(9);
        transactionService.addTransaction(8);
        expect(transactionService.totalTransactions).toBe(2);
    });

    it("should get the last transaction", () => {
        const transactionService = new TransactionService<number>(9);
        transactionService.addTransaction(8);
        const lastTransaction = transactionService.getLastTransaction();
        expect(lastTransaction).not.toBeNull();
        expect(lastTransaction!.snapshot).toBe(8);
    });

    it("should get all transactions", () => {
        const transactionService = new TransactionService<number>(1);
        transactionService.addTransaction(2);
        transactionService.addTransaction(3);
        const allTransactions = transactionService.getAllTransactions();
        expect(allTransactions).toHaveLength(2);
    });

    it("should get a transaction by number", () => {
        const transactionService = new TransactionService<number>(3);
        transactionService.addTransaction(42);
        const transaction = transactionService.getTransactionByNumber(1);
        expect(transaction?.snapshot).toBe(42);
    });

    it("should get the last diff", () => {
        const transactionService = new TransactionService<number>(3);
        transactionService.addTransaction(42);
        transactionService.addTransaction(21);
        const lastDiff = transactionService.getLastDiff();
        expect(lastDiff?.old).toBe(42);
        expect(lastDiff?.new).toBe(21);
    });

    it("should get the diff between two transactions", () => {
        const transactionService = new TransactionService<number>(3);
        transactionService.addTransaction(42);
        transactionService.addTransaction(21);
        const diff = transactionService.getDiffBetween(1, 2);
        expect(diff?.old).toBe(42);
        expect(diff?.new).toBe(21);
    });

    it("should get the null last diff", () => {
        const transactionService = new TransactionService<number>(3);
        transactionService.addTransaction(42);
        const diff = transactionService.getLastDiff();
        expect(diff).toBeNull();
    });

    it("should get the null diff between two transactions", () => {
        const transactionService = new TransactionService<number>(3);
        transactionService.addTransaction(42);
        const diff = transactionService.getDiffBetween(1, 2);
        expect(diff).toBeNull();
    });
});

export {};
