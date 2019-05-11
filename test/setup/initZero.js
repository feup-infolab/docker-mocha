const server = require("../server");

class InitZero
{
    static load(callback){callback(null)}

    static init(callback)
    {
        server(callback);
    }

    static shutdown(callback){
        server.server.close(callback);
    }
}

module.exports = InitZero;
