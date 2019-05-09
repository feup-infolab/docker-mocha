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

    static shutdown(callback){callback(null)}
}

module.exports = Init;
