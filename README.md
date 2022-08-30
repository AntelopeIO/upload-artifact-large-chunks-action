## Upload Artifact Unchunked
`actions/upload-artifact`, at the time of this writing, uploads a large file serially in 8MB chunks. There is no way to disable that behavior and it results in alarmingly slow uploads for large files. `upload-artifact-smoothly-action` simply uploads the file in one shot. I've seen this improve upload speeds for large files (100+MB) on the order of 5x, even for GitHub hosted runners which ought to have low latency to the storage platform.

This action is not as flexible as `actions/upload-artifact`: it only supports uploading a single file. It also doesn't have much (or really any) error recovery and retry logic. TBD how much of a problem that ends up being.

### Inputs
All required:
* **name** - Artifact name
* **path** - Path to file to upload

Example:
```yaml
    steps:
      - name: make a blob
        run: dd if=/dev/urandom of=blob.bin bs=1M count=110
      - name: now upload the blob
        uses: AntelopeIO/upload-artifact-smoothly-action@v1
        with:
          name: its-a-blob
          path: blob.bin
```

### Rebuilding `dist`
```
ncc build main.mjs --license licenses.txt
```
