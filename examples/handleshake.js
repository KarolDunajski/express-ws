var express = require('express');
var expressWs = require('..')

var expressWs = expressWs(express());
var app = expressWs.app;

app.use(function (req, res, next) {
  console.log('middleware');
  req.testing = 'testing';
  return next();
});

app.get('/', function(req, res, next){
  console.log('get route', req.testing);
  res.end();
});

var getSessionCookie = function () {
  return 'session=1cbbad7de0d49f3188500cdf398e36c5; Version=1; Path=/';
}

var handleShake = {
  'set-coockie': getSessionCookie(),
}

app.ws('/', handleShake, function(ws, req) {
  ws.on('message', function(msg) {
    console.log(msg);
  });
  console.log('socket', req.testing);
});

app.listen(3000)
