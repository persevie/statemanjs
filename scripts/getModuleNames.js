const fs = require("fs").promises;
const path = require("path");

const directoryPath = path.join(__dirname, "../src");

function getModuleNames() {
    return fs.readdir(directoryPath).then((files) => {
        let directories = [];

        return Promise.all(
            files.map((file) => {
                return fs.stat(path.join(directoryPath, file)).then((stat) => {
                    if (stat.isDirectory()) {
                        directories.push(file);
                    }
                });
            }),
        ).then(() => directories);
    });
}

module.exports = getModuleNames;
