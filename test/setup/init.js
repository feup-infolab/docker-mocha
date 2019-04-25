const request = require('request');
const port = 3000;

class Init
{
    static load(callback)
    {
        request('http://localhost:' + port + '/init', {json:true}, (err, res, body) =>
        {
            console.log(body);
            callback(null);
        })
    }

    static init(callback){callback(null)}
}

(async () => {await require("../../docker-mocha-run").runSetup(Init);})();
