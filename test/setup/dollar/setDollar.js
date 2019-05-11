const request = require('request');
const port = 3000;

const Init = require("../init");

class SetDollar extends Init
{
    static load(callback)
    {
        const dollar = 1.13;
        console.log("Body antes dollar");
        request('http://localhost:' + port + '/add/dollar?value=' + dollar, {json:true}, (err, res, body) =>
        {
            console.log("Body aqui: ", body);
            callback(null);
        })
    }

    static init(callback)
    {
        super.init(callback);
    }

    static shutdown(callback){callback(null)}
}

module.exports = SetDollar;