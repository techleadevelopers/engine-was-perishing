FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod ./
RUN go mod download || true
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api \
 && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/ingestor ./cmd/ingestor

FROM gcr.io/distroless/static:nonroot
COPY --from=build /out/api /api
COPY --from=build /out/ingestor /ingestor
USER nonroot:nonroot
ENTRYPOINT ["/api"]
