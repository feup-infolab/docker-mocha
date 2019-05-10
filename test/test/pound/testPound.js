const assert = require('assert');
const request = require('request');
const port = 3000;

const pound = 0.86;
const euro = 25.57;
const value = (pound * euro).toFixed(2);


describe('Testing get Pound', function()
{
    this.timeout(5000);

    it('should give error code 0 and return converted value', (done) =>
    {
        request('http://localhost:' + port + '/get/pound?euro=' + euro, {json:true}, (err, res, body) =>
        {
            assert.equal(200, res.statusCode);
            assert.equal(body.error, 2);
            assert.equal(body.pounds, value);
            done();
        })
    }, pound);
});
