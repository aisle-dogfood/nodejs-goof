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

# Create a non-root user and set appropriate permissions
RUN useradd -m nodeuser
RUN chown -R nodeuser:nodeuser /usr/src/goof
RUN chown -R nodeuser:nodeuser /tmp/extracted_files

# Switch to non-root user
USER nodeuser
ENTRYPOINT ["npm", "start"]
