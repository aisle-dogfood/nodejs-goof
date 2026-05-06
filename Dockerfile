FROM node:18.13.0

# Allow the container UID/GID to be overridden at build time so file ownership can
# match the host or orchestrator expectations for mounted volumes and runtime access.
ARG APP_UID=1000
ARG APP_GID=1000

# Create a dedicated application identity instead of running the service as root or
# relying on the base image defaults.
# Detect existing users/groups with the requested IDs so the build can safely reuse
# the base image's default `node` account IDs or fail fast on conflicting identities.
RUN set -eux; \
    existing_group="$(getent group "${APP_GID}" | cut -d: -f1 || true)"; \
    existing_user="$(getent passwd "${APP_UID}" | cut -d: -f1 || true)"; \
    if [ -n "${existing_group}" ] && [ "${existing_group}" != "node" ]; then \
        echo "Requested APP_GID ${APP_GID} already exists as group ${existing_group}"; \
        exit 1; \
    fi; \
    if [ -n "${existing_user}" ] && [ "${existing_user}" != "node" ]; then \
        echo "Requested APP_UID ${APP_UID} already exists as user ${existing_user}"; \
        exit 1; \
    fi; \
    if [ "${existing_user}" = "node" ]; then \
        userdel -r node || userdel node; \
    fi; \
    if [ "${existing_group}" = "node" ]; then \
        groupdel node; \
    fi; \
    groupadd --gid "${APP_GID}" goof; \
    useradd --uid "${APP_UID}" --gid "${APP_GID}" --create-home --shell /usr/sbin/nologin goof; \
    mkdir -p /usr/src/goof /tmp/extracted_files

COPY . /usr/src/goof
WORKDIR /usr/src/goof

# Install dependencies and fix ownership while still running as root so the app
# directory and temp paths remain writable after dropping privileges.
RUN npm update && npm install && chown -R "${APP_UID}:${APP_GID}" /usr/src/goof /tmp/extracted_files
EXPOSE 3001
EXPOSE 9229
# Run the application as the dedicated non-root user to reduce the impact of a
# compromise before the container starts the main process.
USER goof
ENTRYPOINT ["npm", "start"]
