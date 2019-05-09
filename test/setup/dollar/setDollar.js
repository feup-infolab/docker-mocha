const request = require('request');
const port = 3000;

class SetPound
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
}

console.log("ANTES do setup setup/dollar/setDollar.js");

(async () => {await require("../../src/RunSetup").runSetup(SetPound);})();

console.log("DEPOIS do setup setup/dollar/setDollar.js");