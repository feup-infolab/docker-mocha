const request = require('request');
const port = 3000;

const Init = require("../init");

class SetPound extends Init
{
    static load(callback)
    {
        const pound = 0.86;
        console.log("Body antes pound");

        request('http://localhost:' + port + '/add/pound?value=' + pound, {json:true}, (err, res, body) =>
        {
            console.log("Body aqui: ", body);
            callback(null);
        })
    }

    static init(callback)
    {
        super.init(callback);
    }

    static shutdown(callback){
        super.shutdown(callback);
    }
}

module.exports = SetPound;

