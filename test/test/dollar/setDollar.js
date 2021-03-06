const assert = require('assert');
const request = require('request');
const port = 3000;

const dollar = 1.13;

describe('Testing set Dollar', function()
{
    this.timeout(5000);

    it('should give error code 0', (done) =>
    {
        request('http://localhost:' + port + '/add/dollar?value=' + dollar, {json:true}, (err, res, body) =>
        {
            assert.equal(200, res.statusCode);
            assert.equal(body.error, 0);
            done();
        })
    })
});


