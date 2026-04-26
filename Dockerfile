# FROM node:6-stretch
FROM node:18.13.0

RUN mkdir /usr/src/goof
RUN mkdir /tmp/extracted_files
COPY . /usr/src/goof
WORKDIR /usr/src/goof

RUN npm update
RUN npm install

# Create a non-root user to run the application
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Change ownership of application directories to the app user
RUN chown -R appuser:appuser /usr/src/goof
RUN chown -R appuser:appuser /tmp/extracted_files

# Switch to non-root user
USER appuser

EXPOSE 3001
EXPOSE 9229
ENTRYPOINT ["npm", "start"]
