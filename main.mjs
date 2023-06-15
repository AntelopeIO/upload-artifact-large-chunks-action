import core from '@actions/core';
import axios from 'axios';
import fs from 'node:fs';
import https from 'node:https';

const name = core.getInput('name', {required: true});
const path = core.getInput('path', {required: true});

const httpsagent = new https.Agent({keepAlive: true});

try {
   axios.defaults.headers.common['Authorization'] = `Bearer ${process.env.ACTIONS_RUNTIME_TOKEN}`;
   axios.defaults.headers.common['Accept'] = 'application/json;api-version=6.0-preview';

   const artifactURL = `${process.env.ACTIONS_RUNTIME_URL}_apis/pipelines/workflows/${process.env.GITHUB_RUN_ID}/artifacts?api-version=6.0-preview`;

   const createArtifactParams = {
      Type: 'actions_storage',
      Name: name
   };

   const ret = await axios.post(artifactURL, createArtifactParams, {httpsAgent: httpsagent});
   if(!ret.data.fileContainerResourceUrl)
      throw new Error("Didn't get a artifact resource URL");
   const uploadURL = ret.data.fileContainerResourceUrl;

   const sz = fs.statSync(path).size;

   console.log("Starting upload of file");

   let offset = 0;
   while(offset != sz) {
      const send_this_time = Math.min(sz-offset, 96*1024*1024); //somewhere over 110MB will start returning 413
      const start = offset;
      const end = offset+send_this_time-1;
      console.log(`uploading ${start}-${end}/${sz}`);
      let retry_count = 0;
      while(true) {
         try {
            const ret = await axios.put(`${uploadURL}?itemPath=${name}/${path}`, fs.createReadStream(path, {start, end}), {
               httpsAgent: httpsagent,
               maxBodyLength: 1024*1024*1024,
               headers: {
                  "Content-Type": "application/octet-stream",
                  "Content-Length": send_this_time,
                  "Content-Range": `bytes ${start}-${end}/${sz}`
               }
            });
         }
         catch(error) {
            console.log(`error uploading: ${error.message}; retries so far: ${retry_count}`);
            if(retry_count++ > 5)
               throw error;
            console.log("retrying...");
            continue;
         }
         break;
      }
      offset += send_this_time;
   }

   console.log("Upload complete");

   await axios.patch(`${artifactURL}&artifactName=${name}`, {"Size": sz}, {httpsAgent: httpsagent});

} catch (error) {
   core.setFailed(error.message);
}