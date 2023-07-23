const fs = require("fs");

function directoryExists(directoryPath) {
    try {
        return fs.statSync(directoryPath).isDirectory();
    } catch (err) {
        if (err.code === "ENOENT") {
            return false;
        } else {
            throw err;
        }
    }
}

module.exports = directoryExists;
