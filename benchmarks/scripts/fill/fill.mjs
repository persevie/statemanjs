import { Command } from "commander";
import { fill } from "../../cases/fill/fill.mjs";
import effector from "../../candidates/effector.mjs";
import mobx from "../../candidates/mobx.mjs";
import redux from "../../candidates/redux.mjs";
import statemanjs from "../../candidates/statemanjs.mjs";

const program = new Command();

program.name("fill-test");

// mobx
program
    .command("m")
    .action(() => fill(mobx.name, mobx.add, mobx.reset, mobx.getState, 100));

// statemanjs
program.command("s").action(() => {
    fill(
        statemanjs.name,
        statemanjs.add,
        statemanjs.reset,
        statemanjs.getState,
        100,
    );
});

// effector
program
    .command("e")
    .action(() =>
        fill(
            effector.name,
            effector.add,
            effector.reset,
            effector.getState,
            100,
        ),
    );

// redux
program
    .command("r")
    .action(() => fill(redux.name, redux.add, redux.reset, redux.getState, 100));

program.parse();
