const express = require('express');
const fs = require('fs');
const folder = 'resources';
const file = 'currency.json';
const path = folder + '/' + file;

const app = express();


exports.start = (callback, port = 3000) =>
{
    app.get('/', (req, res) => res.send('Hello World!'));

    app.get('/init', (req, res) =>
    {
        fs.mkdir(folder, {recursive: true}, (err1) =>
        {
            fs.writeFile(path, '{}', (err2) =>
            {
                if(err1 || err2)
                    res.json({error: 1});
                else
                    res.json({error: 0});
            });
        });
    });

    app.get('/add/dollar', (req, res) =>
    {
        fs.readFile(path, (err, data) =>
        {
            if(err || req.query.value == null)
                res.json({error: 1});
            else
            {
                let obj = JSON.parse(data);
                obj.dollar = req.query.value;
                data = JSON.stringify(obj);
                fs.writeFile(path, data, (err2) =>
                {
                    if(err2)
                        res.json({error: 1});
                    else
                        res.json({error: 0});
                });
            }
        });
    });

    app.get('/add/pound', (req, res) =>
    {
        fs.readFile(path, (err, data) =>
        {
            if(err || req.query.value == null)
                res.json({error: 1});
            else
            {
                let obj = JSON.parse(data);
                obj.pound = req.query.value;
                data = JSON.stringify(obj);
                fs.writeFile(path, data, (err2) =>
                {
                    if(err2)
                        res.json({error: 1});
                    else
                        res.json({error: 0});
                });
            }
        });
    });

    app.get('/get/dollar', (req, res) =>
    {
        fs.readFile(path, (err, data) =>
        {
            if(err || req.query.euro == null)
                res.json({error: 1});
            else
            {
                let obj = JSON.parse(data);
                const value = (obj.dollar * req.query.euro).toFixed(2);
                res.json({error: 0, dollars: value});
            }
        });
    });

    app.get('/get/pound', (req, res) =>
    {
        fs.readFile(path, (err, data) =>
        {
            if(err || req.query.euro == null)
                res.json({error: 1});
            else
            {
                let obj = JSON.parse(data);
                const value = (obj.pound * req.query.euro).toFixed(2);;
                res.json({error: 0, pounds: value});
            }
        });
    });

    server = app.listen(port, () =>
    {
        console.log(`App listening on port ${port}!`);
        if(callback != null)
            callback();
    });

    exports.server = server;
};


exports.stop = () =>
{
    console.log('Closing app!');
    this.server.close();
};
