#!/usr/bin/env bash

if [[ "${BRANCH}" == "master" ]]
then
   CLIENT_TAG="latest"
   NEXT=""
   DOCKER_TAG="latest"
else
   CLIENT_TAG="next"
   NEXT="1"
   DOCKER_TAG="next"
fi



baseImages=( x86_64 arm64 aarch64 amd64 armhf i386 )
for i in "${baseImages[@]}"
do
    docker build \
        --build-arg BASEIMAGE="multiarch/alpine:${i}-latest-stable" \
        --build-arg NODE_ENV="production" \
        --build-arg CLIENT_TAG="${CLIENT_TAG}" \
        --build-arg NEXT="${NEXT}" \
        -t "ubud/server:${VERSION}-${i}" .

    docker run --rm "ubud/server:${VERSION}-${i}" npm run check

    docker tag "ubud/server:${VERSION}-${i}" "docker.pkg.github.com/ubud-app/server/docker:${VERSION}-${i}"

    docker push "ubud/server:${VERSION}-${i}"
    docker push "ubud/server:${VERSION}-${i}"
    docker push "docker.pkg.github.com/ubud-app/server/docker:${VERSION}-${i}"
done



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
