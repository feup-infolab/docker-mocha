const expressServer = require("./src/index");

expressServer.start(() =>
{
    expressServer.stop();
});
