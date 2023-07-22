import {
    cleanup,
    fireEvent,
    getNodeText,
    render,
} from "@testing-library/react";
import React from "react";
import { createState } from "@persevie/statemanjs";
import { useStatemanjs } from "../index";

type BaseTestComponentProps = {
    labelOn: string;
    labelOff: string;
};

const isCheckedState = createState(false);

function BaseTestComponent(props: BaseTestComponentProps): JSX.Element {
    const { labelOn, labelOff } = props;
    const isChecked = useStatemanjs(isCheckedState);

    const onChange = (): void => {
        isCheckedState.set(!isChecked);
    };

    return (
        <label>
            <input type="checkbox" checked={isChecked} onChange={onChange} />
            {isChecked ? labelOn : labelOff}
        </label>
    );
}

const countState = createState(0);

function UpdateConditionTestComponent(): JSX.Element {
    const integerCount = useStatemanjs(countState, {
        notifyCondition: (state) => state == 2,
    });

    const onClick = (): void => {
        countState.set(countState.get() + 1);
    };

    return (
        <>
            <p data-testid="count">{integerCount}</p>;
            <button data-testid="countBtn" onClick={onClick}>
                Inc
            </button>
        </>
    );
}

afterEach(cleanup);

test("it should rerender after click and show the new state value", () => {
    const { queryByLabelText, getByLabelText } = render(
        <BaseTestComponent labelOn="On" labelOff="Off" />,
    );

    expect(queryByLabelText(/off/i)).toBeTruthy();

    fireEvent.click(getByLabelText(/off/i));

    expect(queryByLabelText(/on/i)).toBeTruthy();
});

test("it should only rerender if the state value is 2", () => {
    const { getByTestId } = render(<UpdateConditionTestComponent />);
    const btn = getByTestId("countBtn");

    fireEvent.click(btn);
    expect(getNodeText(getByTestId("count"))).toBe("0");

    fireEvent.click(btn);
    expect(getNodeText(getByTestId("count"))).toBe("2");
});
