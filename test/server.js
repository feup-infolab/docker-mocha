const Server = require('./src/index');


Server.start(() =>
{
    console.log("Started");
}, 3000);