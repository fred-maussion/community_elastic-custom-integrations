FROM golang:1.22.10-alpine

RUN go install github.com/elastic/elastic-package@latest