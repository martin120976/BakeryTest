// netlifyFunction.js

const { google } = require('googleapis');
const { createReadStream } = require('fs');
const Busboy = require('busboy');
const path = require('path');

exports.handler = async function(event, context) {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'credentials.json',
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const busboy = new Busboy({ headers: event.headers });
    let fileUploadPromise = new Promise((resolve, reject) => {
      let fileName;
      busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
        fileName = filename;
        const filePath = path.join(__dirname, filename);
        const writeStream = createReadStream(filePath);
        const driveFileMetadata = {
          name: filename,
        };
        const driveMedia = {
          mimeType: mimetype,
          body: writeStream,
        };
        drive.files.create({
          requestBody: driveFileMetadata,
          media: driveMedia,
        }).then(response => {
          resolve({
            statusCode: 200,
            body: JSON.stringify({
              message: `File ${fileName} uploaded successfully.`,
              fileId: response.data.id,
            }),
          });
        }).catch(error => {
          reject({
            statusCode: 500,
            body: JSON.stringify({
              error: `Failed to upload file ${fileName} to Google Drive.`,
              errorMessage: error.message,
            }),
          });
        });
      });

      busboy.on('finish', function() {
        console.log('File upload finished.');
      });

      busboy.end(event.body);
    });

    return fileUploadPromise;
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};
