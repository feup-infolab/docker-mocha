const server = require("../server");

class InitZero
{
    static load(callback){callback(null)}

    static init(callback)
    {
        server();
        callback(null);
    }

    static shutdown(callback){callback(null)}
}

module.exports = InitZero;
