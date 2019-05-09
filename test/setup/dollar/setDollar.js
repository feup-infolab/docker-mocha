const request = require('request');
const port = 3000;

class SetDollar
{
    static load(callback)
    {
        const dollar = 1.13;
        request('http://localhost:' + port + '/add/dollar?value=' + dollar, {json:true}, (err, res, body) =>
        {
            console.log("Body aqui: ", body);
            callback(null);
        })
    }

    static init(callback){callback(null)}

    static shutdown(callback){callback(null)}
}

module.exports = SetDollar;