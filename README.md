# tessel-proxy

yadda yadda

## Setting up TLS certificate

Via <https://docs.nodejitsu.com/articles/cryptography/how-to-use-the-tls-module>:

```
openssl genrsa -out private-key.pem 1024
openssl req -new -key private-key.pem -out csr.pem
openssl x509 -req -in csr.pem -signkey private-key.pem -out public-cert.pem   # self-sign
```

## Configuring authentication

**TBD** (intended to be gently pluggable, basically a function that takes the device token and calls back with error/authorization/rejection)

