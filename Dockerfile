FROM golang:1.22.4-alpine

RUN go install github.com/elastic/elastic-package@latest