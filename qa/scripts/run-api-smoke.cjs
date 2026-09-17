#!/usr/bin/env node
// API-01/API-02: no credentials and no writes beyond deliberately invalid validation payload.
const base=(process.argv[2]||'').replace(/\/$/,''); if(!base) throw new Error('Usage: run-api-smoke.cjs BASE');
(async()=>{const get=await fetch(`${base}/api/health`);const catalog=await fetch(`${base}/api/catalog`);const admin=await fetch(`${base}/api/admin/catalog`);const invalid=await fetch(`${base}/api/configurations`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});console.log(JSON.stringify({health:get.status,catalog:catalog.status,models:(await catalog.json()).models?.length,adminWithoutToken:admin.status,invalidConfiguration:invalid.status},null,2));})().catch(e=>{console.error(e);process.exit(1)});
