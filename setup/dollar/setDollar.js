const request = require('request');
const port = 3000;

const dollar = 1.13;

function setup(dollarVal)
{
    if(dollarVal === null)
        dollarVal = dollar;

    request('http://localhost:' + port + '/add/dollar?value=' + dollarVal, {json:true}, (err, res, body) =>
    {
        console.log(body);
    })

}

setup(dollar);