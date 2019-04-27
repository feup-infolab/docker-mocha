const request = require('request');
const port = 3000;

class SetPound
{
    static load(callback)
    {
        const dollar = 1.13;
        request('http://localhost:' + port + '/add/dollar?value=' + dollar, {json:true}, (err, res, body) =>
        {
            console.log(body);
            callback(null);
        })
    }

    static init(callback){callback(null)}
}


(async () => {await require("../../src/RunSetup").runSetup(SetPound);})();