const { execSync } = require("child_process");
const fs = require("fs");
const getModuleNames = require("./getModuleNames");
const directoryExists = require("./directoryExists");

const providedModuleName = process.argv[2];

if (!providedModuleName) {
    console.error("No module name provided");
    process.exit(1);
}

const releaseType = process.argv[3];

if (!releaseType || !["major", "minor", "patch"].includes(releaseType)) {
    console.error("Please provide a valid release type: major, minor, patch");
    process.exit(1);
}

function publish(moduleName) {
    console.log(`Set new version to ${moduleName}...`);
    execSync(`npm --prefix src/${moduleName} version ${releaseType}`, {
        stdio: "inherit",
    });

    console.log(`Copying package.json of ${moduleName} module...`);
    fs.copyFileSync(
        `src/${moduleName}/package.json`,
        `packages/${moduleName}/package.json`,
    );

    console.log(`Publishing ${moduleName}...`);
    execSync(`cd ./packages/${moduleName} && npm publish`, {
        stdio: "inherit",
    })

    console.log(`Removing build ${moduleName}...`);
    execSync(`rm -rf ./packages/${moduleName}`, {
        stdio: "inherit",
    })
}

getModuleNames()
    .then((existedModuleNames) => {
        if (existedModuleNames.includes(providedModuleName)) {
            const dir = `packages/${providedModuleName}`;

            if (!directoryExists(dir)) {
                console.error(
                    `Directory "${dir}" doesn't exists. Please run "npm run build:${providedModuleName}" first`,
                );
                process.exit(1);
            }

            publish(providedModuleName);
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
