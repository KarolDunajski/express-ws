var url = require('url');
var urlJoin = require('url-join');
var http = require('http');
var ServerResponse = http.ServerResponse;
var WebSocketServer = require('ws').Server;

var wsServers = {};

/**
 * @param {express.Application} app
 * @param {http.Server} [server]
 */
module.exports = function (app, server) {
  if (!server) {
    server = http.createServer(app);

    app.listen = function () {
      return server.listen.apply(server, arguments)
    }
  }

  function addSocketRoute(route, middleware, handleShake, callback) {
    var args = [].splice.call(arguments, 0);
    var wsPath = urlJoin(app.mountpath, route);
    var newHandleShake = null;

    if (args.length < 2)
      throw new SyntaxError('Invalid number of arguments');

    // możliwosci
    // jeżeli są 2 
    //    middleware jest middleware
    //      OK
    //     middleware jest callback
    //       middleware = [middleware];
    // jeżeli są 3 
    //    middleware jest middleware   handleShake jest callback
    //       middleware.push(handleShake);
    //    middleware jest handleShake  handleShake jest callckack
    //      middleware = [handleShake];
    // jeżeli są 4
    //    middleware.push(callback)
    // odpowiednia kolejność 
    
    if (args.length === 2) {
      if (typeof middleware === 'function') {
        middleware = [middleware];
      }
    } else if (args.length === 3 && Array.isArray(middleware) && typeof handleShake === 'function') {
      middleware.push(handleShake);
    } else if (args.length === 3 && !(Array.isArray(middleware)) && typeof handleShake === 'function') {
      newHandleShake = middleware;
      middleware = [handleShake];
    } else {
      newHandleShake = handleShake;
      middleware.push(callback);
    }

    var wss = new WebSocketServer({
      server: server,
      path: wsPath
    });

    wsServers[wsPath] = wss;

    if (newHandleShake !== null) {
      wss.on('headers', function (headers) {
        
        
        var newHeaderKeys = Object.keys(newHandleShake);
        for (var index = 0; index < newHeaderKeys.length; index++) {
            var str = newHeaderKeys[index] + ': ' + newHandleShake[newHeaderKeys[index]];
            headers.push(str);
        }
        console.log('change handlesjake',headers);
      });
    }

    wss.on('connection', function (ws) {
      var response = new ServerResponse(ws.upgradeReq);
      response.writeHead = function (statusCode) {
        if (statusCode > 200) ws.close();
      };
      ws.upgradeReq.method = 'ws';

      app.handle(ws.upgradeReq, response, function (err) {
        var idx = 0;
        (function next(err) {
          if (err) return;
          var cur = middleware[idx++];
          if (!middleware[idx]) {
            cur(ws, ws.upgradeReq);
          } else {
            cur(ws.upgradeReq, response, next);
          }
        } (err));
      });
    });

    return app;
  };

  app.ws = addSocketRoute;

  return {
    app: app,
    getWss: function (route) {
      return wsServers[route];
    }
  };
};
