const packageJson = require("../package.json");
const fs = require("fs");

fs.writeFile(
    "./package/package.json",
    JSON.stringify({
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description,
        main: packageJson.main,
        module: packageJson.module,
        typings: packageJson.typings,
        license: packageJson.license,
        repository: packageJson.repository,
        bugs: packageJson.bugs,
        publishConfig: packageJson.publishConfig,
        files: packageJson.files,
        keywords: packageJson.keywords,
        author: packageJson.author,
    }),
    "utf8",
    (err) => {
        if (err) {
            console.log(`Can't create a package.json - ${err}`);
        } else {
            console.log("The package.json was created");
        }
    },
);
