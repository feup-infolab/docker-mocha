const assert = require('assert');
const request = require('request');
const port = 3000;

const pound = 0.86;


describe('Testing set Pound', function()
{
    this.timeout(5000);

    it('should give error code 0', (done) =>
    {

        request('http://localhost:' + port + '/add/pound?value=' + pound, {json:true}, (err, res, body) =>
        {
            assert.equal(200, res.statusCode);
            assert.equal(body.error, 0);
            done();
        })
    })
});
