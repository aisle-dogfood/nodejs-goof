# FROM node:6-stretch
FROM node:18.13.0

RUN mkdir /usr/src/goof
RUN mkdir /tmp/extracted_files
COPY . /usr/src/goof
WORKDIR /usr/src/goof

RUN npm update
RUN npm install
RUN chown -R node:node /usr/src/goof /tmp/extracted_files
EXPOSE 3001
EXPOSE 9229
USER node
ENTRYPOINT ["npm", "start"]
