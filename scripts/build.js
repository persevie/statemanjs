const { execSync } = require("child_process");
const getModuleNames = require("./getModuleNames.js");

const providedModuleName = process.argv[2];

if (!providedModuleName) {
    console.error("No module name provided");
    process.exit(1);
}

function build(moduleName) {
    console.log(`Building ${moduleName}...`);
    execSync(`PACKAGE_NAME=${moduleName} rollup --config rollup.config.js`, {
        stdio: "inherit",
    });
    console.log(`Build of ${moduleName} completed`);
}

getModuleNames()
    .then((existedModuleNames) => {
        if (existedModuleNames.includes(providedModuleName)) {
            if (providedModuleName === "statemanjs") {
                console.log(
                    `Testing "statemanjs" module before building ${providedModuleName} ...`,
                );

                existedModuleNames.forEach((moduleNameToTest) => {
                    execSync(`npm run test:${moduleNameToTest}`, {
                        stdio: "inherit",
                    });
                });
            } else {
                execSync(`npm run test:${providedModuleName}`, {
                    stdio: "inherit",
                });
            }

            build(providedModuleName);
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
