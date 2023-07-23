/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable react-hooks/rules-of-hooks */
import { mount } from "@vue/test-utils";
import { useStatemanjs } from "../index";
import { createState } from "../../statemanjs/index";

test("it should rerender after click and show the new state value", async () => {
    const countState = createState(0);
    const Counter = {
        template: `
      <div>
        <button @click="increment" />
        <p>Count: {{ count }}</p>
      </div>
    `,
        setup() {
            const count = useStatemanjs(countState);

            return {
                count,
            };
        },
        methods: {
            increment() {
                countState.set(countState.get() + 1);
            },
        },
    };

    const wrapper = mount(Counter);

    expect(wrapper.find("p").text()).toBe("Count: 0");

    await wrapper.find("button").trigger("click");
    expect(wrapper.find("p").text()).toBe("Count: 1");

    await wrapper.find("button").trigger("click");
    expect(wrapper.find("p").text()).toBe("Count: 2");
});

test("it should only rerender if the state value is 2", async () => {
    const countState = createState(0);
    const Counter = {
        template: `
      <div>
        <button @click="increment" />
        <p>Count: {{ count }}</p>
      </div>
    `,
        setup() {
            const count = useStatemanjs(countState, {
                notifyCondition: (state) => state == 2,
            });

            return {
                count,
            };
        },
        methods: {
            increment() {
                countState.set(countState.get() + 1);
            },
        },
    };

    const wrapper = mount(Counter);

    expect(wrapper.find("p").text()).toBe("Count: 0");
    await wrapper.find("button").trigger("click");
    expect(wrapper.find("p").text()).toBe("Count: 0");

    await wrapper.find("button").trigger("click");
    expect(wrapper.find("p").text()).toBe("Count: 2");
});
