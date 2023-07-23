/* eslint-disable @typescript-eslint/explicit-function-return-type */
import fs from "fs";
import { countOfElements } from "../shared.mjs";

function _pushAndCalculateTime(items, push) {
    const start = performance.now();
    for (let iter = 0; iter < items; iter++) {
        push({ foo: "bar", baz: "qux" });
    }
    const end = performance.now();

    return end - start;
}

function fill(
    candidateName,
    addToStateCb,
    resetStateCb,
    getStateCb,
    iterations = 1,
) {
    function _runFillCase(items) {
        const res = [];

        for (let i = 1; i <= iterations; i++) {
            console.log(
                `[Fill; ${candidateName}; ${items} item(s)] ${i} iteration  started ${new Date().toLocaleString()}`,
            );

            resetStateCb();

            if (!getStateCb() || getStateCb().length != 0) {
                throw new Error(
                    "[FILL BENCH ERROR]: The state should be empty",
                );
            }

            res.push(_pushAndCalculateTime(items, addToStateCb));

            const stateLen = getStateCb().length;

            if (stateLen !== items) {
                throw new Error(
                    `[FILL BENCH ERROR]: Items not added to state (${stateLen})`,
                );
            }

            console.log(
                `Iteration ${i} completed ${new Date().toLocaleString()}`,
            );
            console.log("");
        }

        if (res.length !== iterations) {
            throw new Error(
                `[FILL BENCH ERROR]: Length array of results is invvalid (now -${res.length}, should - ${iterations})`,
            );
        }

        let data;
        const fileName = "./benchmarks/results/fill.json";

        try {
            data = fs.readFileSync(fileName, {
                encoding: "utf8",
                flag: "r",
            });
        } catch (e) {
            console.log("File was created");
        }

        const dataObj = data ? JSON.parse(data) : {};

        if (!dataObj[items]) {
            dataObj[items] = {};
        }

        const midRes =
            iterations > 1
                ? res.reduce((acc, rec) => acc + rec) / iterations
                : res[0];

        dataObj[items][candidateName] = midRes;

        fs.writeFileSync(fileName, JSON.stringify(dataObj), (err) => {
            if (err) {
                throw new Error(`[FILL BENCH ERROR]: ${err.message}`);
            }
        });

        if (countOfElements.length > 0) {
            _runFillCase(countOfElements.shift());
        }
    }

    _runFillCase(countOfElements.shift());
}

export { fill };
