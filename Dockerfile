# FROM node:6-stretch
FROM node:18.13.0

RUN mkdir /usr/src/goof
RUN mkdir /tmp/extracted_files
COPY . /usr/src/goof
WORKDIR /usr/src/goof

RUN npm update
RUN npm install
# Give the bundled app files and upload extraction directory to the `node` user
# so the process can read the app and write extracted uploads after privileges drop.
RUN chown -R node:node /usr/src/goof /tmp/extracted_files
EXPOSE 3001
EXPOSE 9229
# Run the application as the non-root `node` user to reduce the impact of a
# container compromise and avoid granting root privileges to the app process.
USER node
ENTRYPOINT ["npm", "start"]
