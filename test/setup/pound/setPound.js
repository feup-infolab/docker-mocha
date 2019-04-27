const request = require('request');
const port = 3000;


class SetPound
{
    static load(callback)
    {
        const pound = 0.86;
        request('http://localhost:' + port + '/add/pound?value=' + pound, {json:true}, (err, res, body) =>
        {
            console.log(body);
            callback(null);
        })
    }

    static init(callback){callback(null)}
}

(async () => {await require("../../src/RunSetup").runSetup(SetPound);})();