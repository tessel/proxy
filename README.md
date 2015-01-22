# tessel-proxy

Tunnel all your Tessel's outgoing `net`/`tls` connections over a single socket through this TCP/TLS proxy server. It will be fun!

## Why you should host your own proxy server

TLS connections made from a client to a target node, via this proxy, do not get true end-to-end security!

A secure connection is always used between the device to the proxy server. And if you create a `tls` connection on the device, a secure connection will be used between the proxy server and the target node. **But** the proxy server itself has access to the "plain text" communications between the target and the server.

So when your Tessel is using a proxy for its outgoing connections, that proxy can (in theory) easily see — and/or tamper with — everything you send or receive. Passwords, API keys, the strange things you say in your sleep, the G-code your expensive CNC mill will trustingly execute… you trust whoever runs your proxy server with this.

(Ideally, the client would simply keep doing its own TLS negotiation and the proxy server would not have to be trusted. Unfortunately, this would have required a major overhaul to the Tessel's network implementation, and so this compromise was chosen.)

If you are more more comfortable with a self-hosted solution, or if you simply want to give your Tessel's VPN-like access to a local network, these instructions are for you.

## Deploying your own proxy server

Clone this repository, and then run `npm install` to fetch its dependencies. You will also need to provide a so-called "SSL certificate", which you can generate via the instructions below. Now from within this folder you will be able to launch the daemon, with any configuration desired, via something like `AUTH_HARDCODED=mypassword npm start` (runs under `supervisor` for automatic restart) or `node proxy` (directly).

You can override a number of settings via environment variables, but first…

### Another Important Warning!

The proxy server makes **no effort** to limit outgoing connections to "safe" IP addresses. Proxy clients will be using your DNS server and your network interfaces! Consider what other services (databases? shared folders? centrifuge controllers?) may be available from the perspective of the proxy server.

Unless you are certain that you can trust all clients (e.g. using a hardcoded password that only you know), you must take steps at the system or VM level to "firewall" the process appropriately.

### Network settings

The proxy is a TLS socket server, configured via the following environment variables:

* `PORT` — this is the port to which the proxy server will bind (on all interfaces). Defaults to `5005`.
* `CERT_FILE` — path to your TLS certificate, in PEM format. Defaults to `"config/public-cert.pem"`. See below for setting up.
* `KEY_FILE` — path to your TLS certificate, in PEM format. Defaults to `"config/private-key.pem"`.
* `KEY_PASS` — if your `KEY_FILE` is password protected, you will need to provide this. Defaults to unused.

### Authentication settings

The proxy requires a valid authentication token before it will open outgoing connections on a client's behalf. Two options for token validation are provided "out of the box":

* `AUTH_TESSEL_OA2` — Delegate to an instance of a [Tessel OAuth server](https://github.com/tessel/oauth). Setting this will disable `AUTH_HARDCODED` below. Provide a URL of the form `"https://client_id:client_secret@oauth_server.example.com"`. Defaults to unused.
* `AUTH_HARDCODED` — Shared password. Whatever value you provide will be used by all clients to login. Defaults to `'DEV-CRED'`.

If neither of these suits your needs, you can replace `./proxy-auth.js` with your own custom validator:

    module.exports = function oddUsersOnly(token, cb) {
        if (Math.random() > 0.99) cb(new Error("System glitch"));
        else if (+token % 2) cb(null, "user #"+token);     // provide a log-friendly truthy value if ok
        else cb(null, null);      // return `null` if token is invalid
    };

### Setting up a self-signed TLS certificate

You can purchase a suitable publicly-trusted certificate from your friendly local intermediate certificate authority, but it's easy to generate a self-signed one yourself.

Via <https://docs.nodejitsu.com/articles/cryptography/how-to-use-the-tls-module>:

    openssl genrsa -out config/private-key.pem 1024
    openssl req -new -key config/private-key.pem -out config/csr.pem
    openssl x509 -req -in config/csr.pem -signkey config/private-key.pem -out config/public-cert.pem   # self-sign
    rm config/csr.pem     # clean up intermediate file


You will need to configure your clients with "config/public-cert.pem" as their trusted certificate authority.

## License

MIT or Apache 2.0, at your option.