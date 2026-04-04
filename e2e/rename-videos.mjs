import fs from 'node:fs';
import path from 'node:path';

const testResultsDir = path.resolve('test-results');

function dirToVideoName(dir) {
  const match = dir.match(/-[a-f0-9]{5}-(?:[a-z]+-)*([A-Z].+)/);
  if (match) return `${match[1].toLowerCase()}.webm`;
  return `${dir}.webm`;
}

if (!fs.existsSync(testResultsDir)) process.exit(0);

for (const entry of fs.readdirSync(testResultsDir)) {
  const dirPath = path.join(testResultsDir, entry);
  if (!fs.statSync(dirPath).isDirectory()) continue;

  const videoPath = path.join(dirPath, 'video.webm');
  if (!fs.existsSync(videoPath)) continue;

  const newName = dirToVideoName(entry);
  fs.renameSync(videoPath, path.join(testResultsDir, newName));
}

for (const entry of fs.readdirSync(testResultsDir)) {
  const dirPath = path.join(testResultsDir, entry);
  if (!fs.statSync(dirPath).isDirectory()) continue;
  if (fs.readdirSync(dirPath).length === 0) {
    fs.rmdirSync(dirPath);
  }
}
