const assert = require('assert');
const request = require('request');
const setPound = require("../pound/setPound");
const port = 3000;

const pound = 0.86;
const euro = 25.57;
const value = (pound * euro).toFixed(2);


describe('Testing get Pound', function()
{
    this.timeout(5000);

    it('should give error code 0 and return converted value', (done) =>
    {
        setPound.setup(() =>
        {
            request('http://localhost:' + port + '/get/pound?euro=' + euro, {json:true}, (err, res, body) =>
            {
                assert.equal(200, res.statusCode);
                assert.equal(body.error, 0);
                assert.equal(body.pounds, value);
                done();
            })
        }, pound);
    })
});



/**
 * Not used for now
 */

/*
 exports.setup = (done) =>
 {
    setPound.setup(() =>
    {
        request('http://localhost:' + port + '/add/pound?value=' + pound, {json:true}, (err, res, body) =>
        {
            done();
        })
    });
};
*/