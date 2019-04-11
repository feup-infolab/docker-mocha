const request = require('request');
const port = 3000;

const pound = 0.86;

function setup(poundVal)
{
    if(poundVal === null)
        poundVal = pound;

        request('http://localhost:' + port + '/add/pound?value=' + poundVal, {json:true}, (err, res, body) =>
        {
            console.log(body);
        })
}

setup(pound);