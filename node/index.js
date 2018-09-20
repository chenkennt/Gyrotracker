const jwt = require('jsonwebtoken');
const axios = require('axios');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');

var SignalR = function (connectionString) {
  var endpoint, accessKey;
  function parseConectionString(connectionString) {
    connectionString.split(';').forEach(i => {
      if (i === '') return;
      var p = i.indexOf('=');
      switch (i.slice(0, p)) {
        case 'Endpoint': endpoint = i.slice(p + 1); break;
        case 'AccessKey': accessKey = i.slice(p + 1); break;
      }
    });
  }

  parseConectionString(connectionString);

  function getClientHubUrl(hubName) {
    return `${endpoint}:5001/client/?hub=${hubName}`;
  }

  function generateToken(audience) {
    var token = {
      aud: audience
    };
    var signed = jwt.sign(token, accessKey, { expiresIn: '30m' });
    return signed;
  }

  function generateNegotiateResponse(hubName) {
    var url = getClientHubUrl(hubName);
    return {
      url: url,
      accessToken: generateToken(url)
    };
  }

  function send(hubName, methodName, args) {
    var payload = {
      target: methodName,
      arguments: args
    };
    var url = `${endpoint}:5002/api/v1-preview/hub/${hubName}`;
    var bearer = generateToken(url);
    return axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${bearer}`,
        'Accept': 'application/json',
        'Accept-Charset': 'utf-8',
        'Content-Type': 'application/json'
      }
    });
  }

  return {
    generateNegotiateResponse: generateNegotiateResponse,
    send: send
  };
};

var signalR = new SignalR(process.env['Azure__SignalR__ConnectionString']);
var port = process.env.PORT || 5000;

app.use(express.static('public'));
app.use(bodyParser.json());
app.post('/sensor/negotiate', (req, res) => res.send(signalR.generateNegotiateResponse('sensor')));
app.post('/sensor/update', (req, res) => {
  if (!req.body) {
    res.status(400).send('body doesn\'t contain x or y');
    return;
  }
  var x = Number.parseInt(req.body.x), y = Number.parseInt(req.body.y);
  if (x === NaN || y === NaN) {
    res.status(400).send('body doesn\'t contain x or y');
    return;
  }
  var t = process.hrtime();
  signalR.send('sensor', 'update', [x, y])
    .then(() => res.send({
      message: 'ok',
      time: process.hrtime(t)
    }))
    .catch(() => res.status(500).send({
      message: 'fail to send to SignalR service',
      time: process.hrtime(t)
    }));
});

app.listen(port, () => console.log(`App is listening on port ${port}`));
