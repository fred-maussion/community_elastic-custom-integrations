FROM golang:1.27-alpine

RUN go install github.com/elastic/elastic-package@latest
