const request = require('request');
const argv = require('yargs').argv;
const port = 3000;

const InitZero = require("setup/initZero");

class Init extends InitZero
{
    static load(callback)
    {
        request('http://localhost:' + port + '/init', {json:true}, (err, res, body) =>
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

module.exports = Init;
