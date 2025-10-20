FROM golang:1.25-alpine

RUN go install github.com/elastic/elastic-package@latest