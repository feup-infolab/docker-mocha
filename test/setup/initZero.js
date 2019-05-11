const server = require("../src/index");

class InitZero
{
    static load(callback){callback(null)}

    static init(callback)
    {
        server.start(callback);
    }

    static shutdown(callback){
        server.stop(callback);
    }
}

module.exports = InitZero;
