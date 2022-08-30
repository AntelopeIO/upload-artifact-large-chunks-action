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
   await axios.put(`${uploadURL}?itemPath=${name}/${path}`, fs.createReadStream(path), {
      httpsAgent: httpsagent,
      maxBodyLength: 1024*1024*1024*1024,
      headers: {
         "Content-Type": "application/octet-stream",
         "Content-Length": sz,
         "Content-Range": `bytes 0-${sz-1}/${sz}`
      }
   });
   console.log("Upload complete");

   await axios.patch(`${artifactURL}&artifactName=${name}`, {"Size": sz}, {httpsAgent: httpsagent});

} catch (error) {
   core.setFailed(error.message);
}