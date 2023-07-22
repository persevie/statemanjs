const fs = require("fs");
const { cwd } = require("process");

const packageJsonPath = process.argv[2];

if (!packageJsonPath) {
    console.error('No package.json path provided');
    process.exit(1);
}

console.log(cwd())
const packageJson = require(`${packageJsonPath}/package.json`);

fs.writeFile(
    "./publish/package.json",
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
