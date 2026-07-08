# Linux Setup Guide (Ubuntu) --- Strategy Builder Moneylogix

> This guide is the Linux (Ubuntu Bash) version of the original README.

## Prerequisites

-   Java 17+
-   Maven
-   Python 3.10+
-   Docker & Docker Compose
-   Git

------------------------------------------------------------------------

## Start Infrastructure

``` bash
docker compose up -d postgres redis kafka
```

Check containers:

``` bash
docker ps
docker compose ps
```

If Docker runs out of space:

``` bash
docker system prune -f
docker volume prune -f
```

------------------------------------------------------------------------

## Start ML Service

``` bash
cd ml-service

pip install fastapi uvicorn numpy pydantic

# If Ubuntu blocks installation:
# pip install --break-system-packages fastapi uvicorn numpy pydantic

uvicorn main:app --reload --port 8000
```

Health check:

``` bash
curl http://localhost:8000/health
```

Expected:

``` json
{"status":"ok"}
```

------------------------------------------------------------------------

## Start Spring Boot Backend

``` bash
cd backend

mvn spring-boot:run
```

Force rebuild:

``` bash
mvn clean spring-boot:run
```

------------------------------------------------------------------------

## Risk Profile API

``` bash
curl -X POST http://localhost:8080/api/risk-profile \
  -H "Content-Type: application/json" \
  -d '{
    "answers": {
      "loss_tolerance": 2,
      "drawdown_reaction": 2,
      "investment_horizon": 3,
      "income_stability": 3,
      "prior_experience": 2,
      "goal": 2
    }
  }'
```

Get latest profile:

``` bash
curl http://localhost:8080/api/risk-profile/me
```

------------------------------------------------------------------------

## Strategy Recommendation

``` bash
curl -X POST http://localhost:8080/api/strategy/recommend
```

------------------------------------------------------------------------

## Payoff API

``` bash
curl -X POST http://localhost:8080/api/strategy/payoff \
  -H "Content-Type: application/json" \
  -d '{
    "legs": [
      {
        "option_type": "call",
        "position": "sell",
        "strike": 24900,
        "premium": 45,
        "quantity": 1
      },
      {
        "option_type": "call",
        "position": "buy",
        "strike": 25000,
        "premium": 20,
        "quantity": 1
      }
    ],
    "current_spot": 24800
  }'
```

------------------------------------------------------------------------

## Margin API

``` bash
curl -X POST http://localhost:8080/api/strategy/margin \
  -H "Content-Type: application/json" \
  -d '{
    "legs": [
      {
        "option_type": "call",
        "position": "sell",
        "strike": 24900,
        "premium": 45,
        "quantity": 1
      },
      {
        "option_type": "call",
        "position": "buy",
        "strike": 25000,
        "premium": 20,
        "quantity": 1
      }
    ],
    "current_spot": 24800
  }'
```

------------------------------------------------------------------------

## Useful Linux Commands

Check ports:

``` bash
sudo lsof -i :8080
sudo lsof -i :5432
sudo lsof -i :6379
sudo lsof -i :9092
```

Kill process:

``` bash
kill -9 <PID>
```

Find Java process:

``` bash
ps -ef | grep java
```

Docker logs:

``` bash
docker logs sb-postgres
docker logs sb-redis
docker logs sb-kafka
```

Docker compose:

``` bash
docker compose ps
docker compose down
docker compose up -d
```

Git:

``` bash
git remote -v
git branch
git add .
git commit -m "message"
git push
```

------------------------------------------------------------------------

## Common Issue

### Port 5432 already in use

Check:

``` bash
sudo lsof -i :5432
```

Stop local PostgreSQL:

``` bash
sudo systemctl stop postgresql
```

Start Docker PostgreSQL again:

``` bash
docker compose up -d postgres
```
