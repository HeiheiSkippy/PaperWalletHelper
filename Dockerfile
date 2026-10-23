# Build environment for PaperWallet Helper release APKs.
# Native libraries record the build machine's paths, so release builds and
# verification builds both run here rather than on the host.

FROM eclipse-temurin:17-jdk-jammy@sha256:73ed442231ec66cfe48cae0b263ce619a75ab96d162ab325f38fc0a269ee3aab

ARG NODE_VERSION=24.19.0
ARG NODE_SHA256=14b342e71204f811bde6153be8e04b62aef63c236fef92b55f9c83154b409647
ARG CMDLINE_TOOLS_VERSION=11076708
ARG PLATFORM_VERSION=36
ARG BUILDTOOLS_VERSION=36.0.0
ARG NDK_VERSION=27.1.12297006

ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV ANDROID_HOME=/opt/android-sdk
ENV PATH=/opt/node/bin:/opt/android-sdk/cmdline-tools/latest/bin:${PATH}

RUN apt-get update && apt-get install -y --no-install-recommends \
        curl unzip git xz-utils python3 ca-certificates && \
    rm -rf /var/lib/apt/lists/*

RUN curl -fsSL -o /tmp/node.tar.xz \
        "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" && \
    echo "${NODE_SHA256}  /tmp/node.tar.xz" | sha256sum -c - && \
    mkdir -p /opt/node && tar -xJf /tmp/node.tar.xz -C /opt/node --strip-components=1 && \
    rm /tmp/node.tar.xz

RUN mkdir -p "${ANDROID_SDK_ROOT}/cmdline-tools" && \
    curl -fsSL -o /tmp/cmdline.zip \
        "https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_TOOLS_VERSION}_latest.zip" && \
    unzip -q /tmp/cmdline.zip -d "${ANDROID_SDK_ROOT}/cmdline-tools" && \
    mv "${ANDROID_SDK_ROOT}/cmdline-tools/cmdline-tools" "${ANDROID_SDK_ROOT}/cmdline-tools/latest" && \
    rm /tmp/cmdline.zip && \
    yes | sdkmanager --licenses >/dev/null && \
    sdkmanager \
        "platforms;android-${PLATFORM_VERSION}" \
        "build-tools;${BUILDTOOLS_VERSION}" \
        "ndk;${NDK_VERSION}"

WORKDIR /work
