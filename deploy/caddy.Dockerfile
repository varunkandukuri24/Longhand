# syntax=docker/dockerfile:1

FROM caddy:builder AS builder
RUN xcaddy build --with github.com/caddy-dns/digitalocean

FROM caddy:alpine
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
