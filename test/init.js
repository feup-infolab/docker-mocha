const assert = require('assert');
const request = require('request');
const expressServer = require('../src/index');
const port = 3000;

beforeEach(() =>
{
    expressServer.start(null, port);
});

afterEach(() =>
{
    expressServer.stop();
});


describe('Testing server requests', function()
{

    describe('Testing hello world', function ()
    {
        this.timeout(5000);

        it('should say "Hello, world!"', (done) =>
        {
            request('http://localhost:' + port, {json:true}, (err, res, body) =>
            {
                assert.equal(200, res.statusCode);
                assert.equal(body, "Hello World!");
                done();
            })
        })
    });

    describe('Testing init', function ()
    {
        this.timeout(5000);

        it('should give error code 0"', (done) =>
        {
            request('http://localhost:' + port + '/init', {json:true}, (err, res, body) =>
            {
                assert.equal(200, res.statusCode);
                assert.equal(body.error, 0);
                done();
            })
        })

    });
});

exports.setup = (done) =>
{
    request('http://localhost:' + port, {json:true}, (err, res, body) =>
    {
        done();
    })
};
