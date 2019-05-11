const request = require('request');
const argv = require('yargs').argv;
const port = 3000;
const path = require("path");


// console.log(`ESTOU AQUI antes do INITZERO: ${process.cwd()}`);

const InitZero = require(path.join(process.cwd(),"/setup/initZero"));

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

    static shutdown(callback){
        super.shutdown(callback);
    }
}

module.exports = Init;
