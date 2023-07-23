const { execSync } = require("child_process");
const getModuleNames = require("./getModuleNames");

const providedModuleName = process.argv[2];

if (!providedModuleName) {
    console.error("No module name provided");
    process.exit(1);
}

function test(moduleName) {
    // TODO: add tests for solidjs and remove this 'if' condition
    if (moduleName !== "statemanjs-solid") {
        console.log(`Testing ${moduleName}...`);
        execSync(`jest --config=src/${moduleName}/jest.config.ts`, {
            stdio: "inherit",
        });
    }
}

getModuleNames()
    .then((existedModuleNames) => {
        if (providedModuleName === "all") {
            existedModuleNames.forEach((mn) => {
                test(mn);
            });
        } else if (existedModuleNames.includes(providedModuleName)) {
            test(providedModuleName);
        } else {
            console.error(
                `Invalid module name provided - ${providedModuleName}`,
            );
            process.exit(1);
        }
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
