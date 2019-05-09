const request = require('request');
const argv = require('yargs').argv;
const port = 3000;

class Init
{
    static load(callback)
    {
        request('http://localhost:' + port + '/init', {json:true}, (err, res, body) =>
        {
            console.log("Body aqui: ", body);
            callback(null);
        })
    }

    static init(callback){callback(null)}
}


console.log("ANTES do setup setup/init.js");

(async () =>
{
    await require("../src/RunSetup").runSetup(Init);
})();

console.log("DEPOIS do setup setup/init.js");