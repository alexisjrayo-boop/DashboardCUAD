#!/bin/bash
set -e

echo "Stopping and removing existing containers..."
docker-compose down -v --rmi all --remove-orphans

echo "Building containers from scratch..."
docker-compose build --no-cache

echo "Starting services..."
docker-compose up -d

echo "Status:"
docker-compose ps
