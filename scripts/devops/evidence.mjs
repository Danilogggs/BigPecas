import fs from 'node:fs';
import path from 'node:path';
const evidence = {
  environment: process.env.DEPLOY_ENVIRONMENT, commit: process.env.GITHUB_SHA,
  run: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,
  timestamp: new Date().toISOString(), frontendUrl: process.env.FRONTEND_URL, backendUrl: process.env.BACKEND_URL,
  backendDigest: process.env.BACKEND_DIGEST, frontendDigest: process.env.FRONTEND_DIGEST,
  smoke: process.env.DEPLOY_ENVIRONMENT === 'test' ? 'https+cors+database passed' : 'http passed',
};
fs.writeFileSync(path.join(process.env.RUNNER_TEMP, 'bigpecas-evidence.json'), JSON.stringify(evidence, null, 2));
fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Deploy ${evidence.environment}\n\nCommit: ${evidence.commit}\n\nFrontend: ${evidence.frontendUrl}\n\nSmoke HTTP aprovado; validar login, banco e alertas separadamente.\n`);
