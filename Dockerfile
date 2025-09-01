# FROM node:6-stretch
FROM node:18.13.0

RUN mkdir /usr/src/goof
RUN mkdir /tmp/extracted_files
COPY . /usr/src/goof
WORKDIR /usr/src/goof

RUN npm update
RUN npm install
EXPOSE 3001
EXPOSE 9229

# Create a non-root user and group
RUN groupadd -r nodeapp && useradd -r -g nodeapp nodeapp

# Change ownership of application files to the non-root user
RUN chown -R nodeapp:nodeapp /usr/src/goof /tmp/extracted_files

# Switch to non-root user
USER nodeapp

ENTRYPOINT ["npm", "start"]
