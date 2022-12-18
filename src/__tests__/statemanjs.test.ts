import { createState } from "../index";

type Moon = {
    name: string;
};
type Planet = {
    name: string;
    system: string;
    moons?: Moon[];
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
        let isTheMoonGettingCloser = false;
        isTheMoonGettingCloser;

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

    test("it should delete all subscribers (unsubscribeAll method)", () => {
        let isTheMoonInPerigee = false;
        let isTheMoonInApogee = true;
        isTheMoonInPerigee;
        isTheMoonInApogee;

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

        moonObserverState.subscribe(
            () => {
                isTheMoonInApogee = true;
            },
            { notifyCondition: (s) => s.distance === apogee },
        );

        moonObserverState.subscribe((s) => {
            if (s.distance !== apogee && s.distance !== perigee) {
                isTheMoonInApogee = false;
                isTheMoonInPerigee = false;
            }
        }, {});

        moonObserverState.unsubscribeAll();

        expect(moonObserverState.getActiveSubscribersCount()).toBe(0);
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

    test("it should deny direct acces", () => {
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

export {};
