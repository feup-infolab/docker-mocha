const request = require('request');
const port = 3000;

function setup()
{
    request('http://localhost:' + port + '/init', {json:true}, (err, res, body) =>
    {
        console.log(body);
    })
}

setup();