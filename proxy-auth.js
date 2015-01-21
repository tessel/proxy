// this file needs to export a single function `validate(token, cb)`

var AUTH_TESSEL_OA2 = process.env.AUTH_TESSEL_OA2,      // base URL, but must include client credentials!
    AUTH_HARDCODED = process.env.AUTH_HARDCODED || 'DEV-CRED';

if (AUTH_TESSEL_OA2) {
  var url = require('url'),
      fermata = require('fermata'),
      oa2_url = url.parse(AUTH_TESSEL_OA2),
      client_id = oa2_url.auth.split(':')[0],
      token_api = fermata.json(AUTH_TESSEL_OA2)('oauth', 'token'),
      profile_api = delete oa2_url.auth && fermata.json(url.format(oa2_url))('users', 'profile');
  module.exports = function (token, cb) {
    token_api.post({'Content-Type':"application/x-www-form-urlencoded"}, {
      grant_type: "https://tessel-grant",
      api_key: token,
      client_id: client_id
    }, function (e,d) {
      if (e && e.status === 400) cb(null, null);
      else if (e) cb(e);
      else profile_api({access_token:d.access_token}).get(function (e,d,m) {
        if (e) cb(e);
        else cb(null, d.username);
      });
    });
  };
}
else if (AUTH_HARDCODED) module.exports = function (token, cb) {
  if (token === AUTH_HARDCODED) cb(null, "[hardcoded account]");
  else cb(null, null);
};
