#!/bin/bash

DOCKER_REGISTRY=dswhitely1
COMMIT=$(git rev-parse HEAD)
pushd treasurer
docker build -t ${DOCKER_REGISTRY}/treasurer-client:latest -t ${DOCKER_REGISTRY}/treasurer-client:${COMMIT} -f Dockerfile.prod .
docker push -a ${DOCKER_REGISTRY}/treasurer-client
popd

pushd treasurer-api
docker build -t ${DOCKER_REGISTRY}/treasurer-api:latest -t ${DOCKER_REGISTRY}/treasurer-api:${COMMIT} -f Dockerfile.prod .
docker push -a ${DOCKER_REGISTRY}/treasurer-api
popd

pushd treasurer-nginx
docker build -t ${DOCKER_REGISTRY}/treasurer-nginx:latest -t ${DOCKER_REGISTRY}/treasurer-nginx:${COMMIT} .
docker push -a ${DOCKER_REGISTRY}/treasurer-nginx
popd
