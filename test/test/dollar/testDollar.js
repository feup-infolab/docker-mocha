const assert = require('assert');
const request = require('request');
const port = 3000;

const dollar = 1.13;
const euro = 13.99;
const value = (dollar * euro).toFixed(2);


describe('Testing get Dollar', function()
{
    this.timeout(5000);

    it('should give error code 0 and return converted value', (done) =>
    {
        request('http://localhost:' + port + '/get/dollar?euro=' + euro, {json:true}, (err, res, body) =>
        {
            assert.equal(200, res.statusCode);
            assert.equal(body.error, 0);
            assert.equal(body.dollars, value);
            done();
        })

    })
});