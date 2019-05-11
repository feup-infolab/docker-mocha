const expressServer = require("./src/index");


function f(callback)
{
    expressServer.start(callback);
}

module.exports = f;