#!/usr/bin/env bash

if [[ "${BRANCH}" == "main" ]]
then
   DOCKER_TAG="latest"
else
   DOCKER_TAG="next"
fi


docker manifest create "ubud/server:${VERSION}" \
    "ubud/server:${VERSION}-x86_64" \
    "ubud/server:${VERSION}-arm64" \
    "ubud/server:${VERSION}-aarch64" \
    "ubud/server:${VERSION}-amd64" \
    "ubud/server:${VERSION}-armhf" \
    "ubud/server:${VERSION}-i386"

docker manifest create "ubud/server:${DOCKER_TAG}" \
    "ubud/server:${VERSION}-x86_64" \
    "ubud/server:${VERSION}-arm64" \
    "ubud/server:${VERSION}-aarch64" \
    "ubud/server:${VERSION}-amd64" \
    "ubud/server:${VERSION}-armhf" \
    "ubud/server:${VERSION}-i386"

docker manifest annotate --arch "amd64" --os "linux" "ubud/server:${DOCKER_TAG}" --variant "x86_64" "ubud/server:${VERSION}-x86_64"
docker manifest annotate --arch "arm64" --os "linux" "ubud/server:${DOCKER_TAG}" "ubud/server:${VERSION}-arm64"
docker manifest annotate --arch "arm64" --os "linux" "ubud/server:${DOCKER_TAG}" --variant "aarch64" "ubud/server:${VERSION}-aarch64"
docker manifest annotate --arch "amd64" --os "linux" "ubud/server:${DOCKER_TAG}" "ubud/server:${VERSION}-amd64"
docker manifest annotate --arch "arm" --os "linux" "ubud/server:${DOCKER_TAG}" "ubud/server:${VERSION}-armhf"
docker manifest annotate --arch "386" --os "linux" "ubud/server:${DOCKER_TAG}" "ubud/server:${VERSION}-i386"

docker manifest annotate --arch "amd64" --os "linux" "ubud/server:${VERSION}" --variant "x86_64" "ubud/server:${VERSION}-x86_64"
docker manifest annotate --arch "arm64" --os "linux" "ubud/server:${VERSION}" "ubud/server:${VERSION}-arm64"
docker manifest annotate --arch "arm64" --os "linux" "ubud/server:${VERSION}" --variant "aarch64" "ubud/server:${VERSION}-aarch64"
docker manifest annotate --arch "amd64" --os "linux" "ubud/server:${VERSION}" "ubud/server:${VERSION}-amd64"
docker manifest annotate --arch "arm" --os "linux" "ubud/server:${VERSION}" "ubud/server:${VERSION}-armhf"
docker manifest annotate --arch "386" --os "linux" "ubud/server:${VERSION}" "ubud/server:${VERSION}-i386"

docker manifest push -p "ubud/server:${VERSION}"
docker manifest push -p "ubud/server:${DOCKER_TAG}"
