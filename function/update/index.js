module.exports = async function (context, req) {
  if (!req.body) {
    context.res = {
      status: 400,
      body: 'body doesn\'t contain x or y'
    };
    return;
  }
  var x = Number.parseInt(req.body.x), y = Number.parseInt(req.body.y), name = req.body.name;
  if (x === NaN || y === NaN) {
    context.res = {
      status: 400,
      body: 'body doesn\'t contain x or y'
    };
    return;
  }
  context.bindings.signalRMessages = [{
    target: 'update',
    arguments: [x, y, name]
  }];
  context.res = { body: 'ok' };
};