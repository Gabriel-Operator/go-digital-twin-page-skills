#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { validateChatAppConfig, validateChatAppDependencies, stableChatAppJson } = require('./chat-app-model.cjs');
const file = process.argv[2] || 'assets/chat-app.json';
const mirror = process.argv[3];
try {
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  const issues = [];
  for (const key of Object.keys(doc)) if (!['schemaVersion', 'resourceKey', 'runtimeDataPolicy', 'chatApp', 'commitMessage'].includes(key)) issues.push(`root.${key}: unknown field`);
  if (![1, 2].includes(doc.schemaVersion)) issues.push('Unsupported schemaVersion');
  if (doc.runtimeDataPolicy !== 'definitions_only') issues.push('runtimeDataPolicy must be definitions_only');
  if (!/^chat_app\.[a-z0-9][a-z0-9._-]*$/i.test(doc.resourceKey || '')) issues.push('Invalid resourceKey');
  if ((doc.chatApp?.schemaVersion ?? 1) !== doc.schemaVersion) issues.push('Runtime and portable schemaVersion must match');
  issues.push(...validateChatAppConfig(doc.chatApp).map(i => `${i.path}: ${i.message}`));
  if (mirror) {
    const config = JSON.parse(fs.readFileSync(mirror, 'utf8'));
    if (stableChatAppJson(config.publishedConfig?.chatApp) !== stableChatAppJson(doc.chatApp)) issues.push('publishedConfig.chatApp differs from the canonical app');
    if (config.publishedConfig?.chatAppRef?.resourceKey !== doc.resourceKey) issues.push('chatAppRef differs from canonical resourceKey');
  }
  const root = path.resolve(path.dirname(file), '..');
  const registryPath = path.join(root, 'references/registry.json');
  if (doc.schemaVersion === 2 && fs.existsSync(registryPath)) {
    const registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));
    const sources={lists:[],pipelines:[]};
    for(const ref of registry.repos || []) {
      if(!['list','pipeline'].includes(ref.kind))continue;
      const filename=path.resolve(root,ref.path,ref.assetPath);
      if(!filename.startsWith(root+path.sep))throw new Error('Unsafe resource path');
      const definition=JSON.parse(fs.readFileSync(filename,'utf8'));
      if(definition.resourceKey!==ref.resourceKey)throw new Error('Resource key mismatch');
      sources[ref.kind==='list'?'lists':'pipelines'].push(definition);
    }
    const config=JSON.parse(fs.readFileSync(mirror || path.join(root,'assets/chat-config.json'),'utf8'));
    sources.profileId=config.publishedConfig?.roiMonitoring?.profileId;
    sources.metricIds=config.publishedConfig?.roiMonitoring?.metrics?.map(m=>m.id);
    issues.push(...validateChatAppDependencies(doc.chatApp,sources).map(i=>`${i.path}: ${i.message}`));
  }
  if (issues.length) throw new Error(issues.join('\n'));
  console.log(`Chat App valid: ${path.resolve(file)}`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
