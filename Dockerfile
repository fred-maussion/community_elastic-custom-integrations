FROM golang:1.26-alpine

RUN go install github.com/elastic/elastic-package@latest
